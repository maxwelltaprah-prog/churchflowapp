import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all expired trials without active subscription
    const { data: expiredTrials, error } = await supabase
      .from("subscriptions")
      .select("id, church_id")
      .eq("status", "trialing")
      .lt("trial_end_at", new Date().toISOString())
      .is("paystack_subscription_code", null);

    if (error) {
      throw error;
    }

    let lockedCount = 0;

    // Lock each expired trial
    for (const trial of expiredTrials || []) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "expired_locked",
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", trial.id);

      if (!updateError) {
        lockedCount++;
        console.log(`Locked expired trial for church: ${trial.church_id}`);
      }
    }

    // Also update peak totals for active trials (daily backup)
    const { data: activeTrials } = await supabase
      .from("subscriptions")
      .select("id, church_id, trial_peak_total_members, trial_peak_total_branches")
      .eq("status", "trialing")
      .gt("trial_end_at", new Date().toISOString());

    let peaksUpdated = 0;

    for (const trial of activeTrials || []) {
      // Get current totals
      const { count: memberCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("church_id", trial.church_id);

      const { count: branchCount } = await supabase
        .from("branches")
        .select("*", { count: "exact", head: true })
        .eq("church_id", trial.church_id)
        .eq("is_active", true);

      const newPeakMembers = Math.max(
        trial.trial_peak_total_members,
        memberCount || 0
      );
      const newPeakBranches = Math.max(
        trial.trial_peak_total_branches,
        branchCount || 1
      );

      if (
        newPeakMembers !== trial.trial_peak_total_members ||
        newPeakBranches !== trial.trial_peak_total_branches
      ) {
        await supabase
          .from("subscriptions")
          .update({
            trial_peak_total_members: newPeakMembers,
            trial_peak_total_branches: newPeakBranches,
            updated_at: new Date().toISOString(),
          })
          .eq("id", trial.id);

        peaksUpdated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_locked: lockedCount,
        peaks_updated: peaksUpdated,
        checked_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Check expired trials error:", error);
    const message = error instanceof Error ? error.message : "Check failed";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
