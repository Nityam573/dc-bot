# Discord AI Support Bot

A Discord bot that answers user questions by searching your own support documents using Retrieval-Augmented Generation (RAG). It supports plain text queries and image attachments (screenshots, error dialogs), and uses confidence scoring to decide when to escalate to a human.

## Architecture

```
Discord Users
      │  @mention bot with question or screenshot
      ▼
 [Discord Bot]  ─── image attachments ───► OCR + Gemini Vision
      │
      ▼
 RAG Pipeline (packages/core)
  ├─ Embed query          (Gemini embedding model)
  ├─ Search vectors       (Pinecone)
  ├─ Rerank & cite chunks
  └─ Generate answer      (Gemini chat model)
      │
      ▼
 Discord Reply  (answer + citations, or escalation notice)


Document Ingestion
  CLI script / HTTP upload
      │
      ▼
 [API server]  ──► BullMQ queue  ──► [Worker]
                                          │
                                          ▼
                               Ingestion Pipeline
                            ├─ Load PDF / MD / HTML / TXT
                            ├─ OCR + Gemini vision (PDFs)
                            ├─ Chunk text
                            ├─ Embed chunks  (Gemini)
                            └─ Upsert vectors (Pinecone)
```

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | |
| pnpm | 9.x | `npm i -g pnpm@9` |
| Redis | 7+ | Required by the worker queue |
| Google Gemini API | — | [Get key](https://aistudio.google.com/app/apikey) |
| Pinecone | — | [Sign up](https://www.pinecone.io/) — free tier works |
| Discord App | — | See setup below |

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd discord-bot
pnpm install
```

## 2. Configure Environment

Copy the template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# ── Google Gemini ──────────────────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001

# ── Pinecone ───────────────────────────────────────────────────────────────────
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=support-docs           # your index name
PINECONE_NAMESPACE=v1                 # logical namespace inside the index

# ── Discord ────────────────────────────────────────────────────────────────────
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_APPLICATION_ID=your_discord_application_id_here
TICKET_CATEGORY_ID=123456789012345678   # Discord category ID for your ticket channels

# ── RAG Tuning (optional, these are good defaults) ────────────────────────────
CHUNK_SIZE=512
CHUNK_OVERLAP=64
TOP_K_RESULTS=5
MIN_CONFIDENCE_SCORE=0.5

# ── Redis (worker queue) ───────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=                     # only if your Redis requires auth

# ── Upload API (optional) ─────────────────────────────────────────────────────
PORT=3001
HOST=0.0.0.0
ADMIN_TOKEN=choose_a_secret_token     # protects the /api/upload endpoint
```

### Pinecone Setup

1. Create a free account at [pinecone.io](https://www.pinecone.io/)
2. Create a new **index** with:
   - **Dimensions:** `3072` (matches `gemini-embedding-001`)
   - **Metric:** `cosine`
3. Copy the index name into `PINECONE_INDEX`

### Discord Bot Setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and click **New Application**
2. Under **Bot** tab — click **Add Bot**, then copy the **Token** → `DISCORD_BOT_TOKEN`
3. Copy the **Application ID** from the General Information tab → `DISCORD_APPLICATION_ID`
4. Under **OAuth2 → URL Generator**, select scopes: `bot`, permissions: `Send Messages`, `Read Message History`, `View Channels`
5. Open the generated URL to invite the bot to your server
6. Right-click the **Support Tickets category** (the category that Ticket Tool creates channels under) → **Copy Category ID** → `TICKET_CATEGORY_ID`
   - (Enable Developer Mode in Discord Settings → Advanced if Copy ID is missing)
   - The bot will respond in **any channel** whose parent is this category — no need to configure individual channel IDs

## 3. Build the Shared Package

```bash
pnpm --filter @app/core build
```

This must be run once before starting any app for the first time, or after making changes to `packages/core`.

## 4. Start Redis

If you don't have Redis installed:

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu / Debian
sudo apt install redis-server && sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

## 5. Run the Bot

Open **three terminals**:

**Terminal 1 — Bot**
```bash
pnpm --filter @app/bot dev
```

**Terminal 2 — Worker** (processes ingestion jobs)
```bash
pnpm --filter @app/worker dev
```

**Terminal 3 — API** (optional, only needed for HTTP uploads)
```bash
pnpm --filter @app/api dev
```

Or run everything at once:
```bash
pnpm dev
```

## 6. Ingest Documents

The bot can only answer questions about documents it has indexed. Ingest your support docs using any of these methods:

### Option A — CLI script (easiest)

```bash
# Ingest a PDF (multimodal: extracts text, OCR, Gemini vision per page)
npx tsx scripts/ingestPdfMultimodal.ts ./path/to/support-doc.pdf --product issuer-node

# Force re-ingest (ignores deduplication)
npx tsx scripts/ingestPdfMultimodal.ts ./path/to/support-doc.pdf --force
```

### Option B — HTTP upload (API must be running)

```bash
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer your_admin_token" \
  -F "file=@./path/to/doc.pdf"
```

Supported formats: `.pdf`, `.md`, `.html`, `.txt`

### Verify ingestion

```bash
# Check that vectors exist and scores look right
npx tsx scripts/debugQuery.ts "your test question here"
```

## 7. Test the Bot

In Discord, go to one of your configured support channels and mention the bot:

```
@YourBot why is my app failing to connect to the database?
```

Or attach a screenshot of an error and ask:
```
@YourBot what does this error mean?  [attach screenshot]
```

## Project Structure

```
discord-bot/
├── apps/
│   ├── bot/          # Discord bot — listens for mentions, sends answers
│   ├── worker/       # BullMQ worker — processes ingestion jobs from queue
│   └── api/          # Fastify HTTP API — accepts file uploads
├── packages/
│   └── core/         # Shared RAG engine, Gemini, Pinecone, OCR, vision
├── scripts/          # CLI utilities (ingest, debug, test)
├── .env              # Your secrets (never commit this)
└── pnpm-workspace.yaml
```

## CLI Scripts

| Script | Description |
|--------|-------------|
| `npx tsx scripts/ingestPdfMultimodal.ts <file>` | Ingest a PDF with OCR + vision |
| `npx tsx scripts/debugQuery.ts "<question>"` | Test vector search, shows raw scores |
| `npx tsx scripts/testQuery.ts "<question>"` | Test full RAG pipeline end-to-end |
| `npx tsx scripts/clearNamespace.ts` | Delete all vectors from Pinecone namespace |

## Troubleshooting

**Bot doesn't respond**
- Make sure the message is inside a channel whose parent is `TICKET_CATEGORY_ID`
- Make sure you explicitly @mentioned the bot (not just sent a message in the channel)
- Check the bot terminal for error output — it logs the category it is watching on startup

**"0 chunks above score threshold"**
- No documents have been ingested yet — run the ingest script first
- Run `debugQuery.ts` to see raw scores and confirm vectors exist

**Worker not processing jobs**
- Make sure Redis is running: `redis-cli ping` should return `PONG`
- Check worker terminal for connection errors

**Pinecone dimension mismatch error**
- Delete and recreate the index with dimensions set to `3072`

**`canvas` / `pdfjs` errors on first run**
- The `canvas` package requires native compilation. On macOS: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
- On Ubuntu: `sudo apt install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
