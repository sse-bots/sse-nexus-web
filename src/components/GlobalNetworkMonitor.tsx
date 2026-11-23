"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const TIMEOUT_MS = 18_000; // Redirect to /service-unavailable (503) if an API request hangs > 18s

export function GlobalNetworkMonitor() {
  const [activeRequests, setActiveRequests] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const origFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const isInternalApi = url.startsWith("/api/");
      if (!isInternalApi) {
        return origFetch(input, init);
      }

      setActiveRequests((c) => c + 1);
      const controller = new AbortController();
      const timer = window.setTimeout(() => {
        controller.abort();
      }, TIMEOUT_MS);

      try {
        const res = await origFetch(input, {
          ...init,
          signal: init?.signal ?? controller.signal,
        });
        if (res.status === 503 && pathname !== "/service-unavailable") {
          router.push("/service-unavailable");
        }
        return res;
      } catch (err) {
        if (
          (err as Error)?.name === "AbortError" &&
          pathname !== "/service-unavailable"
        ) {
          router.push("/service-unavailable");
        }
        throw err;
      } finally {
        window.clearTimeout(timer);
        setActiveRequests((c) => Math.max(0, c - 1));
      }
    };

    return () => {
      window.fetch = origFetch;
    };
  }, [pathname, router]);

  if (activeRequests === 0) return null;

  return (
    <>
      {/* Top slim indeterminate progress bar */}
      <div className="fixed left-0 right-0 top-0 z-[70] h-1 overflow-hidden bg-slate-900/90">
        <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] bg-indigo-500" />
      </div>

      {/* Subtle floating status pill above bottom dock */}
      <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-[#0d111a]/95 px-3.5 py-1.5 text-xs font-medium text-slate-200 shadow-xl backdrop-blur-md">
          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
          <span>Syncing data...</span>
        </div>
      </div>
    </>
  );
}
