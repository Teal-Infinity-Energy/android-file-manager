import { Loader2 } from 'lucide-react';

export function AuthLoadingState() {
  return (
    <>
      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Signing you in...</h1>
        <p className="text-muted-foreground text-sm">Please wait while we complete authentication.</p>
      </div>
    </>
  );
}
