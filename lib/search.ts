export interface ShoppingResult {
  title: string;
  price: number;
  currency: string;
  source: string;
  link: string;
  thumbnail: string | null;
  rating: number | null;
  reviews: number | null;
}

export async function searchAlternatives(
  query: string,
  maxPrice: number | null
): Promise<ShoppingResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY not configured");

  const priceFilter = maxPrice ? ` under £${Math.round(maxPrice * 0.9)}` : "";
  const searchQuery = `${query}${priceFilter} highly rated reviews`;

  const res = await fetch("https://google.serper.dev/shopping", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: searchQuery,
      gl: "gb",
      hl: "en",
      num: 20,
    }),
  });

  if (!res.ok) {
    throw new Error(`Serper API error: ${res.status}`);
  }

  const data = await res.json();
  const items = data.shopping || [];

  return items
    .filter((item: Record<string, unknown>) => item.price && item.link)
    .map((item: Record<string, unknown>) => ({
      title: String(item.title || ""),
      price: parsePrice(String(item.price || "0")),
      currency: detectCurrency(String(item.price || "")),
      source: String(item.source || ""),
      link: String(item.link || ""),
      thumbnail: (item.imageUrl as string) || (item.thumbnailUrl as string) || null,
      rating: item.rating ? Number(item.rating) : null,
      reviews: item.reviews ? Number(item.reviews) : null,
    }))
    .filter((item: ShoppingResult) => item.price > 0);
}

function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

function detectCurrency(priceStr: string): string {
  if (priceStr.includes("£")) return "GBP";
  if (priceStr.includes("€")) return "EUR";
  if (priceStr.includes("$")) return "USD";
  return "GBP";
}
