import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { billingService } from "@/services/billing.service";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await billingService.fulfillCreditPurchase(event.data.object.id);
  }

  return NextResponse.json({ received: true });
}
