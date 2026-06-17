import Anthropic from "@anthropic-ai/sdk";
import type { OriginalProduct, Alternative } from "./types";
import type { ScrapedPage } from "./scraper";
import type { ShoppingResult } from "./search";

const client = new Anthropic();

export async function extractProductInfo(page: ScrapedPage): Promise<OriginalProduct> {
  const prompt = `You are a product data extractor. Extract structured product information from this search result data about a product URL.

URL: ${page.url}
Title: ${page.title}
Meta Description: ${page.metaDescription}

Search result snippets and data:
${page.text}

Instructions:
- Extract the product name, brand, category, and description from the search data
- For price: look carefully in the text for any price mentions (e.g. "£279", "$349", "299.99"). Use your knowledge of this product if needed — if you know the typical retail price for this exact product model, use it.
- For currency: infer from the URL domain (.co.uk = GBP, .com = USD, .de = EUR) or price symbols
- For retailer: infer from the URL domain (amazon.co.uk = Amazon, johnlewis.com = John Lewis, etc.)
- For imageUrl: return null (we don't have direct page access)

Return a JSON object with these exact fields:
{
  "name": "full product name",
  "price": number or null (numeric price only, no symbols — use your best estimate if visible in data),
  "currency": "GBP" or "USD" or "EUR",
  "brand": "brand/manufacturer name",
  "category": "product category (e.g. 'Bluetooth Headphones', 'Running Shoes', 'Coffee Maker')",
  "description": "1-2 sentence description of what this product is and its key features",
  "imageUrl": null,
  "retailer": "retailer name"
}

Return ONLY valid JSON, no explanation.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not extract product info");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    ...parsed,
    url: page.url,
    imageUrl: parsed.imageUrl || page.ogImage || null,
  };
}

export async function analyzeAlternatives(
  original: OriginalProduct,
  candidates: ShoppingResult[]
): Promise<Alternative[]> {
  if (candidates.length === 0) return [];

  const currencySymbol = original.currency === "GBP" ? "£" : original.currency === "EUR" ? "€" : "$";

  const prompt = `You are a savvy shopping expert. A user wants to buy this product:

ORIGINAL PRODUCT:
Name: ${original.name}
Brand: ${original.brand}
Category: ${original.category}
Price: ${currencySymbol}${original.price ?? "unknown"}
Description: ${original.description}

Here are potential cheaper alternatives found online:
${candidates.map((c, i) => `
[${i + 1}] ${c.title}
  Price: ${c.price} ${c.currency}
  Retailer: ${c.source}
  Rating: ${c.rating ? `${c.rating}/5 (${c.reviews} reviews)` : "no rating data"}
  URL: ${c.link}
`).join("")}

Select the 3 best alternatives that are:
1. Genuinely similar to the original (same category and use case)
2. Cheaper than the original${original.price ? ` (${currencySymbol}${original.price})` : ""}
3. Highly rated (prefer 4+ stars, or good brand reputation)
4. Actually available (not clearly out of stock)

For each selected alternative, write a compelling comparison. Return a JSON array:
[
  {
    "index": (original 1-based index from the list above),
    "whyJustAsGood": "2-3 sentence explanation of why this is a great alternative — mention specific features, brand reputation, or what users say. Be concrete and persuasive.",
    "keyHighlights": ["highlight 1", "highlight 2", "highlight 3"],
    "verdict": "One punchy sentence verdict, e.g. 'Same core performance at nearly half the price.'"
  }
]

Return ONLY valid JSON array, no explanation.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const selections: Array<{ index: number; whyJustAsGood: string; keyHighlights: string[]; verdict: string }> =
    JSON.parse(jsonMatch[0]);

  return selections
    .filter((s) => s.index >= 1 && s.index <= candidates.length)
    .map((s) => {
      const candidate = candidates[s.index - 1];
      const originalPrice = original.price ?? 0;
      const savingsAmount = originalPrice > 0 ? Math.max(0, originalPrice - candidate.price) : 0;
      const savingsPercent = originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

      return {
        name: candidate.title,
        brand: extractBrand(candidate.title),
        price: candidate.price,
        currency: candidate.currency || original.currency,
        rating: candidate.rating ?? 4.0,
        reviewCount: candidate.reviews ?? 0,
        url: candidate.link,
        imageUrl: candidate.thumbnail,
        retailer: candidate.source,
        savingsAmount,
        savingsPercent,
        whyJustAsGood: s.whyJustAsGood,
        keyHighlights: s.keyHighlights,
        verdict: s.verdict,
      };
    });
}

function extractBrand(title: string): string {
  return title.split(" ")[0] || "Unknown";
}
