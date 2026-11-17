import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type, type Schema } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const distIndexPath = path.resolve(__dirname, 'dist', 'index.html');
const isProduction =
  process.env.NODE_ENV === 'production' ||
  (process.env.NODE_ENV !== 'development' && fs.existsSync(distIndexPath));

const MODEL_TIMEOUT_MS = 12_000;
const MAX_CACHE_ENTRIES = 200;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in the server environment.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function safeJsonParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt to extract first JSON object if surrounding prose appeared
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function setBoundedCache<K, V>(cache: Map<K, V>, key: K, value: V): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, value);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

interface ResilientStructuredRequest {
  prompt: string;
  systemInstruction: string;
  responseSchema: Schema;
  seed?: number;
}

/**
 * Queries the low-congestion free-tier Flash Lite model first with MINIMAL thinking
 * for fast, non-blocking responses, and automatically cascades to Gemma / Hydrogen
 * if traffic or transient errors occur. Zero user configuration required.
 */
async function generateStructuredWildlifeJson<T>(
  ai: GoogleGenAI,
  reqConfig: ResilientStructuredRequest
): Promise<T> {
  const attempts: Array<{
    name: string;
    run: () => Promise<string | undefined>;
  }> = [
    {
      name: 'gemini-3.1-flash-lite',
      run: async () => {
        const res = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: reqConfig.prompt,
            config: {
              seed: reqConfig.seed,
              systemInstruction: reqConfig.systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: reqConfig.responseSchema,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          }),
          MODEL_TIMEOUT_MS,
          'gemini-3.1-flash-lite'
        );
        return res.text;
      },
    },
    {
      name: 'gemma-3-27b-it',
      run: async () => {
        // Gemma does not accept systemInstruction or responseSchema parameters;
        // embed schema instructions cleanly inside the prompt.
        const gemmaPrompt = `${reqConfig.systemInstruction}\n\nRespond strictly with valid JSON matching the requested fields and no markdown prose.\n\n${reqConfig.prompt}`;
        const res = await withTimeout(
          ai.models.generateContent({
            model: 'gemma-3-27b-it',
            contents: gemmaPrompt,
          }),
          MODEL_TIMEOUT_MS,
          'gemma-3-27b-it'
        );
        return res.text;
      },
    },
    {
      name: 'gemini-4-hydrogen',
      run: async () => {
        const res = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: reqConfig.prompt,
            config: {
              seed: reqConfig.seed,
              systemInstruction: reqConfig.systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: reqConfig.responseSchema,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          MODEL_TIMEOUT_MS,
          'gemini-4-hydrogen'
        );
        return res.text;
      },
    },
  ];

  let lastError: unknown = new Error('No AI model succeeded.');

  for (const attempt of attempts) {
    try {
      const text = await attempt.run();
      const parsed = safeJsonParse<T | null>(text, null);
      if (parsed !== null) {
        return parsed;
      }
      lastError = new Error(`Model ${attempt.name} returned unparseable JSON.`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('AI service failed across all fallback models.');
}

interface SpotlightSpecies {
  commonName: string;
  scientificName: string;
  biome: string;
  region: string;
  conservationStatus: string;
  hook: string;
  searchQuery: string;
}

interface SpotlightPayload {
  editionLabel: string;
  cadenceLabel: string;
  themeTitle: string;
  themeSummary: string;
  nextRefreshDate: string;
  species: SpotlightSpecies[];
}

function getDiscoveryWindow(now = new Date()) {
  const msPerDay = 86_400_000;
  const epochDays = Math.floor(now.getTime() / msPerDay);
  const fortnightIndex = Math.floor(epochDays / 14);
  const dayInFortnight = (epochDays % 14) + 1;
  const nextFortnightDay = (fortnightIndex + 1) * 14;
  const nextRefresh = new Date(nextFortnightDay * msPerDay);
  const dateKey = now.toISOString().slice(0, 10);

  return {
    epochDays,
    fortnightIndex,
    dayInFortnight,
    dateKey,
    nextRefreshDate: nextRefresh.toISOString().slice(0, 10),
  };
}

const spotlightCache = new Map<string, SpotlightPayload>();
const briefCache = new Map<string, Record<string, unknown>>();

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'wildsearch', author: '@MrRaphOfficial' });
  });

  // 1. Daily + Fortnightly + Unlimited Scroll Wildlife Discovery Endpoint
  app.get('/api/wildlife/spotlight', async (req: Request, res: Response) => {
    const forceFresh = req.query.refresh === '1';
    const rawExclude = Array.isArray(req.query.exclude)
      ? req.query.exclude.join(',')
      : typeof req.query.exclude === 'string'
        ? req.query.exclude
        : '';

    const excludedNames = rawExclude
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 80);

    const windowInfo = getDiscoveryWindow();
    const cacheKey = `${windowInfo.dateKey}:${windowInfo.fortnightIndex}`;

    if (
      !forceFresh &&
      excludedNames.length === 0 &&
      spotlightCache.has(cacheKey)
    ) {
      res.json(spotlightCache.get(cacheKey));
      return;
    }

    try {
      const ai = getGeminiClient();
      const seed =
        forceFresh || excludedNames.length > 0
          ? Math.floor((Date.now() + excludedNames.length * 997) % 1000000)
          : windowInfo.epochDays;

      const excludeInstruction =
        excludedNames.length > 0
          ? ` Do NOT include any of these already-displayed species: ${excludedNames.join(', ')}.`
          : '';

      const prompt =
        forceFresh || excludedNames.length > 0
          ? `Curate a fresh batch of 6 remarkable, real wild animal species across diverse global habitats (forest, savanna, ocean, alpine, desert, wetlands, polar) for today (${windowInfo.dateKey}). Include both iconic wildlife and intriguing lesser-known wild creatures. Every entry must be a real wild animal species (no domestic pets, no mythical creatures). Return JSON with keys: themeTitle (string), themeSummary (string), species (array of objects with commonName, scientificName, biome, region, conservationStatus, hook, searchQuery).${excludeInstruction}`
          : `Curate today's WildSearch Discovery Slate (Day ${windowInfo.dayInFortnight} of Fortnight Cycle #${windowInfo.fortnightIndex}, date ${windowInfo.dateKey}). Choose 6 real wild animal species spanning varied biomes (savanna, rainforest, deep ocean, alpine, desert, polar/wetlands). Balance iconic predators/megafauna with fascinating lesser-known wild species. Return JSON with keys: themeTitle (string), themeSummary (string), species (array of objects with commonName, scientificName, biome, region, conservationStatus, hook, searchQuery).`;

      const parsed = await generateStructuredWildlifeJson<{
        themeTitle?: string;
        themeSummary?: string;
        species?: SpotlightSpecies[];
      }>(ai, {
        prompt,
        seed,
        systemInstruction:
          'You are a senior wildlife natural history editor creating a documentary-grade wildlife discovery edition. Focus strictly on real wild animals. Keep descriptions accurate, vivid, and concise.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themeTitle: {
              type: Type.STRING,
              description:
                'A crisp 3-6 word editorial expedition theme title for this wildlife slate.',
            },
            themeSummary: {
              type: Type.STRING,
              description:
                'One concise sentence introducing the wildlife habitats and species in this discovery slate.',
            },
            species: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  commonName: { type: Type.STRING },
                  scientificName: { type: Type.STRING },
                  biome: { type: Type.STRING },
                  region: { type: Type.STRING },
                  conservationStatus: { type: Type.STRING },
                  hook: {
                    type: Type.STRING,
                    description:
                      'One vivid natural-history sentence highlighting a defining behavior or adaptation.',
                  },
                  searchQuery: {
                    type: Type.STRING,
                    description:
                      'Exact Wikipedia article title for this wild animal species.',
                  },
                },
                required: [
                  'commonName',
                  'scientificName',
                  'biome',
                  'region',
                  'conservationStatus',
                  'hook',
                  'searchQuery',
                ],
              },
            },
          },
          required: ['themeTitle', 'themeSummary', 'species'],
        },
      });

      const excludedSet = new Set(excludedNames.map((n) => n.toLowerCase()));
      const filteredSpecies = Array.isArray(parsed.species)
        ? parsed.species
            .filter(
              (s) =>
                s &&
                typeof s.commonName === 'string' &&
                s.commonName.trim().length > 0 &&
                !excludedSet.has(s.commonName.toLowerCase())
            )
            .slice(0, 6)
        : [];

      if (filteredSpecies.length === 0) {
        throw new Error('Model returned an empty wildlife slate. Please retry.');
      }

      const payload: SpotlightPayload = {
        editionLabel: `Cycle ${windowInfo.fortnightIndex} · Day ${windowInfo.dayInFortnight} of 14`,
        cadenceLabel: `Rotates daily & every 14 days · Next fortnight cycle ${windowInfo.nextRefreshDate}`,
        themeTitle: parsed.themeTitle || 'Wild Frontiers & Emerald Habitats',
        themeSummary:
          parsed.themeSummary ||
          'Wild animal species curated across terrestrial, marine, and alpine ecosystems.',
        nextRefreshDate: windowInfo.nextRefreshDate,
        species: filteredSpecies,
      };

      if (!forceFresh && excludedNames.length === 0) {
        setBoundedCache(spotlightCache, cacheKey, payload);
      }

      res.json(payload);
    } catch (error) {
      console.error('Spotlight generation error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to generate wildlife discovery slate.';
      res.status(502).json({ error: message });
    }
  });

  // 2. AI Field Dossier for any Wikipedia Wildlife Article
  app.post('/api/wildlife/brief', async (req: Request, res: Response) => {
    const { pageid, title, extract, description } = req.body as {
      pageid?: number;
      title?: string;
      extract?: string;
      description?: string;
    };

    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Article title is required.' });
      return;
    }

    const cacheKey = String(pageid || title.toLowerCase());
    if (briefCache.has(cacheKey)) {
      res.json(briefCache.get(cacheKey));
      return;
    }

    try {
      const ai = getGeminiClient();
      const parsed = await generateStructuredWildlifeJson<
        Record<string, unknown>
      >(ai, {
        prompt: `Analyze this encyclopedia entry and produce a structured Wildlife Field Dossier JSON object with keys: isAnimalOrWildlife (boolean), scientificName (string), conservationStatus (string), habitat (string), diet (string), lifespan (string), sizeAndWeight (string), fieldNote (string), adaptationHighlight (string).

Title: ${title}
Short Description: ${description || 'N/A'}
Summary Text: ${(extract || '').slice(0, 2200)}`,
        systemInstruction:
          'You are a zoological field researcher writing concise, accurate wildlife field dossiers. Determine if the subject is genuinely a wild animal or animal taxon (isAnimalOrWildlife). Never fabricate precise measurements if uncertain—provide grounded ranges or "Varies by subspecies".',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAnimalOrWildlife: { type: Type.BOOLEAN },
            scientificName: { type: Type.STRING },
            conservationStatus: { type: Type.STRING },
            habitat: { type: Type.STRING },
            diet: { type: Type.STRING },
            lifespan: { type: Type.STRING },
            sizeAndWeight: { type: Type.STRING },
            fieldNote: {
              type: Type.STRING,
              description:
                '2-3 engaging documentary sentences on behavior, ecology, and survival.',
            },
            adaptationHighlight: {
              type: Type.STRING,
              description:
                '1 concise sentence on a remarkable physical or behavioral adaptation.',
            },
          },
          required: [
            'isAnimalOrWildlife',
            'scientificName',
            'conservationStatus',
            'habitat',
            'diet',
            'lifespan',
            'sizeAndWeight',
            'fieldNote',
            'adaptationHighlight',
          ],
        },
      });

      setBoundedCache(briefCache, cacheKey, parsed);
      res.json(parsed);
    } catch (error) {
      console.error('Field brief generation error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to generate AI field dossier.';
      res.status(502).json({ error: message });
    }
  });

  // 3. Animal-Only AI Wildlife Naturalist Q&A
  app.post('/api/wildlife/ask', async (req: Request, res: Response) => {
    const { question, speciesContext } = req.body as {
      question?: string;
      speciesContext?: string;
    };

    const trimmedQuestion = (question || '').trim();
    if (!trimmedQuestion) {
      res.status(400).json({ error: 'Please enter a wildlife question.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const contextPrefix = speciesContext
        ? `Current animal focus: ${speciesContext}.\n\n`
        : '';

      const parsed = await generateStructuredWildlifeJson<{
        onTopic?: boolean;
        answer?: string;
        suggestedSpecies?: string[];
      }>(ai, {
        prompt: `${contextPrefix}User Question: ${trimmedQuestion}\n\nReturn JSON with keys: onTopic (boolean), answer (string), suggestedSpecies (array of up to 3 wild animal species strings).`,
        systemInstruction:
          'You are WildSearch Naturalist, an AI wildlife guide inspired by documentary natural history networks. STRICT SCOPE RULE: You ONLY answer questions about animals, wildlife, zoology, habitats, animal behavior, ecology, and conservation. If the user asks about anything unrelated to animals or wildlife (such as coding, politics, finance, recipes, celebrities, or technology), politely decline in one sentence and invite them to ask about wild animals instead. Always provide up to 3 relevant wild animal Wikipedia search suggestions when on-topic.',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            onTopic: {
              type: Type.BOOLEAN,
              description:
                'True only if the question relates to animals, wildlife, zoology, habitats, or conservation.',
            },
            answer: {
              type: Type.STRING,
              description:
                'Clear, concise, engaging natural history answer (2-4 sentences) or polite scope decline.',
            },
            suggestedSpecies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Up to 3 real wild animal species names the user can click to explore on WildSearch.',
            },
          },
          required: ['onTopic', 'answer', 'suggestedSpecies'],
        },
      });

      if (!parsed.answer) {
        throw new Error('Unable to parse Naturalist response.');
      }

      res.json({
        onTopic: Boolean(parsed.onTopic),
        answer: parsed.answer,
        suggestedSpecies: Array.isArray(parsed.suggestedSpecies)
          ? parsed.suggestedSpecies.slice(0, 3)
          : [],
      });
    } catch (error) {
      console.error('Wildlife Naturalist Q&A error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to reach the Wildlife Naturalist right now.';
      res.status(502).json({ error: message });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { maxAge: '1h' }));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WildSearch server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start WildSearch server:', err);
  process.exit(1);
});
