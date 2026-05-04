import { useEffect, useRef } from "react";

const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID as string | undefined;
let scriptLoaded = false;

function loadAdSenseScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (!publisherId) return Promise.reject(new Error("No AdSense publisher ID configured"));

  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-adsense="true"]')) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.crossOrigin = "anonymous";
    script.dataset.adsense = "true";
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load AdSense script"));
    document.head.appendChild(script);
  });
}

export function useAdSlot(insRef: React.RefObject<HTMLModElement | null>) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!publisherId || !insRef.current || pushedRef.current) return;

    loadAdSenseScript()
      .then(() => {
        if (!insRef.current || pushedRef.current) return;
        try {
          const w = window as any;
          if (w.adsbygoogle) {
            w.adsbygoogle.push({});
            pushedRef.current = true;
          }
        } catch {
          // AdBlock or AdSense blocked
        }
      })
      .catch(() => {
        // Silently fail if AdSense can't load
      });
  }, [insRef]);
}
