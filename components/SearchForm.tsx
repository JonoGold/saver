"use client";

interface Props {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function SearchForm({ url, setUrl, onSubmit, loading }: Props) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl p-2 focus-within:border-emerald-500 transition-colors">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a product URL — Amazon, ASOS, John Lewis, anywhere…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          disabled={loading}
          required
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
        >
          {loading ? "Searching…" : "Find alternatives"}
        </button>
      </div>
    </form>
  );
}
