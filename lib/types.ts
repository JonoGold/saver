export interface OriginalProduct {
  name: string;
  price: number | null;
  currency: string;
  brand: string;
  category: string;
  description: string;
  imageUrl: string | null;
  url: string;
  retailer: string;
}

export interface Alternative {
  name: string;
  brand: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  url: string;
  imageUrl: string | null;
  retailer: string;
  savingsAmount: number;
  savingsPercent: number;
  whyJustAsGood: string;
  keyHighlights: string[];
  verdict: string;
}

export interface AnalysisResult {
  original: OriginalProduct;
  alternatives: Alternative[];
  totalPotentialSavings: number;
  analysisNote: string;
}
