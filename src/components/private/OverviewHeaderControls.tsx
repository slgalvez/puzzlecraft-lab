import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ShieldOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHAT_THEMES, getChatTheme, setChatTheme, getCustomColor, setCustomColor, type ChatThemeId } from "@/lib/chatTheme";
import { getFocusLossEnabled, setFocusLossEnabled } from "@/lib/focusLossSettings";

interface Props {
  token: string | null;
}

export function OverviewHeaderControls({ token }: Props) {
  const navigate = useNavigate();
  const [activeTheme, setActiveTheme] = useState<ChatThemeId>(getChatTheme);
  const [customHex, setCustomHex] = useState(getCustomColor);
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
    setActiveTheme("custom");
  }, []);

  const handlePrivacyTap = useCallback(() => {
    if (focusLoss) {
      // Privacy mode active — quick exit
      sessionStorage.removeItem("private_view_state");
      sessionStorage.removeItem("private_access_grant");
      navigate("/");
    } else {
      // Enable focus-loss protection and confirm
      if (token) setFocusLossEnabled(true, token);
      setFocusLoss(true);
    }
  }, [focusLoss, token, navigate]);

  const handlePrivacyLongPress = useCallback(() => {
    const next = !focusLoss;
    setFocusLoss(next);
    if (token) setFocusLossEnabled(next, token);
  }, [focusLoss, token]);

  // Long-press support
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const didLongPress = useRef(false);

  const onPointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      handlePrivacyLongPress();
    }, 600);
  }, [handlePrivacyLongPress]);

  const onPointerUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
    if (!didLongPress.current) handlePrivacyTap();
  }, [handlePrivacyTap]);

  const onPointerCancel = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  // Current theme color for the dot
  const currentHsl = activeTheme === "custom"
    ? undefined
    : CHAT_THEMES.find((t) => t.id === activeTheme)?.hue;

  return (
    <div className="flex items-center gap-1.5">
      {/* Theme color dot */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-secondary/30 transition-colors"
            title="Theme color"
          >
            <span
              className="h-3 w-3 rounded-full ring-1 ring-border/30"
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
        <PopoverContent align="end" className="w-44 p-2.5 space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Accent</p>
          <div className="flex flex-wrap gap-1.5">
            {CHAT_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => handlePreset(t.id)}
                className={`h-6 w-6 rounded-full transition-all ${activeTheme === t.id ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background scale-110" : "hover:scale-105"}`}
                style={{ background: `hsl(${t.hue})` }}
                title={t.label}
              />
            ))}
            <button
              onClick={() => colorRef.current?.click()}
              className={`h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground/50 hover:border-muted-foreground/60 transition-colors ${activeTheme === "custom" ? "ring-2 ring-foreground/60 ring-offset-1 ring-offset-background" : ""}`}
              style={activeTheme === "custom" ? { background: customHex } : undefined}
              title="Custom color"
            >
              {activeTheme !== "custom" && "+"}
            </button>
          </div>
          <input
            ref={colorRef}
            type="color"
            value={customHex}
            onChange={handleColorChange}
            className="sr-only"
          />
        </PopoverContent>
      </Popover>

      {/* Privacy quick toggle */}
      <button
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-secondary/30 transition-colors select-none"
        title={focusLoss ? "Privacy on — tap to exit" : "Privacy off — tap to exit, hold to enable"}
      >
        {focusLoss ? (
          <Shield size={13} className="text-primary" />
        ) : (
          <ShieldOff size={13} className="text-muted-foreground/40" />
        )}
      </button>
    </div>
  );
}
