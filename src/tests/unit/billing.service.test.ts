import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillingService } from "@/services/billing.service";

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { balance: 5 }, error: null }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

describe("BillingService", () => {
  let service;
  beforeEach(() => { service = new BillingService(); vi.clearAllMocks(); });

  it("getCredits returns the user credit balance", async () => {
    expect(await service.getCredits("user-abc")).toBe(5);
  });

  it("createCheckoutSession throws for unknown tier", async () => {
    await expect(
      service.createCheckoutSession({ userId: "u", email: "e@e.com", tier: "unknown",
        successUrl: "https://x.com", cancelUrl: "https://x.com" })
    ).rejects.toThrow("Unknown tier");
  });

  it("createCheckoutSession calls Stripe with correct price ID", async () => {
    const { stripe } = await import("@/lib/stripe");
    stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_test_123" });
    const session = await service.createCheckoutSession({
      userId: "u", email: "e@e.com", tier: "pro",
      successUrl: "https://x.com", cancelUrl: "https://x.com",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: "price_pro", quantity: 1 }] })
    );
    expect(session.id).toBe("cs_test_123");
  });
});
