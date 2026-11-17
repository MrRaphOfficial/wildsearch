export interface WildlifeArticle {
  pageid: number;
  title: string;
  description?: string;
  extract: string;
  fullExtract?: string;
  imageUrl: string | null;
  originalImageUrl: string | null;
  wikiUrl: string;
  index: number;
  wordCount?: number;
}

export type BiomeCategory =
  | 'All'
  | 'Savanna'
  | 'Forest'
  | 'Alpine'
  | 'Marine'
  | 'Polar'
  | 'Desert'
  | 'Wetlands';

export interface CuratedSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  biome: Exclude<BiomeCategory, 'All'>;
  region: string;
  summary: string;
  searchQuery: string;
}

export interface BackdropSlide {
  id: string;
  species: string;
  scientificName: string;
  location: string;
  imagePath: string;
  searchQuery: string;
  alt: string;
}

export interface SpotlightSpecies {
  commonName: string;
  scientificName: string;
  biome: string;
  region: string;
  conservationStatus: string;
  hook: string;
  searchQuery: string;
}

export interface SpotlightPayload {
  editionLabel: string;
  cadenceLabel: string;
  themeTitle: string;
  themeSummary: string;
  nextRefreshDate: string;
  species: SpotlightSpecies[];
}

export interface WildlifeFieldBrief {
  isAnimalOrWildlife: boolean;
  scientificName: string;
  conservationStatus: string;
  habitat: string;
  diet: string;
  lifespan: string;
  sizeAndWeight: string;
  fieldNote: string;
  adaptationHighlight: string;
}

export interface NaturalistAnswer {
  onTopic: boolean;
  answer: string;
  suggestedSpecies: string[];
}

export interface PaginatedWildlifeResult {
  articles: WildlifeArticle[];
  nextOffset: number | null;
}

export type ActiveView = 'search' | 'featured' | 'gallery' | 'saved';
