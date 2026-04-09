/**
 * AddFriendsSheet.tsx — Bottom sheet for searching and adding friends.
 */
import { useState } from "react";
import { Copy, Search, UserPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFriends } from "@/hooks/useFriends";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function AddFriendsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    myFriendCode, sendRequest, search, searchResults, searchLoading, searchError, clearSearch
  } = useFriends();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleCopy = async () => {
    if (!myFriendCode) return;
    await navigator.clipboard.writeText(myFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = () => {
    search(input.trim());
  };

  const handleSend = async (userId: string) => {
    try {
      await sendRequest.mutateAsync(userId);
      setSentIds(prev => new Set(prev).add(userId));
    } catch {}
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); clearSearch(); setInput(""); setSentIds(new Set()); } }}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg font-bold">Add Friends</SheetTitle>
        </SheetHeader>

        {myFriendCode && (
          <div className="rounded-xl border bg-card p-4 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Your Friend Code</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-foreground tracking-wider flex-1">{myFriendCode}</span>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Share this code so friends can find you</p>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by name or friend code (PC-...)"
              className="w-full rounded-lg border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button onClick={handleSearch} disabled={!input.trim() || searchLoading} size="sm" className="shrink-0">
            {searchLoading ? <Loader2 size={14} className="animate-spin" /> : "Search"}
          </Button>
        </div>

        {searchError && <p className="text-sm text-destructive mb-3">{searchError}</p>}

        {searchResults.length > 0 && (
          <div className="rounded-xl border bg-card divide-y divide-border/40">
            {searchResults.map((user) => {
              const wasSent = sentIds.has(user.id);
              return (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                    {user.friendCode && (
                      <p className="text-[10px] font-mono text-muted-foreground">{user.friendCode}</p>
                    )}
                  </div>
                  {wasSent ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check size={12} /> Sent
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(user.id)}
                      disabled={sendRequest.isPending}
                      className="gap-1 shrink-0"
                    >
                      <UserPlus size={12} /> Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!searchLoading && searchResults.length === 0 && input.trim().length >= 2 && !searchError && (
          <p className="text-sm text-muted-foreground text-center py-6">No users found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
