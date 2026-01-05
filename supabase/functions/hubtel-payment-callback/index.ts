import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle both GET and POST as Hubtel may use either
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse callback data from Hubtel
    let callbackData: any;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      callbackData = {
        Status: url.searchParams.get("Status") || url.searchParams.get("status"),
        CheckoutId: url.searchParams.get("CheckoutId") || url.searchParams.get("checkoutId"),
        ClientReference: url.searchParams.get("ClientReference") || url.searchParams.get("clientReference"),
        TransactionId: url.searchParams.get("TransactionId") || url.searchParams.get("transactionId"),
      };
    } else {
      callbackData = await req.json();
    }

    console.log("Hubtel payment callback received:", JSON.stringify(callbackData));

    const clientReference = callbackData.ClientReference || callbackData.Data?.ClientReference;
    const status = callbackData.Status || callbackData.ResponseCode || callbackData.Data?.Status;
    const checkoutId = callbackData.CheckoutId || callbackData.Data?.CheckoutId;

    if (!clientReference) {
      console.error("No client reference in callback");
      return new Response(
        JSON.stringify({ error: "Missing client reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the purchase by reference
    const { data: purchase, error: purchaseError } = await supabase
      .from("sms_credit_purchases")
      .select("*")
      .eq("hubtel_reference", clientReference)
      .single();

    if (purchaseError || !purchase) {
      console.error("Purchase not found for reference:", clientReference);
      return new Response(
        JSON.stringify({ error: "Purchase not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already processed
    if (purchase.status === "success") {
      console.log("Purchase already processed:", purchase.id);
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if payment was successful
    // Hubtel uses "Success", "Paid", "Completed" or status code "0000" for successful payments
    const isSuccess = 
      status === "Success" || 
      status === "Paid" || 
      status === "Completed" ||
      status === "0000" ||
      status === 0;

    if (isSuccess) {
      console.log("Payment successful, adding credits:", purchase.credits_purchased);

      // Update purchase status
      await supabase
        .from("sms_credit_purchases")
        .update({
          status: "success",
          hubtel_checkout_id: checkoutId || purchase.hubtel_checkout_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);

      // Get current wallet
      const { data: wallet, error: walletError } = await supabase
        .from("sms_wallets")
        .select("*")
        .eq("church_id", purchase.church_id)
        .single();

      if (walletError) {
        // Create wallet if doesn't exist
        await supabase
          .from("sms_wallets")
          .insert({
            church_id: purchase.church_id,
            balance_credits: purchase.credits_purchased,
            low_balance_threshold: 50,
          });
      } else {
        // Update existing wallet
        await supabase
          .from("sms_wallets")
          .update({
            balance_credits: wallet.balance_credits + purchase.credits_purchased,
            updated_at: new Date().toISOString(),
          })
          .eq("church_id", purchase.church_id);
      }

      console.log("Credits added successfully");

      return new Response(
        JSON.stringify({ success: true, message: "Payment processed, credits added" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.log("Payment failed or cancelled:", status);

      // Update purchase as failed
      await supabase
        .from("sms_credit_purchases")
        .update({
          status: "failed",
          hubtel_checkout_id: checkoutId || purchase.hubtel_checkout_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);

      return new Response(
        JSON.stringify({ success: false, message: "Payment failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Callback Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
