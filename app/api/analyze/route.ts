import { NextRequest, NextResponse } from "next/server";
import { scrapePage } from "@/lib/scraper";
import { searchAlternatives } from "@/lib/search";
import { extractProductInfo, analyzeAlternatives } from "@/lib/claude";
import type { AnalysisResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Please enter a valid URL (including https://)." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only http and https URLs are supported." }, { status: 400 });
    }

    // Step 1: Scrape the product page
    let page;
    try {
      page = await scrapePage(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: `Could not load that page. It may block automated access. (${msg})` },
        { status: 422 }
      );
    }

    // Step 2: Extract product info with Claude
    const original = await extractProductInfo(page);

    if (!original.name || !original.category) {
      return NextResponse.json(
        { error: "Could not identify a product on that page. Try a direct product URL." },
        { status: 422 }
      );
    }

    // Step 3: Search for alternatives
    const searchQuery = `${original.category} ${original.brand ? "similar to " + original.brand : ""}`;
    const candidates = await searchAlternatives(searchQuery, original.price);

    // Step 4: AI analysis of alternatives
    const alternatives = await analyzeAlternatives(original, candidates);

    const topSavings = alternatives.length > 0
      ? Math.max(...alternatives.map((a) => a.savingsAmount))
      : 0;

    const result: AnalysisResult = {
      original,
      alternatives,
      totalPotentialSavings: topSavings,
      analysisNote: alternatives.length === 0
        ? "We couldn't find cheaper alternatives with high confidence. This may already be the best value option."
        : `Found ${alternatives.length} alternative${alternatives.length !== 1 ? "s" : ""} worth considering.`,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analysis error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
