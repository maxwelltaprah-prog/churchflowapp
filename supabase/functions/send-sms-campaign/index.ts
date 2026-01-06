import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const smsApiKey = Deno.env.get("SMSONLINEGH_API_KEY");
    const smsSenderId = Deno.env.get("SMSONLINEGH_SENDER_ID");

    if (!smsApiKey) {
      throw new Error("SMSOnlineGH API key not configured");
    }

    if (!smsSenderId) {
      throw new Error("SMSOnlineGH Sender ID not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      churchId,
      userId,
      audienceType,
      audienceGroupIds,
      audienceMemberIds,
      messageBody,
      useFirstName,
      recipientCount,
      segments,
      creditsNeeded,
    } = await req.json();

    console.log("Starting SMS campaign:", { churchId, audienceType, recipientCount, creditsNeeded });

    // 1. Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("sms_wallets")
      .select("*")
      .eq("church_id", churchId)
      .single();

    if (walletError || !wallet) {
      throw new Error("SMS wallet not found. Please initialize your wallet first.");
    }

    if (wallet.balance_credits < creditsNeeded) {
      throw new Error(`Insufficient credits. You have ${wallet.balance_credits} but need ${creditsNeeded}.`);
    }

    // 2. Get recipients based on audience type
    let recipients: { id: string; full_name: string; phone: string }[] = [];

    if (audienceType === "all_members") {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone")
        .eq("church_id", churchId)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .not("phone", "is", null);

      if (error) throw error;
      recipients = data || [];
    } else if (audienceType === "group" && audienceGroupIds?.length) {
      const { data: memberGroups, error } = await supabase
        .from("member_groups")
        .select("member_id")
        .in("group_id", audienceGroupIds);

      if (error) throw error;

      const memberIds = [...new Set((memberGroups || []).map((mg) => mg.member_id))];

      if (memberIds.length > 0) {
        const { data, error: membersError } = await supabase
          .from("members")
          .select("id, full_name, phone")
          .in("id", memberIds)
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .not("phone", "is", null);

        if (membersError) throw membersError;
        recipients = data || [];
      }
    } else if (audienceType === "individual" && audienceMemberIds?.length) {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone")
        .in("id", audienceMemberIds)
        .not("phone", "is", null);

      if (error) throw error;
      recipients = data || [];
    }

    // Deduplicate by phone number
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.phone, r])).values()
    );

    console.log(`Found ${uniqueRecipients.length} unique recipients with phone numbers`);

    if (uniqueRecipients.length === 0) {
      throw new Error("No recipients with valid phone numbers found");
    }

    // Recalculate actual credits needed
    const actualCreditsNeeded = segments * uniqueRecipients.length;

    // 3. Deduct credits upfront
    const { error: deductError } = await supabase
      .from("sms_wallets")
      .update({
        balance_credits: wallet.balance_credits - actualCreditsNeeded,
        updated_at: new Date().toISOString(),
      })
      .eq("church_id", churchId);

    if (deductError) throw deductError;

    // 4. Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("sms_campaigns")
      .insert({
        church_id: churchId,
        created_by: userId,
        audience_type: audienceType,
        audience_group_ids: audienceGroupIds || [],
        audience_member_ids: audienceMemberIds || [],
        message_body: messageBody,
        use_first_name: useFirstName,
        recipient_count: uniqueRecipients.length,
        segments: segments,
        credits_deducted: actualCreditsNeeded,
        status: "sending",
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // 5. Create jobs for each recipient
    const jobs = uniqueRecipients.map((recipient) => {
      let personalizedMessage = messageBody;
      if (useFirstName && recipient.full_name) {
        const firstName = recipient.full_name.split(" ")[0];
        personalizedMessage = messageBody.replace(/\{first_name\}/gi, firstName);
      }

      return {
        church_id: churchId,
        campaign_id: campaign.id,
        member_id: recipient.id,
        member_name: recipient.full_name,
        phone_number: recipient.phone,
        personalized_message: personalizedMessage,
        status: "pending",
      };
    });

    const { error: jobsError } = await supabase.from("sms_jobs").insert(jobs);

    if (jobsError) throw jobsError;

    // 6. Send messages in batches via SMSOnlineGH API
    const BATCH_SIZE = 50;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      
      const sendPromises = batch.map(async (job) => {
        try {
          // Format phone number - SMSOnlineGH expects format like 233XXXXXXXXX
          let phone = job.phone_number.replace(/\s+/g, "").replace(/^0/, "233");
          if (!phone.startsWith("233") && !phone.startsWith("+")) {
            phone = "233" + phone;
          }
          phone = phone.replace(/^\+/, "");

          // Build SMSOnlineGH API URL
          const smsUrl = new URL("https://api.smsonlinegh.com/v4/message/sms/send");
          smsUrl.searchParams.append("key", smsApiKey);
          smsUrl.searchParams.append("text", job.personalized_message);
          smsUrl.searchParams.append("type", "0"); // Plain text
          smsUrl.searchParams.append("sender", smsSenderId);
          smsUrl.searchParams.append("to", phone);

          console.log(`Sending SMS to ${phone}`);

          // Send via SMSOnlineGH API
          const smsResponse = await fetch(smsUrl.toString(), {
            method: "GET",
          });

          const smsResult = await smsResponse.json();
          console.log("SMSOnlineGH Response:", JSON.stringify(smsResult));

          // Check for successful response
          // SMSOnlineGH returns { "handshake": { "label": "HSHK_OK" }, "data": [...] }
          if (smsResponse.ok && smsResult.handshake?.label === "HSHK_OK") {
            const messageData = smsResult.data?.[0];
            
            // Update job as sent
            await supabase
              .from("sms_jobs")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                provider_message_id: messageData?.id || null,
              })
              .eq("campaign_id", campaign.id)
              .eq("phone_number", job.phone_number);

            return { success: true };
          } else {
            const errorMsg = smsResult.handshake?.label || smsResult.message || "SMS sending failed";
            throw new Error(errorMsg);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed to send to ${job.phone_number}:`, errorMessage);
          
          await supabase
            .from("sms_jobs")
            .update({
              status: "failed",
              last_error: errorMessage,
            })
            .eq("campaign_id", campaign.id)
            .eq("phone_number", job.phone_number);

          return { success: false };
        }
      });

      const results = await Promise.all(sendPromises);
      sentCount += results.filter((r) => r.success).length;
      failedCount += results.filter((r) => !r.success).length;
    }

    // 7. Update campaign with final counts
    await supabase
      .from("sms_campaigns")
      .update({
        status: "completed",
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    console.log(`Campaign completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        campaignId: campaign.id,
        sentCount,
        failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("SMS Campaign Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
