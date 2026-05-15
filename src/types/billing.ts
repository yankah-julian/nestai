export type CreditTier = "starter" | "pro" | "studio";

export interface CreditPlan {
  tier: CreditTier;
  name: string;
  credits: number;
  price: number; // USD cents
  stripePriceId: string;
}

export const CREDIT_PLANS: CreditPlan[] = [
  { tier: "starter", name: "Starter", credits: 10,  price: 999,  stripePriceId: "price_starter" },
  { tier: "pro",     name: "Pro",     credits: 50,  price: 3999, stripePriceId: "price_pro"     },
  { tier: "studio",  name: "Studio",  credits: 200, price: 9999, stripePriceId: "price_studio"  },
];

export const CREDITS_PER_ANALYSIS = 1;
