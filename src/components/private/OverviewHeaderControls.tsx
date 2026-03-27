import { useState, useRef, useCallback, useEffect } from "react";
import { Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CHAT_THEMES, getChatTheme, setChatTheme, getCustomColor, setCustomColor, getSavedColors, removeSavedColor, type ChatThemeId } from "@/lib/chatTheme";
import { getFocusLossEnabled, setFocusLossEnabled } from "@/lib/focusLossSettings";

interface Props {
  token: string | null;
}

export function OverviewHeaderControls({ token }: Props) {
  const [activeTheme, setActiveTheme] = useState<ChatThemeId>(getChatTheme);
  const [customHex, setCustomHex] = useState(getCustomColor);
  const [savedColors, setSavedColors] = useState(getSavedColors);
  const [focusLoss, setFocusLoss] = useState(getFocusLossEnabled);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewHex, setPreviewHex] = useState(getCustomColor);
  const [isDirty, setIsDirty] = useState(false);
  const colorRef = useRef<HTMLInputElement>(null);
  // Store the theme before opening picker so Cancel can revert
  const preOpenThemeRef = useRef<ChatThemeId>(activeTheme);
  const preOpenHexRef = useRef(customHex);

  const handlePreset = useCallback((id: ChatThemeId) => {
    setChatTheme(id);
    setActiveTheme(id);
    setIsDirty(false);
    setPickerOpen(false);
  }, []);

  // Color input change — preview only, don't save
  const handleColorInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setPreviewHex(hex);
    setIsDirty(true);
    // Live-preview the color on the CSS variable without saving
    document.documentElement.style.setProperty("--primary", hexToHsl(hex));
  }, []);

  // Save the previewed custom color
  const handleSaveCustom = useCallback(() => {
    setCustomColor(previewHex);
    setCustomHex(previewHex);
    setSavedColors(getSavedColors());
    setActiveTheme("custom");
    setIsDirty(false);
  }, [previewHex]);

  // Cancel — revert to what was active before picker opened
  const handleCancelCustom = useCallback(() => {
    setIsDirty(false);
    setPreviewHex(preOpenHexRef.current);
    // Revert CSS
    if (preOpenThemeRef.current === "custom") {
      document.documentElement.style.setProperty("--primary", hexToHsl(preOpenHexRef.current));
    } else {
      const theme = CHAT_THEMES.find((t) => t.id === preOpenThemeRef.current);
      if (theme) document.documentElement.style.setProperty("--primary", theme.hue);
    }
  }, []);

  const handlePrivacyToggle = useCallback((checked: boolean) => {
    setFocusLoss(checked);
    if (token) setFocusLossEnabled(checked, token);
  }, [token]);

  // When popover opens, snapshot current state for cancel
  const handlePopoverOpen = useCallback((open: boolean) => {
    if (open) {
      preOpenThemeRef.current = activeTheme;
      preOpenHexRef.current = customHex;
      setPreviewHex(customHex);
      setIsDirty(false);
    } else if (isDirty) {
      // Closing without saving — revert
      handleCancelCustom();
    }
  }, [activeTheme, customHex, isDirty, handleCancelCustom]);

  // Open native color picker
  const openColorPicker = useCallback(() => {
    setPickerOpen(true);
    // Small delay to ensure the input is in the DOM
    setTimeout(() => colorRef.current?.click(), 50);
  }, []);

  // Current theme color for the dot
  const currentHsl = activeTheme === "custom"
    ? undefined
    : CHAT_THEMES.find((t) => t.id === activeTheme)?.hue;

  const dotColor = isDirty
    ? previewHex
    : activeTheme === "custom"
      ? customHex
      : currentHsl
        ? `hsl(${currentHsl})`
        : "hsl(var(--primary))";

  return (
    <div className="flex items-center gap-2">
      {/* Theme color dot */}
      <Popover onOpenChange={handlePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/30 active:bg-secondary/40 transition-colors"
            title="Theme color"
          >
            <span
              className="h-4 w-4 rounded-full ring-1 ring-border/30"
              style={{ background: dotColor }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-3 space-y-2.5" style={{ zIndex: 9999 }}>
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Accent</p>
          <div className="flex flex-wrap gap-2">
            {CHAT_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handlePreset(t.id)}
                className={`h-8 w-8 rounded-full transition-all ${activeTheme === t.id && !isDirty ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background scale-110" : "hover:scale-105 active:scale-95"}`}
                style={{ background: `hsl(${t.hue})` }}
                title={t.label}
              />
            ))}
            {/* Custom color button — opens native picker inline */}
            <button
              onClick={openColorPicker}
              className={`h-8 w-8 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground/50 hover:border-muted-foreground/60 active:scale-95 transition-all ${activeTheme === "custom" && !isDirty ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background" : ""}`}
              style={activeTheme === "custom" ? { background: customHex } : undefined}
              title="Custom color"
            >
              {activeTheme !== "custom" && "+"}
            </button>
          </div>

          {/* Inline color picker area */}
          {pickerOpen && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={colorRef}
                  type="color"
                  value={previewHex}
                  onChange={handleColorInput}
                  className="h-8 w-8 rounded-md border-0 p-0 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
                />
                <span className="text-[11px] text-muted-foreground/60 font-mono flex-1">{previewHex}</span>
              </div>
              {isDirty && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSaveCustom}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 active:scale-[0.97] transition-all"
                  >
                    <Check size={12} /> Save
                  </button>
                  <button
                    onClick={() => { handleCancelCustom(); setPickerOpen(false); }}
                    className="flex items-center justify-center p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/30 transition-colors"
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {savedColors.length > 0 && (
            <>
              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Saved</p>
              <div className="flex flex-wrap gap-2">
                {savedColors.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => {
                      setCustomHex(hex);
                      setCustomColor(hex);
                      setActiveTheme("custom");
                      setIsDirty(false);
                      setPickerOpen(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      removeSavedColor(hex);
                      setSavedColors(getSavedColors());
                    }}
                    className={`h-7 w-7 rounded-full transition-all relative group ${activeTheme === "custom" && customHex.toLowerCase() === hex.toLowerCase() ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background scale-110" : "hover:scale-105 active:scale-95"}`}
                    style={{ background: hex }}
                    title="Tap to use · right-click to remove"
                  >
                    <span
                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-background text-[8px] text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); removeSavedColor(hex); setSavedColors(getSavedColors()); }}
                    >×</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Privacy switch */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground/50">Privacy</span>
        <Switch
          checked={focusLoss}
          onCheckedChange={handlePrivacyToggle}
          className="scale-75"
          title={focusLoss ? "Privacy protection on" : "Privacy protection off"}
        />
      </div>
    </div>
  );
}

/** Convert hex (#rrggbb) to HSL string "h s% l%" */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
