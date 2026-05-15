import { z } from "zod";

/**
 * Room analysis schema — enforced on every GPT-4V response
 */
export const RoomAnalysisSchema = z.object({
  roomType: z.enum(["living_room", "bedroom", "kitchen", "bathroom", "office", "dining_room", "other"]),
  currentStyle: z.string(),
  dimensions: z.object({
    estimated: z.boolean(),
    sqft: z.number().optional(),
    ceilingHeight: z.enum(["low", "standard", "high"]).optional(),
  }),
  lighting: z.object({
    natural: z.enum(["none", "low", "moderate", "abundant"]),
    artificial: z.array(z.string()),
  }),
  existingElements: z.array(z.object({
    type: z.string(),
    condition: z.enum(["keep", "replace", "reposition"]),
    notes: z.string().optional(),
  })),
  colorPalette: z.object({
    dominant: z.array(z.string()),
    accent: z.array(z.string()),
  }),
  painPoints: z.array(z.string()),
});

export type RoomAnalysis = z.infer<typeof RoomAnalysisSchema>;

/**
 * Design recommendation schema
 */
export const DesignRecommendationSchema = z.object({
  style: z.string(),
  mood: z.string(),
  colorScheme: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    neutral: z.string(),
  }),
  furniture: z.array(z.object({
    item: z.string(),
    description: z.string(),
    priority: z.enum(["essential", "recommended", "optional"]),
    estimatedCost: z.object({ min: z.number(), max: z.number(), currency: z.string() }),
    searchQuery: z.string(),
  })),
  materials: z.array(z.string()),
  lighting: z.array(z.object({
    type: z.string(),
    placement: z.string(),
    effect: z.string(),
  })),
  plants: z.array(z.string()),
  keyPrinciples: z.array(z.string()),
  moodBoardDescription: z.string(),
});

export type DesignRecommendation = z.infer<typeof DesignRecommendationSchema>;

export interface DesignSession {
  id: string;
  userId: string;
  imageUrl: string;
  userPrompt: string;
  analysis: RoomAnalysis;
  recommendation: DesignRecommendation;
  creditsUsed: number;
  createdAt: string;
}
