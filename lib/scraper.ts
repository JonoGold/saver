export interface ScrapedPage {
  title: string;
  text: string;
  metaDescription: string;
  jsonLd: string;
  ogImage: string | null;
  url: string;
}

/**
 * Instead of fetching the retailer URL directly (which gets blocked by Amazon, ASOS, etc.),
 * we ask Google what it knows about that URL. Serper returns the indexed snippet, title,
 * and structured data — enough for Claude to identify the product.
 */
export async function scrapePage(url: string): Promise<ScrapedPage> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY not configured");

  // Search for the exact URL and for the product name from it
  const [urlSearch, knowledgeSearch] = await Promise.all([
    serperSearch(`"${url}"`, apiKey),
    serperSearch(urlToSearchQuery(url), apiKey),
  ]);

  const combined = mergeResults(url, urlSearch, knowledgeSearch);

  if (!combined.title && !combined.text) {
    throw new Error("Could not find product information for that URL in search results.");
  }

  return combined;
}

async function serperSearch(query: string, apiKey: string) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "gb", hl: "en", num: 5 }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;
  return res.json();
}

function urlToSearchQuery(url: string): string {
  try {
    const parsed = new URL(url);
    // Pull product slug from path, e.g. /dp/B08... or /product/cool-sneakers-red
    const slug = parsed.pathname
      .split("/")
      .filter(Boolean)
      .filter((s) => s.length > 3 && !/^[A-Z0-9]{10}$/.test(s)) // skip ASIN-style IDs
      .join(" ")
      .replace(/[-_]/g, " ");

    const domain = parsed.hostname.replace(/^www\./, "");
    return slug ? `site:${domain} ${slug}` : `site:${domain}`;
  } catch {
    return url;
  }
}

function mergeResults(
  url: string,
  urlSearch: Record<string, unknown> | null,
  knowledgeSearch: Record<string, unknown> | null
): ScrapedPage {
  const parts: string[] = [];
  let title = "";
  let metaDescription = "";
  let ogImage: string | null = null;

  for (const data of [urlSearch, knowledgeSearch]) {
    if (!data) continue;

    // Knowledge graph (e.g. brand info)
    const kg = data.knowledgeGraph as Record<string, unknown> | undefined;
    if (kg) {
      if (!title && kg.title) title = String(kg.title);
      if (kg.description) parts.push(String(kg.description));
      if (!ogImage && kg.imageUrl) ogImage = String(kg.imageUrl);
    }

    // Organic results
    const organic = (data.organic as Record<string, unknown>[] | undefined) || [];
    for (const result of organic) {
      const link = String(result.link || "");
      // Prefer results matching the original URL domain
      const originalDomain = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
      const isMatch = link.includes(originalDomain) || link === url;

      if (isMatch) {
        if (!title && result.title) title = String(result.title);
        if (!metaDescription && result.snippet) metaDescription = String(result.snippet);
        if (result.snippet) parts.push(`From ${result.link}: ${result.snippet}`);
        // Rich snippet attributes (price, rating, etc.)
        const attributes = result.attributes as Record<string, string> | undefined;
        if (attributes) {
          const attrText = Object.entries(attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          parts.push(attrText);
        }
      } else if (result.snippet) {
        parts.push(String(result.snippet));
      }
    }

    // Shopping results that match
    const shopping = (data.shopping as Record<string, unknown>[] | undefined) || [];
    for (const item of shopping) {
      if (item.title) parts.push(`Product: ${item.title}, Price: ${item.price}, Rating: ${item.rating}`);
    }

    // Answer box
    const answerBox = data.answerBox as Record<string, unknown> | undefined;
    if (answerBox?.answer) parts.push(String(answerBox.answer));
    if (answerBox?.snippet) parts.push(String(answerBox.snippet));
  }

  return {
    title,
    text: parts.join("\n").slice(0, 8000),
    metaDescription,
    jsonLd: "",
    ogImage,
    url,
  };
}
