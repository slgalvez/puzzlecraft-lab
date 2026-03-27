import { useState, useRef, useCallback } from "react";
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
  const colorRef = useRef<HTMLInputElement>(null);

  const handlePreset = useCallback((id: ChatThemeId) => {
    setChatTheme(id);
    setActiveTheme(id);
  }, []);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomHex(hex);
    setCustomColor(hex);
    setSavedColors(getSavedColors());
    setActiveTheme("custom");
  }, []);

  const handlePrivacyToggle = useCallback((checked: boolean) => {
    setFocusLoss(checked);
    if (token) setFocusLossEnabled(checked, token);
  }, [token]);

  // Current theme color for the dot
  const currentHsl = activeTheme === "custom"
    ? undefined
    : CHAT_THEMES.find((t) => t.id === activeTheme)?.hue;

  return (
    <div className="flex items-center gap-2">
      {/* Theme color dot */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/30 active:bg-secondary/40 transition-colors"
            title="Theme color"
          >
            <span
              className="h-4 w-4 rounded-full ring-1 ring-border/30"
              style={{
                background: activeTheme === "custom"
                  ? customHex
                  : currentHsl
                    ? `hsl(${currentHsl})`
                    : "hsl(var(--primary))",
              }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-3 space-y-2.5">
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Accent</p>
          <div className="flex flex-wrap gap-2">
            {CHAT_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handlePreset(t.id)}
                className={`h-8 w-8 rounded-full transition-all ${activeTheme === t.id ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background scale-110" : "hover:scale-105 active:scale-95"}`}
                style={{ background: `hsl(${t.hue})` }}
                title={t.label}
              />
            ))}
            <button
              onClick={() => colorRef.current?.click()}
              className={`h-8 w-8 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground/50 hover:border-muted-foreground/60 active:scale-95 transition-all ${activeTheme === "custom" ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background" : ""}`}
              style={activeTheme === "custom" ? { background: customHex } : undefined}
              title="Custom color"
            >
              {activeTheme !== "custom" && "+"}
            </button>
          </div>
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
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-background text-[8px] text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <input
            ref={colorRef}
            type="color"
            value={customHex}
            onChange={handleColorChange}
            className="sr-only"
          />
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