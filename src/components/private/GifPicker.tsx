import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
  dims: [number, number];
}

interface GifPickerProps {
  token: string;
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export function GifPicker({ token, onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: err } = await supabase.functions.invoke("gif-search", {
        body: {
          action: q ? "search" : "trending",
          token,
          query: q || undefined,
          limit: 20,
        },
      });
      if (err || data?.error) {
        setError(true);
        return;
      }
      setResults(data.results || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load trending on open
  useEffect(() => {
    search("");
    inputRef.current?.focus();
  }, [search]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  return (
    <div className="border-t border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <div className="flex-1 flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Grid */}
      <div className="h-[240px] overflow-y-auto overscroll-contain p-2">
        {loading && results.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="text-muted-foreground animate-spin" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">GIFs unavailable</p>
          </div>
        )}
        {!loading && !error && results.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">No GIFs found</p>
          </div>
        )}
        {results.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {results.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="aspect-square rounded-lg overflow-hidden bg-secondary hover:ring-2 hover:ring-primary transition-all active:scale-95"
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tenor attribution */}
      <div className="px-3 py-1 border-t border-border">
        <p className="text-[9px] text-muted-foreground/50 text-right">Powered by Tenor</p>
      </div>
    </div>
  );
}
