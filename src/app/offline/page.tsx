'use client';

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-[#DFD0B8]">
      <div className="mb-6 rounded-full bg-[#1A1F26] p-4 text-[#C19760]">
        <WifiOff size={48} />
      </div>
      <h1 className="mb-2 font-mono text-2xl font-bold">You are offline</h1>
      <p className="text-[#848B98]">
        EINHERJAR requires an active connection to ensure your training data is securely synced to the server.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 rounded bg-[#C19760] px-6 py-2 font-mono text-sm font-semibold text-[#161A20] transition-colors hover:bg-[#D4A972]"
      >
        RETRY CONNECTION
      </button>
    </div>
  );
}
