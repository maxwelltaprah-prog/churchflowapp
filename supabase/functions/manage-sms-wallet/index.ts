import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authorizeRequest, authErrorResponse, getServiceClient, corsHeaders } from "../_shared/authorization.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Authorize request and derive churchId from authenticated user
    const authResult = await authorizeRequest(req, {
      requireRole: ["church_admin", "branch_admin"], // Only admins can manage SMS wallet
    });

    if (!authResult.success) {
      return authErrorResponse(authResult.error!, authResult.status!);
    }

    const authorizedUser = authResult.user!;
    const churchId = authorizedUser.churchId; // SECURE: Derived from auth, not request body

    const supabase = getServiceClient();
    const { action, credits, purchaseId } = await req.json();

    console.log("Wallet action:", action, "churchId:", churchId);

    if (action === "initialize") {
      // Check if wallet already exists
      const { data: existing } = await supabase
        .from("sms_wallets")
        .select("*")
        .eq("church_id", churchId) // SECURE: Uses derived churchId
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
          church_id: churchId, // SECURE: Uses derived churchId
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
      // SECURITY: Verify purchase belongs to this church before adding credits
      if (purchaseId) {
        const { data: purchase, error: purchaseError } = await supabase
          .from("sms_credit_purchases")
          .select("church_id")
          .eq("id", purchaseId)
          .single();

        if (purchaseError || !purchase || purchase.church_id !== churchId) {
          return authErrorResponse("Purchase not found or access denied", 403);
        }
      }

      const { data: wallet, error: walletError } = await supabase
        .from("sms_wallets")
        .select("*")
        .eq("church_id", churchId) // SECURE: Uses derived churchId
        .single();

      if (walletError) throw walletError;

      const { data, error } = await supabase
        .from("sms_wallets")
        .update({
          balance_credits: wallet.balance_credits + credits,
          updated_at: new Date().toISOString(),
        })
        .eq("church_id", churchId) // SECURE: Uses derived churchId
        .select()
        .single();

      if (error) throw error;

      // Update purchase status if provided
      if (purchaseId) {
        await supabase
          .from("sms_credit_purchases")
          .update({ status: "success" })
          .eq("id", purchaseId)
          .eq("church_id", churchId); // SECURE: Double-check ownership
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
        .eq("church_id", churchId) // SECURE: Uses derived churchId
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
    console.error("SMS Wallet Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
