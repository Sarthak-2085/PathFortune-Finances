import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

// Shared error display for failed data fetches - distinguishes a genuine
// failure from the loading skeleton, so a backend hiccup doesn't look like
// the page is permanently "loading".
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Couldn't load this data",
  message = "There was a problem reaching the server. Please check your connection and try again.",
  onRetry
}) => {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center bg-white border border-rose-100 rounded-2xl shadow-xs space-y-3 max-w-md mx-auto my-8">
      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
        <AlertTriangle size={20} />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all"
        >
          <RefreshCw size={13} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
