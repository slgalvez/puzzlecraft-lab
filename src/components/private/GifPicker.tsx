import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GifResult {
  id: string;
  preview: string;
  full: string;
  title: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  token: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function GifPicker({ token, onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef("");

  const fetchGifs = useCallback(
    async (searchQuery: string, offset = 0) => {
      const isLoadMore = offset > 0;
      if (isLoadMore) setLoadingMore(true); else setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("gif-search", {
          body: { token, query: searchQuery || undefined, offset },
        });
        if (!error && data?.results) {
          if (isLoadMore) {
            setResults((prev) => [...prev, ...data.results]);
          } else {
            setResults(data.results);
          }
          setHasMore(data.results.length >= 20);
        }
      } catch {
        // silent
      } finally {
        if (isLoadMore) setLoadingMore(false); else setLoading(false);
        setSearched(true);
      }
    },
    [token]
  );

  // Load trending on mount
  useEffect(() => {
    fetchGifs("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [fetchGifs]);

  // Debounced search — reset results on new query
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      activeQueryRef.current = query;
      setResults([]);
      setHasMore(false);
      fetchGifs(query);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchGifs]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      fetchGifs(activeQueryRef.current, results.length);
    }
  }, [loadingMore, hasMore, results.length, fetchGifs]);

  return (
    <div className="border-t border-border bg-background animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 flex items-center gap-2 bg-secondary rounded-lg px-2.5 py-1.5">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoComplete="off"
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
      <div ref={scrollRef} onScroll={handleScroll} className="h-[260px] overflow-y-auto px-2 pb-2">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {searched ? "No GIFs found" : "Search for GIFs"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {results.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => onSelect(gif.full)}
                  className="relative overflow-hidden rounded-lg bg-secondary hover:ring-2 hover:ring-primary/40 transition-all active:scale-95"
                  style={{ aspectRatio: `${gif.width} / ${gif.height}` }}
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
            {loadingMore && (
              <div className="flex justify-center py-3">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>

      {/* GIPHY attribution */}
      <div className="px-3 pb-1.5 pt-0.5 flex justify-end">
        <span className="text-[9px] text-muted-foreground/60 tracking-wide uppercase">
          Powered by GIPHY
        </span>
      </div>
    </div>
  );
}
