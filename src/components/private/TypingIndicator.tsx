/** Animated typing indicator bubble — ephemeral, never stored as a message */
export function TypingIndicator() {
  return (
    <div className="flex justify-start px-1 mt-1.5">
      <div className="msg-bubble-theirs px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-[3px] h-[18px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-[7px] h-[7px] rounded-full bg-foreground/40 animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.8s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
