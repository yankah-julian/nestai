/**
 * Design Service
 *
 * Orchestrates the full AI design pipeline:
 * 1. Analyse room via GPT-4 Vision
 * 2. Generate style recommendations via LangChain + Pinecone style memory
 * 3. Persist session to Supabase
 * 4. Store preference vector in Pinecone for future personalisation
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "langchain/schema";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { openai, VISION_MODEL } from "@/lib/openai";
import { getStyleIndex } from "@/lib/pinecone";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  RoomAnalysisSchema,
  DesignRecommendationSchema,
  type RoomAnalysis,
  type DesignRecommendation,
  type DesignSession,
} from "@/types/design";
import { CREDITS_PER_ANALYSIS } from "@/types/billing";

const SYSTEM_ANALYSIS = "You are an expert interior designer. Analyse the room image and return detailed JSON.";
const SYSTEM_RECOMMEND = "You are a world-class interior designer. Generate comprehensive design recommendations as JSON.";

export class DesignService {
  /** Analyse a room photo using GPT-4 Vision */
  async analyseRoom(imageUrl: string): Promise<RoomAnalysis> {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_ANALYSIS },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            { type: "text", text: "Analyse this room. Return JSON matching the RoomAnalysis schema." },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const raw = JSON.parse(response.choices[0].message.content ?? "{}");
    return RoomAnalysisSchema.parse(raw);
  }

  /** Generate design recommendations using LangChain + retrieved style memory */
  async generateRecommendation(
    analysis: RoomAnalysis,
    userPrompt: string,
    userId: string
  ): Promise<DesignRecommendation> {
    const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: getStyleIndex(),
      namespace: userId,
    });

    const similar = await vectorStore.similaritySearch(userPrompt, 3).catch(() => []);
    const styleContext = similar.map((d) => d.pageContent).join("\n");

    const llm = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      responseFormat: { type: "json_object" },
    });

    const prompt = [
      "Room Analysis:",
      JSON.stringify(analysis, null, 2),
      "",
      "User Style Request: " + userPrompt,
      styleContext ? "\nPast Preferences:\n" + styleContext : "",
      "\nReturn a JSON DesignRecommendation.",
    ].join("\n");

    const result = await llm.call([
      new SystemMessage(SYSTEM_RECOMMEND),
      new HumanMessage(prompt),
    ]);

    const recommendation = DesignRecommendationSchema.parse(JSON.parse(result.content as string));

    // Store preference vector (non-critical)
    vectorStore.addDocuments([{
      pageContent: "Style: " + recommendation.style + ". " + userPrompt,
      metadata: { userId, style: recommendation.style },
    }]).catch(() => {});

    return recommendation;
  }

  /** Persist a completed design session and deduct credits */
  async saveSession(params: {
    userId: string;
    imageUrl: string;
    userPrompt: string;
    analysis: RoomAnalysis;
    recommendation: DesignRecommendation;
  }): Promise<DesignSession> {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("design_sessions")
      .insert({
        user_id: params.userId,
        image_url: params.imageUrl,
        user_prompt: params.userPrompt,
        analysis: params.analysis,
        recommendation: params.recommendation,
        credits_used: CREDITS_PER_ANALYSIS,
      })
      .select()
      .single();

    if (error) throw new Error("Failed to save session: " + error.message);

    await supabase.rpc("deduct_credits", { p_user_id: params.userId, p_amount: CREDITS_PER_ANALYSIS });

    return {
      id: data.id,
      userId: data.user_id,
      imageUrl: data.image_url,
      userPrompt: data.user_prompt,
      analysis: data.analysis,
      recommendation: data.recommendation,
      creditsUsed: data.credits_used,
      createdAt: data.created_at,
    };
  }
}

export const designService = new DesignService();
