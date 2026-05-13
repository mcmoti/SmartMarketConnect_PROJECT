import React, { ErrorInfo, ReactNode } from "react";
import { Copy, AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleCopy = () => {
    const errorDetails = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorDetails);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
          <div className="max-w-2xl w-full bg-card p-8 rounded-xl shadow-elevated border border-border">
            <div className="flex items-center gap-3 mb-6 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              <h1 className="text-2xl font-bold font-display">Something went wrong</h1>
            </div>
            
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred in this view. We've caught the error to safely keep the rest of your app running.
            </p>

            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-border mb-6">
              <p className="text-destructive font-semibold mb-2">{this.state.error?.toString()}</p>
              <pre className="text-muted-foreground whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleCopy}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Error Details
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
