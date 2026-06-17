"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import ResultsView from "@/components/ResultsView";
import type { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(submittedUrl: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: submittedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try another URL.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-xs font-bold text-zinc-950">S</span>
          </div>
          <span className="font-semibold text-zinc-100">Saver</span>
          <span className="text-zinc-500 text-sm ml-1">— find better for less</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4">
        {/* Hero */}
        {!result && !loading && (
          <div className="text-center mt-20 mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Stop overpaying.
              <br />
              <span className="text-emerald-400">Get the same thing for less.</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Paste any product URL. We&apos;ll find highly rated alternatives that cost less — and tell you exactly why they&apos;re just as good.
            </p>
          </div>
        )}

        {result && (
          <div className="mt-8 mb-6 text-center">
            <button
              onClick={() => { setResult(null); setError(null); setUrl(""); }}
              className="text-zinc-400 hover:text-zinc-200 text-sm flex items-center gap-1.5 mx-auto transition-colors"
            >
              ← Search again
            </button>
          </div>
        )}

        {/* Search */}
        <div className={`w-full max-w-2xl ${result ? "mb-8" : "mb-12"}`}>
          <SearchForm
            url={url}
            setUrl={setUrl}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>

        {error && (
          <div className="w-full max-w-2xl mb-8 bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {result && <ResultsView result={result} />}
      </div>

      <footer className="border-t border-zinc-800 py-6 text-center text-zinc-600 text-xs">
        Prices and availability may vary. Always verify before purchasing.
      </footer>
    </main>
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full max-w-5xl space-y-4 pb-12">
      <div className="shimmer h-4 w-48 rounded mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="shimmer h-40 rounded-xl" />
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="shimmer h-4 w-1/2 rounded" />
            <div className="shimmer h-8 w-1/3 rounded" />
          </div>
        ))}
      </div>
      <p className="text-zinc-500 text-sm text-center mt-6 animate-pulse">
        Searching for alternatives and comparing reviews…
      </p>
    </div>
  );
}
