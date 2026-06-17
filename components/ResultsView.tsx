"use client";

import type { AnalysisResult, Alternative } from "@/lib/types";

interface Props {
  result: AnalysisResult;
}

export default function ResultsView({ result }: Props) {
  const { original, alternatives, analysisNote } = result;
  const currencySymbol = original.currency === "GBP" ? "£" : original.currency === "EUR" ? "€" : "$";

  return (
    <div className="w-full max-w-5xl pb-16">
      {/* Original product */}
      <div className="mb-8 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex gap-4 items-start">
        {original.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={original.imageUrl}
            alt={original.name}
            className="w-16 h-16 object-cover rounded-xl flex-shrink-0 bg-zinc-800"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">{original.retailer} · You were looking at</p>
          <h2 className="font-semibold text-zinc-100 truncate">{original.name}</h2>
          <p className="text-zinc-400 text-sm mt-0.5 line-clamp-2">{original.description}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          {original.price ? (
            <span className="text-xl font-bold text-zinc-100">{currencySymbol}{original.price.toFixed(2)}</span>
          ) : (
            <span className="text-zinc-500 text-sm">Price unknown</span>
          )}
        </div>
      </div>

      {/* Summary banner */}
      {alternatives.length > 0 && original.price && (
        <div className="mb-8 bg-emerald-950/50 border border-emerald-800/50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💸</span>
          </div>
          <div>
            <p className="font-semibold text-emerald-300">
              You could save up to {currencySymbol}{result.totalPotentialSavings.toFixed(2)}
            </p>
            <p className="text-emerald-600 text-sm">{analysisNote}</p>
          </div>
        </div>
      )}

      {alternatives.length === 0 && (
        <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-400 text-sm">
          {analysisNote}
        </div>
      )}

      {/* Alternative cards */}
      {alternatives.length > 0 && (
        <>
          <h3 className="text-zinc-400 text-sm uppercase tracking-widest mb-4">Better alternatives</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {alternatives.map((alt, i) => (
              <AlternativeCard key={i} alt={alt} original={{ price: original.price, currency: original.currency }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AlternativeCard({
  alt,
  original,
}: {
  alt: Alternative;
  original: { price: number | null; currency: string };
}) {
  const currencySymbol = (alt.currency || original.currency) === "GBP" ? "£" : (alt.currency || original.currency) === "EUR" ? "€" : "$";

  return (
    <a
      href={alt.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-700 rounded-2xl overflow-hidden flex flex-col transition-colors"
    >
      {/* Image */}
      <div className="h-48 bg-zinc-800 relative overflow-hidden flex items-center justify-center">
        {alt.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={alt.imageUrl}
            alt={alt.name}
            className="object-contain w-full h-full p-3"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-16 h-16 bg-zinc-700 rounded-xl" />
        )}
        {alt.savingsPercent > 0 && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-zinc-950 text-xs font-bold px-2 py-1 rounded-lg">
            -{alt.savingsPercent}%
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Retailer + rating */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">{alt.retailer}</span>
          {alt.rating > 0 && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <span className="text-amber-400">★</span>
              {alt.rating.toFixed(1)}
              {alt.reviewCount > 0 && <span className="text-zinc-600">({alt.reviewCount.toLocaleString()})</span>}
            </span>
          )}
        </div>

        {/* Name */}
        <h4 className="font-medium text-zinc-100 text-sm line-clamp-2 mb-3 group-hover:text-emerald-300 transition-colors">
          {alt.name}
        </h4>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-emerald-400">{currencySymbol}{alt.price.toFixed(2)}</span>
          {original.price && alt.savingsAmount > 0 && (
            <span className="text-zinc-500 text-sm line-through">{currencySymbol}{original.price.toFixed(2)}</span>
          )}
        </div>

        {/* Why just as good */}
        <div className="bg-zinc-800/50 rounded-xl p-3 mb-4 flex-1">
          <p className="text-xs text-zinc-300 leading-relaxed">{alt.whyJustAsGood}</p>
        </div>

        {/* Key highlights */}
        {alt.keyHighlights.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {alt.keyHighlights.map((h, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                {h}
              </li>
            ))}
          </ul>
        )}

        {/* Verdict */}
        <div className="border-t border-zinc-800 pt-3 mt-auto">
          <p className="text-xs text-emerald-400 font-medium">{alt.verdict}</p>
        </div>

        {/* CTA */}
        <div className="mt-3 text-center text-xs text-zinc-500 group-hover:text-emerald-500 transition-colors">
          View deal →
        </div>
      </div>
    </a>
  );
}
