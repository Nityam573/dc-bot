import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

// Ensure we load the repo-root `.env` even when apps run from subfolders
// (e.g. `pnpm --filter @app/api dev` runs with cwd = apps/api).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRootEnvPath = path.resolve(__dirname, "../../../../.env");
dotenv.config({ path: repoRootEnvPath });

const schema = z.object({
  // Gemini
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_CHAT_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_EMBEDDING_MODEL: z.string().default("models/gemini-embedding-001"),

  // Pinecone
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX: z.string().min(1),
  PINECONE_NAMESPACE: z.string().min(1),

  // RAG tuning
  CHUNK_SIZE: z.coerce.number().default(512),
  CHUNK_OVERLAP: z.coerce.number().default(64),
  TOP_K_RESULTS: z.coerce.number().default(5),
  MIN_CONFIDENCE_SCORE: z.coerce.number().default(0.7),

  // Discord
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_APPLICATION_ID: z.string().min(1),
  DISCORD_SUPPORT_CHANNEL_IDS: z
    .string()
    .transform((val) => val.split(",").map((s) => s.trim())),
});

export type Env = z.infer<typeof schema>;

export const env = schema.parse(process.env);