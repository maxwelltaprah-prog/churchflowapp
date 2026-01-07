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

    const { churchId, campaignId } = await req.json();

    console.log("Resending failed SMS for campaign:", campaignId);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("sms_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("church_id", churchId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Get failed jobs for this campaign
    const { data: failedJobs, error: jobsError } = await supabase
      .from("sms_jobs")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("status", "failed");

    if (jobsError) throw jobsError;

    if (!failedJobs || failedJobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sentCount: 0, failedCount: 0, message: "No failed messages to resend" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${failedJobs.length} failed messages to resend`);

    // Get church settings for sender ID
    const { data: church } = await supabase
      .from("churches")
      .select("name, settings")
      .eq("id", churchId)
      .single();

    // Determine sender ID
    let smsSenderId: string;
    const settings = church?.settings as { sms_sender_id?: string } | null;
    
    if (settings?.sms_sender_id) {
      smsSenderId = settings.sms_sender_id;
    } else if (church?.name) {
      smsSenderId = church.name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "")
        .substring(0, 11) || "Church";
    } else {
      smsSenderId = "Church";
    }

    console.log("Using sender ID:", smsSenderId);

    // Resend messages
    let sentCount = 0;
    let failedCount = 0;

    for (const job of failedJobs) {
      try {
        // Format phone number
        let phone = job.phone_number.replace(/\s+/g, "");
        phone = phone.replace(/^\+/, "");
        if (phone.startsWith("0")) {
          phone = "233" + phone.substring(1);
        }
        if (!phone.startsWith("233")) {
          phone = "233" + phone;
        }

        // Build BulkSMSGH API URL
        const smsUrl = new URL("https://clientlogin.bulksmsgh.com/smsapi");
        smsUrl.searchParams.append("key", smsApiKey);
        smsUrl.searchParams.append("to", phone);
        smsUrl.searchParams.append("msg", job.personalized_message || campaign.message_body);
        smsUrl.searchParams.append("sender_id", smsSenderId);

        console.log(`Resending SMS to ${phone}`);

        const smsResponse = await fetch(smsUrl.toString(), { method: "GET" });
        const responseText = await smsResponse.text();
        console.log("BulkSMSGH Response:", responseText);

        // Parse response
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
            .eq("id", job.id);

          sentCount++;
        } else {
          await supabase
            .from("sms_jobs")
            .update({ last_error: errorMessage })
            .eq("id", job.id);

          failedCount++;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to resend to ${job.phone_number}:`, errorMessage);
        
        await supabase
          .from("sms_jobs")
          .update({ last_error: errorMessage })
          .eq("id", job.id);

        failedCount++;
      }
    }

    // Update campaign counts
    const { data: currentCampaign } = await supabase
      .from("sms_campaigns")
      .select("sent_count, failed_count")
      .eq("id", campaignId)
      .single();

    await supabase
      .from("sms_campaigns")
      .update({
        sent_count: (currentCampaign?.sent_count || 0) + sentCount,
        failed_count: failedCount,
      })
      .eq("id", campaignId);

    console.log(`Resend completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sentCount, failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Resend SMS Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
