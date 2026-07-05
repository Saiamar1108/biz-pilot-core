import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthSubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="h-11 w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Please wait…
        </>
      ) : (
        children
      )}
    </Button>
  );
}
