import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Zap } from "lucide-react";

const STAGES = [
  { label: "Initializing", duration: 800 },
  { label: "Scanning channels", duration: 2000 },
  { label: "Analyzing leads", duration: 2500 },
  { label: "Scoring & ranking", duration: 1500 },
  { label: "Finalizing", duration: 800 },
];

interface ScrapeProgressProps {
  progress: number; // 0-100
}

export default function ScrapeProgress({ progress }: ScrapeProgressProps) {
  const activeIndex = Math.min(
    Math.floor((progress / 100) * STAGES.length),
    STAGES.length - 1
  );

  return (
    <div className="bg-stone-900 text-stone-50 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Zap className="h-5 w-5 text-amber-400" />
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Zap className="h-5 w-5 text-amber-400" />
          </motion.div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Scraping in progress...</p>
          <p className="text-xs text-stone-400">{STAGES[activeIndex]?.label}</p>
        </div>
        <span className="text-xs font-mono text-stone-400">{Math.round(progress)}%</span>
      </div>

      {/* Main progress bar */}
      <div className="relative h-2 bg-stone-800 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        />
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["-100%", "400%"] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        />
      </div>

      {/* Stage pipeline */}
      <div className="flex items-center gap-2">
        {STAGES.map((stage, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={stage.label} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                ) : (
                  <Circle className="h-4 w-4 text-stone-600" />
                )}
                <span
                  className={`text-[9px] uppercase tracking-wider text-center leading-tight ${
                    isDone ? "text-emerald-400" : isActive ? "text-amber-400" : "text-stone-600"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="h-px flex-1 bg-stone-800 mt-[-8px]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
