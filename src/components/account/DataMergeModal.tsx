import { useUserAccount } from "@/contexts/UserAccountContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Merge, CloudDownload } from "lucide-react";
import { useState } from "react";

export default function DataMergeModal() {
  const { pendingMerge, resolveMerge } = useUserAccount();
  const [resolving, setResolving] = useState(false);

  const handle = async (strategy: "merge" | "keep-account") => {
    setResolving(true);
    await resolveMerge(strategy);
    setResolving(false);
  };

  return (
    <Dialog open={pendingMerge}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display">Save your progress?</DialogTitle>
          <DialogDescription>
            You have puzzle progress on this device. Would you like to merge it with your account or keep your account data only?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={() => handle("merge")} disabled={resolving} className="justify-start gap-2">
            <Merge size={16} />
            Merge local data into account
          </Button>
          <Button variant="outline" onClick={() => handle("keep-account")} disabled={resolving} className="justify-start gap-2">
            <CloudDownload size={16} />
            Keep account data only
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
