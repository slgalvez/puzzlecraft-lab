import { useState, useRef, useEffect } from "react";
import { Pencil, X, Check } from "lucide-react";

interface NicknameEditorProps {
  contactProfileId: string;
  currentNickname: string | undefined;
  defaultName: string;
  onSave: (contactProfileId: string, nickname: string) => void;
  onRemove: (contactProfileId: string) => void;
}

/**
 * Inline nickname editor — a small pencil icon that opens a minimal inline edit field.
 * Used in conversation headers.
 */
export function NicknameEditor({
  contactProfileId,
  currentNickname,
  defaultName,
  onSave,
  onRemove,
}: NicknameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentNickname || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(currentNickname || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing, currentNickname]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== defaultName) {
      onSave(contactProfileId, trimmed);
    } else if (!trimmed && currentNickname) {
      onRemove(contactProfileId);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={defaultName}
          maxLength={100}
          className="bg-secondary/50 border border-border/50 rounded-md px-2 py-0.5 text-sm text-foreground w-36 outline-none focus:border-primary/50 transition-colors"
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSave}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Save nickname"
        >
          <Check size={13} />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setEditing(false)}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel"
        >
          <X size={13} />
        </button>
        {currentNickname && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onRemove(contactProfileId);
              setEditing(false);
            }}
            className="ml-1 text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/30 transition-colors"
      aria-label="Edit nickname"
      title={currentNickname ? `Nickname: ${currentNickname} (tap to edit)` : "Set a nickname"}
    >
      <Pencil size={11} />
    </button>
  );
}
