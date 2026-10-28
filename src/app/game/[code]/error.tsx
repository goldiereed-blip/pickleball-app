'use client';

import { useEffect } from 'react';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log full details so the actual error is visible in browser devtools / server logs
    console.error('[GamePage] Client error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm w-full">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-800">Something went wrong</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-left">
          <p className="text-xs text-red-700 font-mono break-words whitespace-pre-wrap">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mt-1">ID: {error.digest}</p>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Try refreshing — if it keeps happening, the error above has been logged to the console.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold active:bg-primary-700"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-600"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
