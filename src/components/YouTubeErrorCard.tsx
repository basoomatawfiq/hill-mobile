import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface YouTubeErrorCardProps {
  error: string;
  onRetry: () => void;
}

export const YouTubeErrorCard: React.FC<YouTubeErrorCardProps> = ({ error, onRetry }) => {
  const isPermission403 =
    error.includes('(403)') || error.toLowerCase().includes('permission denied');
  const isQuota = error.toLowerCase().includes('quota');

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-[#1C0D1B] p-6 sm:p-8 space-y-4">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-[#FAF7FA]">{error}</p>
      </div>

      {isPermission403 && !isQuota && (
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-[#120711] p-4 text-left text-xs text-[#C4B0C2] space-y-2">
          <p className="font-semibold text-[#EA6C20]">
            How to fix Google Cloud 403 Permission Denied:
          </p>
          <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
            <li>
              Open <strong className="text-[#FAF7FA]">Google Cloud Console</strong> and select the
              exact project where your <code className="font-mono text-[#FAF7FA]">YOUTUBE_API_KEY</code> was created.
            </li>
            <li>
              Go to <strong className="text-[#FAF7FA]">APIs &amp; Services → Library</strong>,
              search for <strong className="text-[#FAF7FA]">YouTube Data API v3</strong>, and click{' '}
              <strong className="text-[#FAF7FA]">Enable</strong>.
            </li>
            <li>
              Go to <strong className="text-[#FAF7FA]">APIs &amp; Services → Credentials</strong>,
              open your API key, set <strong className="text-[#FAF7FA]">Application restrictions</strong> to{' '}
              <strong className="text-[#FAF7FA]">None</strong> (the key runs securely on the server, not in the browser), and under{' '}
              <strong className="text-[#FAF7FA]">API restrictions</strong> allow{' '}
              <strong className="text-[#FAF7FA]">YouTube Data API v3</strong>.
            </li>
            <li>
              Make sure you pasted that key into the <strong className="text-[#FAF7FA]">AI Studio Secrets</strong> panel as{' '}
              <code className="font-mono text-[#FAF7FA]">YOUTUBE_API_KEY</code> (not a Gemini or Firebase key), then click Retry.
            </li>
          </ol>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-5 py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-[#941684] transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};
