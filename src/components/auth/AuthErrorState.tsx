import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Trash2, Mail } from 'lucide-react';

interface AuthError {
  message: string;
  isTokenError: boolean;
}

interface AuthErrorStateProps {
  error: AuthError;
  onRetry: () => void;
  onGoHome: () => void;
}

export function AuthErrorState({ error, onRetry, onGoHome }: AuthErrorStateProps) {
  return (
    <>
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Sign in failed</h1>
        <p className="text-muted-foreground text-sm">
          {error.isTokenError 
            ? 'Your session token is invalid or expired.'
            : error.message}
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
        <h2 className="font-medium text-sm text-foreground">Try these steps:</h2>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="font-medium text-foreground">1.</span>
            Clear your session and try signing in again
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-foreground">2.</span>
            Try using a different browser or incognito mode
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-foreground">3.</span>
            Clear your browser cookies for this site
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onRetry} className="w-full gap-2">
          <Trash2 className="h-4 w-4" />
          Clear Session & Retry
        </Button>
        
        <Button variant="outline" onClick={onGoHome} className="w-full gap-2">
          <RefreshCw className="h-4 w-4" />
          Go to Home
        </Button>
        
        <a 
          href={`mailto:support@lovable.dev?subject=Auth%20Error&body=Error%20message:%20${encodeURIComponent(error.message)}`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
        >
          <Mail className="h-3 w-3" />
          Contact Support
        </a>
      </div>

      {error.message && (
        <details className="text-left">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Technical details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
            {error.message}
          </pre>
        </details>
      )}
    </>
  );
}
