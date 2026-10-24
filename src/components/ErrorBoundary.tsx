import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-sm max-w-md mb-6">
            LabLens encountered an unexpected error while initializing. You can try refreshing or resetting local storage.
          </p>

          {this.state.error && (
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-left max-w-lg w-full mb-6 overflow-x-auto text-xs font-mono text-rose-300">
              <div className="font-bold text-rose-400 mb-1">{this.state.error.name}: {this.state.error.message}</div>
              {this.state.error.stack && (
                <div className="text-gray-500 whitespace-pre-wrap line-clamp-6">{this.state.error.stack}</div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear Cache & Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
