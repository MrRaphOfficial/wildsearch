import type {
  BiomeCategory,
  PaginatedWildlifeResult,
  WildlifeArticle,
} from '../types/wildlife';

const WIKIPEDIA_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';

interface WikiCategory {
  title: string;
}

interface WikiPageResponse {
  pageid: number;
  title: string;
  index?: number;
  extract?: string;
  description?: string;
  fullurl?: string;
  categories?: WikiCategory[];
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  original?: {
    source: string;
    width: number;
    height: number;
  };
}

interface WikiSearchResponse {
  continue?: {
    gsroffset?: number;
  };
  query?: {
    pages?: Record<string, WikiPageResponse>;
  };
  error?: {
    code: string;
    info: string;
  };
}

const NON_ANIMAL_TITLE_PATTERNS = [
  /\blist(s)? of\b/i,
  /^index of\b/i,
  /^outline of\b/i,
  /^glossary of\b/i,
  /^evolution of\b/i,
  /^history of\b/i,
  /^criticism of\b/i,
  /\(disambiguation\)/i,
  /\(film\)/i,
  /\(movie\)/i,
  /\(tv series\)/i,
  /\(album\)/i,
  /\(song\)/i,
  /\(band\)/i,
  /\(video game\)/i,
  /\(programming language\)/i,
  /\(software\)/i,
  /\(company\)/i,
  /\(automobile\)/i,
  /\(comics\)/i,
  /\(novel\)/i,
  /\(novella\)/i,
  /\(hunting\)/i,
  /^(wildlife|fauna|biota|animals)\s+of\b/i,
];

const NON_ANIMAL_DESC_OR_CAT_PATTERNS = [
  /\b(botanical|plant|plants|flowering plant|vascular plant|dicot|monocot|gymnosperm|bryophyte|fern|moss|conifer|angiosperm|shrub|tree|trees|apple tree|oak tree|gall found on|herbaceous|orchid|cactus|succulent|algae|seaweed|kelp|flora|forestry)\b/i,
  /\b(fungus|fungi|mushroom|toadstool|lichen|yeast|mold|mould|ascomycota|basidiomycota)\b/i,
  /\b(bacterium|bacteria|archaea|virus|viral|bacteriophage|protozoa|protist|plasmodium)\b/i,
  /\b(programming language|computer science|software|operating system|video game|board game|card game|web browser|database|genomic database|website|journal)\b/i,
  /\b(film|movie|television series|tv series|sitcom|animated series|documentary film|soundtrack|album|studio album|single by|song by|rock band|pop band|musician|singer|rapper|composer|actor|actress|director)\b/i,
  /\b(football club|basketball team|baseball team|hockey team|soccer club|rugby|cricket|nfl|nba|mlb|nhl|premier league|athlete|coach)\b/i,
  /\b(car marque|automobile|sports car|sedan|suv|motorcycle|aircraft|fighter jet|warship|submarine|spaceship|rocket|locomotive)\b/i,
  /\b(corporation|company|manufacturer|airline|retailer|bank|brand of|trademark)\b/i,
  /\b(municipality|capital city|city in|town in|village in|county in|province of|state in|commune in|river in|mountain in|lake in)\b/i,
  /\b(novel|novella|short story|poem|comic book|manga|anime|fictional character|superhero|supervillain|mythological|legendary creature|cryptid|folklore|play by|opera)\b/i,
  /\b(edible fruit|fruit of|citrus|vegetable|culinary|recipe|dish|cuisine|beverage|cocktail|beer|wine|fast food)\b/i,
  /\b(politician|president of|prime minister|monarch|king of|queen of|emperor of|general|soldier|scientist|author|writer|painter|philosopher)\b/i,
  /\b(zoo|animal park|theme park|sanctuary|wildlife crossing|wildlife smuggling|wildlife–vehicle collision|animal glue|adhesive|animal print|print made to|animal welfare|animal rights|animal testing|animal husbandry|cruelty to animals|bestiality|sexual acts|euthanasia|cervical dislocation|locomotion|organic vessel|human anatomy|organ system|taken in hunting|meat|leather|fur trade|poaching|trafficking)\b/i,
];

// Strictly biological / taxonomic animal organism terms
const ANIMAL_ORGANISM_TERMS = [
  /\b(animalia|mammal|mammals|mammalia|marsupial|monotreme|primate|lemur|monkey|ape|gorilla|chimpanzee|orangutan|gibbon|baboon)\b/i,
  /\b(carnivoran|felid|felidae|big cat|wild cat|feline|canid|canidae|canine|ursid|bear|mustelid|otter|badger|weasel|wolverine|hyena|mongoose|meerkat|raccoon)\b/i,
  /\b(cetacean|whale|dolphin|porpoise|orca|narwhal|beluga|pinniped|seal|sea lion|walrus|manatee|dugong)\b/i,
  /\b(ungulate|elephant|rhinoceros|hippopotamus|giraffe|okapi|zebra|antelope|gazelle|deer|elk|moose|caribou|bison|buffalo|ibex|wild goat|wild boar|warthog|tapir|camel)\b/i,
  /\b(rodent|squirrel|beaver|capybara|porcupine|marmot|lemming|gerbil|hamster|vole|mouse|rat|bat|chiroptera|hedgehog|shrew|mole|sloth|armadillo|anteater|pangolin)\b/i,
  /\b(bird|birds|aves|avian|raptor|bird of prey|eagle|hawk|falcon|osprey|vulture|condor|owl|penguin|albatross|pelican|heron|stork|crane|flamingo|swan|duck|goose|kingfisher|woodpecker|hummingbird|parrot|macaw|cockatoo|crow|raven|jay|sparrow|finch|warbler|swallow|swift|ostrich|emu|cassowary|kiwi)\b/i,
  /\b(reptile|reptiles|reptilia|snake|serpent|viper|cobra|python|boa|anaconda|mamba|lizard|gecko|iguana|chameleon|monitor lizard|komodo|skink|turtle|tortoise|terrapin|crocodile|alligator|caiman|gharial|tuatara)\b/i,
  /\b(amphibian|amphibians|amphibia|frog|toad|salamander|newt|axolotl|caecilian)\b/i,
  /\b(fish|fishes|actinopterygii|chondrichthyes|elasmobranch|shark|ray|stingray|manta|skate|sawfish|eel|salmon|trout|tuna|marlin|swordfish|barracuda|seahorse|clownfish|piranha|catfish|carp|sturgeon|coelacanth)\b/i,
  /\b(arthropod|arthropoda|insect|insects|insecta|beetle|butterfly|moth|dragonfly|damselfly|bee|wasp|hornet|ant|termite|grasshopper|locust|cricket|mantis|cicada|firefly|mosquito|fly)\b/i,
  /\b(arachnid|arachnida|spider|tarantula|scorpion|tick|mite|crustacean|crab|lobster|shrimp|prawn|krill|barnacle|crayfish)\b/i,
  /\b(mollusk|mollusc|mollusca|gastropod|cephalopod|bivalve|octopus|squid|cuttlefish|nautilus|snail|slug|clam|oyster|scallop|mussel)\b/i,
  /\b(cnidarian|cnidaria|jellyfish|coral|sea anemone|echinoderm|starfish|sea star|sea urchin|sea cucumber|annelid|earthworm|leech|nematode|flatworm|sponge|porifera|tardigrade)\b/i,
  /\b(vertebrate|invertebrate|chordate|chordata)\b/i,
];

const TAXONOMIC_DESC_PATTERNS = [
  /\b(species|subspecies|genus|family|order|class|phylum|clade)\s+of\s+/i,
  /\b(native to|endemic to)\b/i,
  /\bbiological kingdom\b/i,
];

const ANIMAL_CATEGORY_PATTERNS = [
  /Category:Animal taxa/i,
  /Category:Mammals/i,
  /Category:Birds/i,
  /Category:Reptiles/i,
  /Category:Amphibians/i,
  /Category:Fish/i,
  /Category:Insects/i,
  /Category:Arachnids/i,
  /Category:Spiders/i,
  /Category:Crustaceans/i,
  /Category:Molluscs/i,
  /Category:Gastropods/i,
  /Category:Cephalopods/i,
  /Category:Carnivorans/i,
  /Category:Cetaceans/i,
  /Category:Primates/i,
  /Category:Rodents/i,
  /Category:Marsupials/i,
  /Category:Apex predators/i,
  /Category:Big cats/i,
  /Category:Snakes/i,
  /Category:Lizards/i,
  /Category:Turtles/i,
  /Category:Sharks/i,
  /Category:Eagles/i,
  /Category:Owls/i,
  /Category:Penguins/i,
  /Category:Panthera/i,
  /Category:Felids/i,
  /Category:Canids/i,
  /Category:Endangered fauna/i,
  /Category:Fauna of/i,
];

function isUsablePhotoUrl(url?: string): url is string {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (
    lower.endsWith('.svg') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.ogv') ||
    lower.endsWith('.pdf') ||
    lower.includes('disambig') ||
    lower.includes('commons-logo') ||
    lower.includes('red_pog')
  ) {
    return false;
  }
  return true;
}

function estimateWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Strict Animal Kingdom Gate:
 * Ensures only genuine Animal Kingdom organisms & taxa are returned,
 * never concepts, products, zoos, plants, fungi, or unrelated topics.
 */
function scoreAnimalKingdomRelevance(page: WikiPageResponse): {
  keep: boolean;
  score: number;
} {
  const title = page.title || '';
  const desc = page.description || '';
  const extract = (page.extract || '').trim();
  const firstSentence = extract.split(/[.!?]\s/)[0] || '';
  const categoryTitles = (page.categories || []).map((c) => c.title).join(' ');

  if (NON_ANIMAL_TITLE_PATTERNS.some((re) => re.test(title))) {
    return { keep: false, score: -100 };
  }

  if (
    NON_ANIMAL_DESC_OR_CAT_PATTERNS.some(
      (re) =>
        re.test(title) ||
        re.test(desc) ||
        re.test(categoryTitles) ||
        re.test(firstSentence)
    )
  ) {
    return { keep: false, score: -100 };
  }

  const categoriesHaveAnimalTaxon = ANIMAL_CATEGORY_PATTERNS.some((re) =>
    re.test(categoryTitles)
  );
  const descHasAnimalOrganism = ANIMAL_ORGANISM_TERMS.some((re) =>
    re.test(desc)
  );
  const descIsTaxonomic = TAXONOMIC_DESC_PATTERNS.some((re) => re.test(desc));
  const firstSentenceHasAnimalOrganism = ANIMAL_ORGANISM_TERMS.some((re) =>
    re.test(firstSentence)
  );
  const firstSentenceIsTaxonomic = TAXONOMIC_DESC_PATTERNS.some((re) =>
    re.test(firstSentence)
  );

  // If Wikipedia provided a short description and it neither mentions an animal organism nor a taxonomic category, reject
  if (desc && !descHasAnimalOrganism && !categoriesHaveAnimalTaxon) {
    return { keep: false, score: -80 };
  }

  // Require affirmative zoological organism proof
  const hasStrongOrganismProof =
    categoriesHaveAnimalTaxon ||
    descHasAnimalOrganism ||
    (firstSentenceHasAnimalOrganism && firstSentenceIsTaxonomic);

  if (!hasStrongOrganismProof) {
    return { keep: false, score: -50 };
  }

  let score = 0;
  if (categoriesHaveAnimalTaxon) score += 6;
  if (descHasAnimalOrganism) score += 5;
  if (descIsTaxonomic || firstSentenceIsTaxonomic) score += 4;
  if (firstSentenceHasAnimalOrganism) score += 2;
  if (isUsablePhotoUrl(page.thumbnail?.source)) {
    score += 1;
  }

  return { keep: true, score };
}

function mapPageToArticle(page: WikiPageResponse): WildlifeArticle {
  const thumb = isUsablePhotoUrl(page.thumbnail?.source)
    ? page.thumbnail!.source
    : null;
  const original = isUsablePhotoUrl(page.original?.source)
    ? page.original!.source
    : null;

  const extract = (page.extract || '').trim();

  return {
    pageid: page.pageid,
    title: page.title,
    description: page.description,
    extract,
    imageUrl: thumb ?? original,
    originalImageUrl: original ?? thumb,
    wikiUrl:
      page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`,
    index: page.index ?? 0,
    wordCount: estimateWordCount(extract),
  };
}

async function runWikiGeneratorSearch(
  searchQuery: string,
  signal?: AbortSignal,
  limit = 20,
  offset = 0
): Promise<{ pages: WikiPageResponse[]; nextOffset: number | null }> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: searchQuery,
    gsrlimit: String(limit),
    gsroffset: String(offset),
    gsrnamespace: '0',
    prop: 'pageimages|extracts|description|info|categories',
    cllimit: 'max',
    clshow: '!hidden',
    inprop: 'url',
    exintro: '1',
    explaintext: '1',
    exsentences: '4',
    piprop: 'thumbnail|original',
    pithumbsize: '900',
    redirects: '1',
  });

  const response = await fetch(`${WIKIPEDIA_API_ENDPOINT}?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status === 429) {
    throw new Error(
      'Wikipedia is temporarily rate-limiting requests. Please wait a moment and try again.'
    );
  }

  if (!response.ok) {
    throw new Error(`Wikipedia search failed (${response.status}).`);
  }

  const data: WikiSearchResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.info || 'Unable to query Wikipedia.');
  }

  const pagesMap = data.query?.pages;
  const pages = pagesMap
    ? Object.values(pagesMap).filter((page) =>
        Boolean(page.extract && page.extract.trim().length > 0)
      )
    : [];

  const rawNextOffset = data.continue?.gsroffset;
  const safeNextOffset =
    typeof rawNextOffset === 'number' && rawNextOffset > offset
      ? rawNextOffset
      : null;

  return {
    pages,
    nextOffset: safeNextOffset,
  };
}

function normalizeAnimalSearchTerm(rawQuery: string): {
  cleaned: string;
  isWildcardOnly: boolean;
} {
  const trimmed = rawQuery.trim();
  const stripped = trimmed.replace(/[*?%~^]+/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    cleaned: stripped,
    isWildcardOnly: trimmed.length > 0 && stripped.length === 0,
  };
}

export async function searchWikipediaWildlife(
  rawQuery: string,
  signal?: AbortSignal,
  offset = 0,
  limit = 18
): Promise<PaginatedWildlifeResult> {
  const { cleaned, isWildcardOnly } = normalizeAnimalSearchTerm(rawQuery);
  if (!cleaned && !isWildcardOnly) {
    return { articles: [], nextOffset: null };
  }

  // Pure wildcard queries ("*", "??") safely return diverse Animal Kingdom species
  if (isWildcardOnly) {
    const wildcardResult = await runWikiGeneratorSearch(
      'species mammal bird reptile amphibian fish',
      signal,
      20,
      offset
    );
    const verified = wildcardResult.pages
      .map((page) => ({ page, ...scoreAnimalKingdomRelevance(page) }))
      .filter((entry) => entry.keep)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      articles: verified.map((entry) => mapPageToArticle(entry.page)),
      nextOffset: wildcardResult.nextOffset,
    };
  }

  const hasTaxonWord = /\b(animal|animals|wildlife|species|mammal|bird|fish|reptile|amphibian|insect|spider|whale|shark|snake|snail|frog|turtle)\b/i.test(
    cleaned
  );

  // Anchor general terms with "species" instead of "animal" so Wikipedia finds actual species/taxa
  // rather than non-organism pages containing the word "animal" (e.g. Animal glue, Animal print).
  const primaryQuery = hasTaxonWord ? cleaned : `${cleaned} species`;
  const primaryResult = await runWikiGeneratorSearch(
    primaryQuery,
    signal,
    24,
    offset
  );

  const seen = new Map<number, { page: WikiPageResponse; score: number }>();
  for (const page of primaryResult.pages) {
    const relevance = scoreAnimalKingdomRelevance(page);
    if (!relevance.keep) continue;
    const existing = seen.get(page.pageid);
    if (!existing || relevance.score > existing.score) {
      seen.set(page.pageid, { page, score: relevance.score });
    }
  }

  let nextOffset = primaryResult.nextOffset;

  // Fallback to exact query (e.g. "Jaguar" or Latin names) if "species" query yielded < 8 animals
  if (offset === 0 && seen.size < 8 && !hasTaxonWord) {
    const fallbackResult = await runWikiGeneratorSearch(
      cleaned,
      signal,
      20,
      0
    ).catch(() => ({ pages: [] as WikiPageResponse[], nextOffset: null }));

    for (const page of fallbackResult.pages) {
      const relevance = scoreAnimalKingdomRelevance(page);
      if (!relevance.keep) continue;
      const exactTitleBonus =
        page.title.toLowerCase() === cleaned.toLowerCase() ? 10 : 0;
      const totalScore = relevance.score + exactTitleBonus;
      const existing = seen.get(page.pageid);
      if (!existing || totalScore > existing.score) {
        seen.set(page.pageid, { page, score: totalScore });
      }
    }

    if (nextOffset === null) {
      nextOffset = fallbackResult.nextOffset;
    }
  }

  const sorted = Array.from(seen.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.page.index ?? 999) - (b.page.index ?? 999);
    })
    .slice(0, limit);

  return {
    articles: sorted.map((entry) => mapPageToArticle(entry.page)),
    nextOffset,
  };
}

const BIOME_WIKI_QUERIES: Record<BiomeCategory, string> = {
  All: 'species mammal bird reptile amphibian wildlife',
  Savanna: 'savanna wildlife mammal bird species Africa',
  Forest: 'rainforest jungle woodland mammal bird species',
  Alpine: 'mountain alpine wildlife mammal bird species',
  Marine: 'ocean marine wildlife whale shark sea turtle species',
  Polar: 'arctic antarctic polar wildlife animal species',
  Desert: 'desert wildlife mammal reptile bird species',
  Wetlands: 'wetland marsh river wildlife amphibian bird species',
};

export async function searchBiomeWildlife(
  biome: BiomeCategory,
  signal?: AbortSignal,
  offset = 0,
  limit = 18
): Promise<PaginatedWildlifeResult> {
  const wikiQuery = BIOME_WIKI_QUERIES[biome] || BIOME_WIKI_QUERIES.All;
  const result = await runWikiGeneratorSearch(wikiQuery, signal, limit, offset);

  const filtered = result.pages
    .map((page) => ({ page, ...scoreAnimalKingdomRelevance(page) }))
    .filter((entry) => entry.keep)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.page.index ?? 999) - (b.page.index ?? 999);
    });

  return {
    articles: filtered.map((entry) => mapPageToArticle(entry.page)),
    nextOffset: result.nextOffset,
  };
}

export async function fetchSingleSpeciesArticle(
  titleQuery: string,
  signal?: AbortSignal
): Promise<WildlifeArticle | null> {
  const result = await runWikiGeneratorSearch(titleQuery, signal, 5, 0);
  const ranked = result.pages
    .map((page) => ({ page, ...scoreAnimalKingdomRelevance(page) }))
    .filter((item) => item.keep)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  return mapPageToArticle(ranked[0].page);
}

export async function fetchFullArticleExtract(
  pageid: number,
  signal?: AbortSignal
): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    pageids: String(pageid),
    prop: 'extracts',
    explaintext: '1',
    exchars: '5000',
    redirects: '1',
  });

  const response = await fetch(`${WIKIPEDIA_API_ENDPOINT}?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data: WikiSearchResponse = await response.json();
  const page = data.query?.pages?.[String(pageid)];
  const text = page?.extract?.trim();
  return text && text.length > 0 ? text : null;
}

export function formatReadingTime(text: string): string {
  const words = estimateWordCount(text);
  const minutes = Math.max(1, Math.round(words / 180));
  return `${minutes} min read`;
}
