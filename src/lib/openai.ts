import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const VISION_MODEL = "gpt-4o";
export const TEXT_MODEL = "gpt-4o-mini";
