import { useState, useEffect, useCallback, useRef } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageViewerProps {
  src: string;
  /** All image URLs in the conversation, ordered by timeline */
  images?: string[];
  /** Index of the currently displayed image within `images` */
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewer({ src, images, initialIndex, onClose }: ImageViewerProps) {
  const allImages = images && images.length > 0 ? images : [src];
  const [index, setIndex] = useState(() => {
    if (initialIndex !== undefined && initialIndex >= 0 && initialIndex < allImages.length) return initialIndex;
    const found = allImages.indexOf(src);
    return found >= 0 ? found : 0;
  });

  const currentSrc = allImages[index] || src;
  const hasMultiple = allImages.length > 1;
  const canPrev = index > 0;
  const canNext = index < allImages.length - 1;

  // Swipe tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const swiping = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const goTo = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= allImages.length) return;
      setTransitioning(true);
      const dir = newIndex > index ? -1 : 1;
      setOffsetX(dir * window.innerWidth);
      // After the slide-out, switch image and slide-in
      setTimeout(() => {
        setIndex(newIndex);
        setOffsetX(dir * -window.innerWidth);
        // Force reflow then animate to center
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setOffsetX(0);
            setTimeout(() => setTransitioning(false), 200);
          });
        });
      }, 150);
    },
    [allImages.length, index]
  );

  const goPrev = useCallback(() => { if (canPrev) goTo(index - 1); }, [canPrev, goTo, index]);
  const goNext = useCallback(() => { if (canNext) goTo(index + 1); }, [canNext, goTo, index]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    },
    [onClose, goPrev, goNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  // Preload adjacent images
  useEffect(() => {
    const toPreload = [allImages[index - 1], allImages[index + 1]].filter(Boolean) as string[];
    toPreload.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [index, allImages]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (transitioning) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchDeltaX.current = 0;
    swiping.current = false;
  }, [transitioning]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (transitioning) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    // Only start swiping if horizontal movement dominates
    if (!swiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiping.current = true;
    }

    if (swiping.current) {
      e.preventDefault();
      // Add resistance at edges
      let clamped = dx;
      if ((!canPrev && dx > 0) || (!canNext && dx < 0)) {
        clamped = dx * 0.25;
      }
      touchDeltaX.current = dx;
      setOffsetX(clamped);
    }
  }, [transitioning, canPrev, canNext]);

  const handleTouchEnd = useCallback(() => {
    if (!swiping.current) return;
    const dx = touchDeltaX.current;
    const threshold = window.innerWidth * 0.2;

    if (dx < -threshold && canNext) {
      goNext();
    } else if (dx > threshold && canPrev) {
      goPrev();
    } else {
      // Snap back
      setOffsetX(0);
    }
    swiping.current = false;
  }, [canNext, canPrev, goNext, goPrev]);

  const handleDownload = async () => {
    try {
      const res = await fetch(currentSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.${blob.type.split("/")[1] || "jpg"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(currentSrc, "_blank");
    }
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-in fade-in duration-200"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm"
        >
          <Download size={16} />
          {isMobile ? "Save" : "Download"}
        </button>
        <div className="flex items-center gap-3">
          {hasMultiple && (
            <span className="text-white/50 text-xs tabular-nums">
              {index + 1} / {allImages.length}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-white/80 hover:text-white transition-colors p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Desktop arrow buttons */}
      {hasMultiple && !isMobile && (
        <>
          {canPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-sm"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {canNext && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors backdrop-blur-sm"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </>
      )}

      {/* Image with swipe offset */}
      <img
        src={currentSrc}
        alt="Enlarged view"
        className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg select-none"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping.current ? "none" : "transform 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
}
