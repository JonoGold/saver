import * as cheerio from "cheerio";

export interface ScrapedPage {
  title: string;
  text: string;
  metaDescription: string;
  jsonLd: string;
  ogImage: string | null;
  url: string;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
};

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const res = await fetch(url, {
    headers: HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise
  $("script:not([type='application/ld+json']), style, nav, footer, .nav, .footer, .cookie, .modal, iframe").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || null;

  // Extract JSON-LD structured data (often contains price, name, etc.)
  const jsonLdScripts: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    jsonLdScripts.push($(el).text());
  });

  // Get the main body text, prioritising product-relevant content
  const selectors = [
    '[data-component-type="s-search-result"]',
    "#dp", "#ppd", // Amazon product detail page
    ".product-detail", ".product-description", ".product-info",
    "main", "article", "#content", ".content",
  ];

  let bodyText = "";
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length) {
      bodyText = el.text().replace(/\s+/g, " ").trim();
      break;
    }
  }

  if (!bodyText) {
    bodyText = $("body").text().replace(/\s+/g, " ").trim();
  }

  // Cap text to avoid token bloat
  const truncatedText = bodyText.slice(0, 8000);

  return {
    title,
    text: truncatedText,
    metaDescription,
    jsonLd: jsonLdScripts.join("\n").slice(0, 4000),
    ogImage,
    url: res.url, // resolved URL after redirects
  };
}
