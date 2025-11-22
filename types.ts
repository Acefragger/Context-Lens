export interface Estimation {
  price_range: string;
  time_estimate: string;
  currency: string;
}

export interface AnalysisResult {
  object_name: string;
  issue_detected: string;
  importance: string;
  likely_causes: string[];
  steps: string[];
  estimation: Estimation;
  confidence_score: number;
  safety_warning: string | null;
  product_search_query: string | null; // New field for shopping/search
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface FullAnalysisResponse {
  data: AnalysisResult | null;
  groundingSources: GroundingSource[];
  rawText?: string;
}

export interface UserProfile {
  username: string;
  currency: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  imagePreview: string; // Base64 thumbnail or blob URL (stored as string)
  note: string;
  result: FullAnalysisResponse;
}