import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useAdSlot } from "@/hooks/useAdSlot";

interface AdSlotProps {
  slot: string;
  format?: "auto" | "rectangle" | "vertical" | "horizontal";
  className?: string;
  style?: React.CSSProperties;
}

export default function AdSlot({ slot, format = "auto", className, style }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;

  useAdSlot(insRef);

  if (!publisherId) return null;

  const responsiveStyle: React.CSSProperties =
    format === "auto"
      ? { display: "block", ...style }
      : format === "rectangle"
        ? { display: "inline-block", width: "300px", height: "250px", ...style }
        : format === "vertical"
          ? { display: "inline-block", width: "160px", height: "600px", ...style }
          : { display: "inline-block", width: "728px", height: "90px", ...style };

  return (
    <div className={cn("ad-container", className)}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={responsiveStyle}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format === "auto" ? "auto" : undefined}
        data-full-width-responsive={format === "auto" ? "true" : undefined}
      />
    </div>
  );
}
