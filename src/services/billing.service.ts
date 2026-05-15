import { stripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { CREDIT_PLANS, type CreditTier } from "@/types/billing";

export class BillingService {
  async createCheckoutSession(params: {
    userId: string; email: string; tier: CreditTier;
    successUrl: string; cancelUrl: string;
  }) {
    const plan = CREDIT_PLANS.find((p) => p.tier === params.tier);
    if (!plan) throw new Error("Unknown tier: " + params.tier);

    return stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: params.email,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: { userId: params.userId, tier: params.tier, credits: String(plan.credits) },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
  }

  async fulfillCreditPurchase(sessionId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const { userId, credits } = session.metadata ?? {};
    if (!userId || !credits) throw new Error("Missing metadata on Stripe session");
    const supabase = createSupabaseServiceClient();
    await supabase.rpc("add_credits", { p_user_id: userId, p_amount: parseInt(credits, 10) });
  }

  async getCredits(userId: string): Promise<number> {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("user_credits").select("balance").eq("user_id", userId).single();
    if (error) return 0;
    return data.balance;
  }
}

export const billingService = new BillingService();
