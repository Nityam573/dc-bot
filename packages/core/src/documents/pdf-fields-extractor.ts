/**
 * Extracts structured fields (title, cause, resolution, tags, productArea)
 * from raw PDF text.
 *
 * Stage 1: Deterministic regex/heuristic parsing (fast, no API cost).
 * Stage 2: Gemini LLM fallback with strict JSON schema (only if stage 1 misses key fields).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PdfFields {
  title:       string;
  cause:       string;
  resolution:  string;
  tags:        string[];
  productArea: string;
}

// ── Stage 1: Heuristic parser ─────────────────────────────────────────────────

/**
 * Section-header patterns that commonly appear in support PDFs.
 * Each entry: [label used in output, regex matching the section header line].
 */
const SECTION_PATTERNS: Array<[keyof PdfFields, RegExp]> = [
  ['title',      /^(?:#{1,3}\s+|TITLE:\s*|Subject:\s*|Issue:\s*)(.+)$/im],
  ['cause',      /^(?:##\s+)?(?:Cause|Root Cause|Reason|Why)[:：]\s*(.+)$/im],
  ['resolution', /^(?:##\s+)?(?:Resolution|Solution|Fix|Workaround|Steps?)[:：]\s*(.+)$/im],
  ['productArea',/^(?:Product(?:\s+Area)?|Component|Module|Service)[:：]\s*(.+)$/im],
];

/**
 * Grabs the content that follows a section header until the next header or EOF.
 */
function extractSection(text: string, headerRegex: RegExp): string {
  const match = headerRegex.exec(text);
  if (!match) return '';

  const start = (match.index ?? 0) + match[0].length;
  // Stop at the next markdown heading or known section header
  const nextHeader = /\n(?:#{1,3}\s+|\b(?:Cause|Resolution|Solution|Fix|Product|Component|Title|Issue)\b)/i;
  const rest       = text.slice(start);
  const end        = nextHeader.exec(rest);

  return (end ? rest.slice(0, end.index) : rest).trim().slice(0, 2000);
}

/**
 * Extracts tags from text: looks for explicit "Tags:" lines, then falls back to
 * common tech keywords present in the text.
 */
function extractTags(text: string): string[] {
  // Explicit tags line
  const tagLine = /^(?:Tags?|Labels?|Keywords?)[:：]\s*(.+)$/im.exec(text);
  if (tagLine) {
    return tagLine[1].split(/[,;|]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  }
  // Heuristic: common tech product names found in the text
  const TECH_KEYWORDS =
    /\b(docker|kubernetes|redis|postgres|postgresql|mongodb|nginx|vault|iden3|privado|issuer|verifi|oauth|jwt|api|sdk|cli)\b/gi;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = TECH_KEYWORDS.exec(text)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return [...found].slice(0, 8);
}

function parseHeuristic(text: string): PdfFields {
  const fields: PdfFields = {
    title:       '',
    cause:       '',
    resolution:  '',
    tags:        [],
    productArea: '',
  };

  // Title: first non-empty line or first markdown H1/H2
  const firstHeading = /^#{1,2}\s+(.+)$/m.exec(text);
  fields.title = firstHeading
    ? firstHeading[1].trim()
    : text.split('\n').find((l) => l.trim().length > 5)?.trim() ?? '';

  for (const [field, pattern] of SECTION_PATTERNS) {
    if (field === 'title') continue; // already handled
    const value = field === 'tags'
      ? extractTags(text)
      : extractSection(text, pattern);
    if (Array.isArray(value)) {
      fields[field] = value as any;
    } else if (value) {
      (fields as any)[field] = value;
    }
  }

  if (!fields.tags.length) fields.tags = extractTags(text);
  return fields;
}

// ── Stage 2: LLM fallback ─────────────────────────────────────────────────────

const EXTRACTION_SCHEMA = `
{
  "title":       "string — short title of the support issue (max 120 chars)",
  "cause":       "string — root cause explanation (may be empty if unknown)",
  "resolution":  "string — step-by-step fix or workaround (may be empty)",
  "tags":        ["string — lowercase keyword tags, max 8"],
  "productArea": "string — product component name (e.g. 'issuer-node', 'vault', 'api')"
}`.trim();

async function parseWithLLM(text: string): Promise<PdfFields> {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_CHAT_MODEL,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 512 },
  });

  const prompt = `Extract structured fields from this support document text.
Return ONLY a JSON object matching this schema exactly:
${EXTRACTION_SCHEMA}

Document:
---
${text.slice(0, 4000)}
---`;

  const result = await model.generateContent(prompt);
  const raw    = result.response.text().trim();
  const parsed = JSON.parse(raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));

  return {
    title:       String(parsed.title       ?? '').slice(0, 120),
    cause:       String(parsed.cause       ?? ''),
    resolution:  String(parsed.resolution  ?? ''),
    tags:        Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    productArea: String(parsed.productArea ?? ''),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extracts structured support fields from raw PDF text.
 * Tries deterministic parsing first; falls back to Gemini only when
 * both title and resolution are empty.
 */
export async function extractPdfFields(rawText: string): Promise<PdfFields> {
  const heuristic = parseHeuristic(rawText);

  // If we got at least a title and either cause or resolution, trust the heuristic
  const hasEnough = heuristic.title && (heuristic.cause || heuristic.resolution);
  if (hasEnough) return heuristic;

  console.info('[pdf-fields] Heuristic extraction incomplete — calling Gemini fallback');
  try {
    return await parseWithLLM(rawText);
  } catch (err) {
    console.warn('[pdf-fields] LLM extraction failed:', (err as Error).message);
    return heuristic; // return what we have
  }
}
