import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { designService } from "@/services/design.service";
import { storageService } from "@/services/storage.service";
import { billingService } from "@/services/billing.service";
import { CREDITS_PER_ANALYSIS } from "@/types/billing";
import { z } from "zod";

const RequestSchema = z.object({
  prompt: z.string().min(10).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const credits = await billingService.getCredits(user.id);
    if (credits < CREDITS_PER_ANALYSIS) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const { prompt } = RequestSchema.parse({ prompt: formData.get("prompt") });

    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { signedUrl } = await storageService.uploadRoomImage(buffer, user.id, file.type);

    const analysis = await designService.analyseRoom(signedUrl);
    const recommendation = await designService.generateRecommendation(analysis, prompt, user.id);
    const session = await designService.saveSession({
      userId: user.id, imageUrl: signedUrl, userPrompt: prompt, analysis, recommendation,
    });

    return NextResponse.json({ session }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 422 });
    }
    console.error("[/api/analyze]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
