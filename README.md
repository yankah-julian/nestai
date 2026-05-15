# NestAI

AI-powered interior design assistant — upload a room, describe your vision, get a living space you'll love.

## Overview

NestAI is a production-ready MVP that lets users upload a photo of any room and receive
hyper-personalised design recommendations, mood boards, and actionable product suggestions
powered by GPT-4 Vision + LangChain orchestration.

## Features

- **Vision Analysis** — GPT-4V analyses spatial layout, lighting, existing furniture, and colour palette
- **Style Memory** — Pinecone stores user preference vectors so recommendations improve over time
- **Structured Outputs** — All AI responses conform to strict JSON schemas
- **Stripe Billing** — Usage-based credits with Stripe Checkout and webhook handling
- **Auth** — Supabase Magic Link + OAuth (Google)
- **Storage** — Room photos stored privately in Supabase Storage, served via signed URLs

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| AI | OpenAI GPT-4 Vision + LangChain |
| Vector DB | Pinecone |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions + Docker |

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Testing

```bash
# Unit + integration
npm run test

# E2E
npm run test:e2e
```

## Architecture

```
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── design/
│   │   └── history/
│   └── api/
│       ├── analyze/
│       ├── recommend/
│       └── webhooks/stripe/
├── components/
├── lib/
├── services/
├── types/
└── tests/
    ├── unit/
    └── e2e/
```
