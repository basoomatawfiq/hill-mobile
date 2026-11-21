import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let display = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(display) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        display = `${parsed.error}${parsed.path ? ` (${parsed.operationType}: ${parsed.path})` : ''}`;
      }
    } catch {
      // Keep plain message
    }
    return { hasError: true, message: display };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#120711] text-[#FAF7FA] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#1C0D1B] border border-white/10 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-semibold text-[#FAF7FA]">
              Something interrupted playback
            </h1>
            <p className="mt-2 text-sm text-[#C4B0C2] leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#941684] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Reload HILL MOBILE
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
