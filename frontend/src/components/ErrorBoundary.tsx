import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Catches unexpected render errors anywhere below it so the whole app
// doesn't white-screen - shows a friendly message instead of a crash.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('PathFortune Finances: unexpected UI error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
              <AlertOctagon size={24} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Something went wrong</h2>
              <p className="text-xs text-slate-500 mt-1.5">
                PathFortune Finances ran into an unexpected problem displaying this page.
                Your data is safe - reloading usually fixes this.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all"
            >
              <RefreshCw size={14} />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
