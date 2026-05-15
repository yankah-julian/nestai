/**
 * Unit tests for DesignService
 * All external calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DesignService } from "@/services/design.service";

vi.mock("@/lib/openai", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  VISION_MODEL: "gpt-4o",
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({ call: vi.fn() })),
  OpenAIEmbeddings: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@langchain/pinecone", () => ({
  PineconeStore: {
    fromExistingIndex: vi.fn().mockResolvedValue({
      similaritySearch: vi.fn().mockResolvedValue([]),
      addDocuments: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/lib/pinecone", () => ({ getStyleIndex: vi.fn().mockReturnValue({}) }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "session-123", user_id: "user-abc",
              image_url: "https://example.com/room.jpg",
              user_prompt: "Modern minimalist",
              analysis: {}, recommendation: {},
              credits_used: 1, created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

const mockAnalysis = {
  roomType: "living_room",
  currentStyle: "Eclectic",
  dimensions: { estimated: true },
  lighting: { natural: "moderate", artificial: ["ceiling lamp"] },
  existingElements: [{ type: "sofa", condition: "keep" }],
  colorPalette: { dominant: ["#FFFFFF"], accent: ["#3B82F6"] },
  painPoints: ["Cluttered layout", "Poor lighting"],
};

describe("DesignService", () => {
  let service;

  beforeEach(() => {
    service = new DesignService();
    vi.clearAllMocks();
  });

  it("parses a valid GPT-4V response into a RoomAnalysis", async () => {
    const { openai } = await import("@/lib/openai");
    openai.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    });
    const result = await service.analyseRoom("https://example.com/room.jpg");
    expect(result.roomType).toBe("living_room");
    expect(result.painPoints).toHaveLength(2);
  });

  it("throws when GPT-4V returns invalid JSON schema", async () => {
    const { openai } = await import("@/lib/openai");
    openai.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ invalid: true }) } }],
    });
    await expect(service.analyseRoom("https://example.com/room.jpg")).rejects.toThrow();
  });

  it("saveSession returns persisted record", async () => {
    const session = await service.saveSession({
      userId: "user-abc",
      imageUrl: "https://example.com/room.jpg",
      userPrompt: "Modern minimalist",
      analysis: mockAnalysis,
      recommendation: { style: "Minimal", mood: "Calm", colorScheme: {}, furniture: [], materials: [], lighting: [], plants: [], keyPrinciples: [], moodBoardDescription: "" },
    });
    expect(session.id).toBe("session-123");
    expect(session.creditsUsed).toBe(1);
  });
});
