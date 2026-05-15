import { Pinecone } from "@pinecone-database/pinecone";

let client: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!client) {
    client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  }
  return client;
}

export function getStyleIndex() {
  return getPinecone().index(process.env.PINECONE_INDEX ?? "nestai-styles");
}
