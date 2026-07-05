import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, FileText, Users, Pencil } from "lucide-react";

const WELCOME_MODAL_KEY = "sp_welcome_seen";

export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_MODAL_KEY) === "true";
}

export function markWelcomeSeen(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(WELCOME_MODAL_KEY, "true");
  }
}

export function WelcomeModal({
  open,
  onExplore,
  onGotIt,
}: {
  open: boolean;
  onExplore: () => void;
  onGotIt: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onGotIt();
      }}
    >
      <DialogContent className="sm:max-w-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2 duration-300">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 grid h-16 w-16 place-items-center rounded-2xl bg-primary shadow-glow">
          <Sparkles className="h-8 w-8 text-primary-foreground" />
        </div>
        <DialogHeader className="pt-8">
          <DialogTitle className="text-center text-2xl font-display font-bold">
            Your demo store is ready
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed pt-2">
            Your demo store is ready - we&apos;ve added sample products, customers, and invoices so
            you can explore everything instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-2">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <span className="font-medium">Add your own products and customers</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Replace sample data with your real inventory and client list.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <span className="font-medium">Edit or delete sample data anytime</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                All demo records are fully editable and removable.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <span className="font-medium">Create invoices and test workflows freely</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try billing, inventory, analytics, and AI features risk-free.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-center pt-2">
          <Button
            type="button"
            onClick={onExplore}
            className="gradient-primary text-primary-foreground shadow-glow min-w-[160px]"
          >
            Explore Dashboard
          </Button>
          <Button type="button" variant="outline" onClick={onGotIt} className="min-w-[120px]">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
