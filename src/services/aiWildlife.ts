import type {
  NaturalistAnswer,
  SpotlightPayload,
  WildlifeArticle,
  WildlifeFieldBrief,
} from '../types/wildlife';

async function parseJsonSafe<T>(response: Response): Promise<T> {
  const raw = await response.text();
  if (!raw) {
    return {} as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Server returned an unexpected response (${response.status}).`
    );
  }
}

export async function fetchWildlifeSpotlight(
  options: {
    refresh?: boolean;
    exclude?: string[];
    signal?: AbortSignal;
  } = {}
): Promise<SpotlightPayload> {
  const { refresh = false, exclude = [], signal } = options;
  const params = new URLSearchParams();
  if (refresh) params.set('refresh', '1');
  if (exclude.length > 0) params.set('exclude', exclude.join(','));

  const qs = params.toString();
  const url = qs
    ? `/api/wildlife/spotlight?${qs}`
    : '/api/wildlife/spotlight';

  const response = await fetch(url, { signal });
  const data = await parseJsonSafe<SpotlightPayload & { error?: string }>(
    response
  );

  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to load the current wildlife discovery slate.'
    );
  }

  return data;
}

export async function fetchWildlifeFieldBrief(
  article: WildlifeArticle,
  signal?: AbortSignal
): Promise<WildlifeFieldBrief> {
  const response = await fetch('/api/wildlife/brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      pageid: article.pageid,
      title: article.title,
      description: article.description,
      extract: article.fullExtract || article.extract,
    }),
  });

  const data = await parseJsonSafe<WildlifeFieldBrief & { error?: string }>(
    response
  );
  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to generate AI Field Dossier for this species.'
    );
  }

  return data;
}

export async function askWildlifeNaturalist(
  question: string,
  speciesContext?: string,
  signal?: AbortSignal
): Promise<NaturalistAnswer> {
  const response = await fetch('/api/wildlife/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ question, speciesContext }),
  });

  const data = await parseJsonSafe<NaturalistAnswer & { error?: string }>(
    response
  );
  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to reach the Wildlife Naturalist assistant.'
    );
  }

  return data;
}
