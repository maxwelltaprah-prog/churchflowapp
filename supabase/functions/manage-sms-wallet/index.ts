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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, churchId, credits, purchaseId } = await req.json();

    console.log("Wallet action:", action, "churchId:", churchId);

    if (action === "initialize") {
      // Check if wallet already exists
      const { data: existing } = await supabase
        .from("sms_wallets")
        .select("*")
        .eq("church_id", churchId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify(existing),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new wallet with 0 balance
      const { data, error } = await supabase
        .from("sms_wallets")
        .insert({
          church_id: churchId,
          balance_credits: 0,
          low_balance_threshold: 50,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "add_credits") {
      // Add credits to wallet (called after payment verification)
      const { data: wallet, error: walletError } = await supabase
        .from("sms_wallets")
        .select("*")
        .eq("church_id", churchId)
        .single();

      if (walletError) throw walletError;

      const { data, error } = await supabase
        .from("sms_wallets")
        .update({
          balance_credits: wallet.balance_credits + credits,
          updated_at: new Date().toISOString(),
        })
        .eq("church_id", churchId)
        .select()
        .single();

      if (error) throw error;

      // Update purchase status if provided
      if (purchaseId) {
        await supabase
          .from("sms_credit_purchases")
          .update({ status: "success" })
          .eq("id", purchaseId);
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_balance") {
      const { data, error } = await supabase
        .from("sms_wallets")
        .select("*")
        .eq("church_id", churchId)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Wallet Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
