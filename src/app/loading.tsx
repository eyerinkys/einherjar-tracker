import { InsightEye } from '@/components/ui/InsightEye';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#161A20] text-[#DFD0B8]">
      {/* Top Animated Shimmer Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden bg-[#222831]">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-[#677D6A] to-transparent animate-pulse" />
      </div>

      <div className="flex flex-col items-center gap-6 p-8 text-center">
        {/* Pulsing Runic Eye Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="absolute size-20 rounded-full bg-[#677D6A]/20 animate-ping" />
          <InsightEye size={56} active={true} />
        </div>

        <div className="space-y-2">
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-[#DFD0B8]">
            LOADING LEDGER
          </h2>
          <p className="font-mono text-xs text-[#948979] tracking-wider animate-pulse">
            Accessing records…
          </p>
        </div>
      </div>
    </div>
  );
}
