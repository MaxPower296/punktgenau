export interface MapWithCount {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  pointCount: number;
}

export interface PointDto {
  id: string;
  mapId: string;
  name: string;
  refNumber: string | null;
  category: string | null;
  lat: number;
  lng: number;
  altitude: number | null;
  maxWomos: string | null;
  equipment: string | null;
  description: string | null;
  prices: string | null;
  directions: string | null;
  phone: string | null;
  notes: string | null;
  rawGps: string | null;
  rawText: string | null;
  source: string;
  favorite: boolean;
  visited: boolean;
  visitedAt: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PointImageDto {
  id: string;
  pointId: string;
  url: string;
  caption: string | null;
  createdAt: string;
}

export interface CoordCandidateDto {
  lat: number;
  lng: number;
  latRaw: string;
  lngRaw: string;
  raw: string;
  format: string;
  index: number;
}

export interface ParsedGuide {
  refNumber: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  format: string | null;
  latRaw: string;
  lngRaw: string;
  rawGps: string;
  altitude: number | null;
  maxWomos: string;
  equipment: string;
  description: string;
  prices: string;
  directions: string;
  phone: string;
  opened: string;
  coordinates: CoordCandidateDto[];
  rawText: string;
}

export interface OcrResponse {
  rotation: number;
  confidence: number;
  foundGps: boolean;
  ocrText: string;
  parsed: ParsedGuide;
  photoGps: { latitude: number; longitude: number } | null;
  detectedColorCategory?: string | null;
  error?: string;
}
