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
    const smsApiKey = Deno.env.get("BULKSMSGH_API_KEY");

    if (!smsApiKey) {
      throw new Error("BulkSMSGH API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      churchId,
      userId,
      audienceType,
      audienceGroupIds,
      audienceMemberIds,
      audienceVisitorIds,
      visitorPhone,
      visitorName,
      messageBody,
      subject,
      senderName,
      recipientCount,
      useFirstName,
    } = await req.json();

    console.log("Starting SMS campaign:", { churchId, audienceType, recipientCount, senderName, visitorPhone });

    // Use the pre-registered sender ID 'MYCHURCH' as per BulkSMSGH registration
    const smsSenderId = "MYCHURCH";

    console.log("Using sender ID:", smsSenderId);

    // Get recipients based on audience type
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
    } else if (audienceType === "visitor" && visitorPhone) {
      // Handle single visitor SMS
      recipients = [{
        id: audienceVisitorIds?.[0] || "visitor",
        full_name: visitorName || "Visitor",
        phone: visitorPhone,
      }];
    } else if (audienceType === "visitors" && audienceVisitorIds?.length) {
      // Handle multiple visitors
      const { data, error } = await supabase
        .from("visitors")
        .select("id, first_name, last_name, phone")
        .in("id", audienceVisitorIds)
        .not("phone", "is", null);

      if (error) throw error;
      recipients = (data || []).map(v => ({
        id: v.id,
        full_name: `${v.first_name} ${v.last_name}`,
        phone: v.phone,
      }));
    }

    // Deduplicate by phone number
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.phone, r])).values()
    );

    console.log(`Found ${uniqueRecipients.length} unique recipients with phone numbers`);

    if (uniqueRecipients.length === 0) {
      throw new Error("No recipients with valid phone numbers found");
    }

    // Check complementary SMS quota for eligible tiers
    const { data: smsStatus, error: smsStatusError } = await supabase
      .rpc("get_complementary_sms_status", { p_church_id: churchId });

    if (smsStatusError) {
      console.error("Error checking SMS status:", smsStatusError);
    }

    const isEligibleForComplementary = smsStatus?.eligible === true;
    const remainingCredits = smsStatus?.remaining || 0;
    const totalRecipients = uniqueRecipients.length;

    console.log("Complementary SMS status:", { 
      isEligibleForComplementary, 
      remainingCredits, 
      totalRecipients,
      tier: smsStatus?.tier 
    });

    // Block SMS if no credits remaining for eligible tiers
    if (isEligibleForComplementary && remainingCredits < totalRecipients) {
      throw new Error(
        `Insufficient complementary SMS credits. You have ${remainingCredits} credits remaining but need ${totalRecipients}. Your credits will reset at the start of your next billing cycle.`
      );
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("sms_campaigns")
      .insert({
        church_id: churchId,
        created_by: userId,
        audience_type: audienceType,
        audience_group_ids: audienceGroupIds || [],
        audience_member_ids: audienceMemberIds || [],
        message_body: messageBody,
        use_first_name: useFirstName || false,
        recipient_count: uniqueRecipients.length,
        segments: 1,
        credits_deducted: 0,
        status: "sending",
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Create jobs for each recipient
    const isVisitorCampaign = audienceType === "visitor" || audienceType === "visitors";
    
    const jobs = uniqueRecipients.map((recipient) => {
      // Get first name for personalization
      const firstName = recipient.full_name.split(" ")[0] || "Friend";
      // If useFirstName is enabled, prepend the greeting
      const personalizedMessage = useFirstName 
        ? `Hi ${firstName}, ${messageBody}`
        : messageBody;

      return {
        church_id: churchId,
        campaign_id: campaign.id,
        member_id: isVisitorCampaign ? null : recipient.id, // null for visitors since they're not members
        member_name: recipient.full_name,
        phone_number: recipient.phone,
        personalized_message: personalizedMessage,
        status: "pending",
      };
    });

    const { error: jobsError } = await supabase.from("sms_jobs").insert(jobs);

    if (jobsError) throw jobsError;

    // Send messages via BulkSMSGH API
    const BATCH_SIZE = 50;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      
      const sendPromises = batch.map(async (job) => {
        try {
          // Format phone number - BulkSMSGH expects format like 233XXXXXXXXX or 0XXXXXXXXX
          let phone = job.phone_number.replace(/\s+/g, "");
          // Remove leading + if present
          phone = phone.replace(/^\+/, "");
          // If starts with 0, convert to 233 format
          if (phone.startsWith("0")) {
            phone = "233" + phone.substring(1);
          }
          // If doesn't start with 233, add it
          if (!phone.startsWith("233")) {
            phone = "233" + phone;
          }

          // Build BulkSMSGH API URL
          const smsUrl = new URL("https://clientlogin.bulksmsgh.com/smsapi");
          smsUrl.searchParams.append("key", smsApiKey);
          smsUrl.searchParams.append("to", phone);
          smsUrl.searchParams.append("msg", job.personalized_message);
          smsUrl.searchParams.append("sender_id", smsSenderId);

          console.log(`Sending SMS to ${phone} via BulkSMSGH`);

          const smsResponse = await fetch(smsUrl.toString(), {
            method: "GET",
          });

          const responseText = await smsResponse.text();
          console.log("BulkSMSGH Response:", responseText);

          // BulkSMSGH returns JSON response like:
          // {"success":true,"code":1000,"data":{...},"message":"message submitted succesfully"}
          // or {"success":false,"code":1006,"data":{...},"message":"invalid sender id..."}
          let isSuccess = false;
          let providerMessageId = "";
          let errorMessage = "SMS sending failed";

          try {
            const jsonResponse = JSON.parse(responseText);
            isSuccess = jsonResponse.success === true && jsonResponse.code >= 1000 && jsonResponse.code < 2000;
            providerMessageId = jsonResponse.data?.campaign_id || jsonResponse.code?.toString() || "";
            if (!isSuccess) {
              errorMessage = jsonResponse.message || "SMS sending failed";
            }
          } catch {
            // Fallback: some older responses may be plain text
            isSuccess = smsResponse.ok && /^\d+$/.test(responseText.trim()) && parseInt(responseText.trim()) >= 1000;
            providerMessageId = responseText.trim();
            if (!isSuccess) {
              errorMessage = responseText || "SMS sending failed";
            }
          }

          if (isSuccess) {
            await supabase
              .from("sms_jobs")
              .update({
                status: "sent",
                delivery_status: "sent",
                sent_at: new Date().toISOString(),
                provider_message_id: providerMessageId,
                last_error: null,
              })
              .eq("campaign_id", campaign.id)
              .eq("phone_number", job.phone_number);

            return { success: true };
          } else {
            throw new Error(errorMessage);
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

    // Update campaign with final counts
    await supabase
      .from("sms_campaigns")
      .update({
        status: "completed",
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    // Deduct complementary SMS for successful sends (only for eligible tiers)
    if (isEligibleForComplementary && sentCount > 0) {
      const { data: deductResult, error: deductError } = await supabase
        .rpc("deduct_complementary_sms", { 
          p_church_id: churchId, 
          p_count: sentCount 
        });

      if (deductError) {
        console.error("Error deducting complementary SMS:", deductError);
      } else {
        console.log("Complementary SMS deducted:", deductResult);
      }
    }

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
