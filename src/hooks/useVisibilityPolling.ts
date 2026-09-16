import { useCallback, useEffect, useRef } from 'react';
import { startVisibilityAwarePolling } from '../lib/refreshPolicy';

export function useVisibilityPolling(
  refresh: (signal: AbortSignal) => Promise<void>,
  intervalMs: number | null,
  enabled = true,
  runImmediately = false,
) {
  const refreshRef = useRef(refresh);
  const pollingRef = useRef<ReturnType<typeof startVisibilityAwarePolling> | null>(null);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    if (intervalMs === null) {
      if (!runImmediately) return;
      const controller = new AbortController();
      void refreshRef.current(controller.signal);
      return () => controller.abort();
    }
    const polling = startVisibilityAwarePolling({
      intervalMs,
      refresh: signal => refreshRef.current(signal),
    });
    pollingRef.current = polling;
    if (runImmediately) void polling.run();
    return () => {
      polling.stop();
      if (pollingRef.current === polling) pollingRef.current = null;
    };
  }, [enabled, intervalMs, runImmediately]);

  return useCallback(async () => {
    if (pollingRef.current) return pollingRef.current.run();
    const controller = new AbortController();
    return refreshRef.current(controller.signal);
  }, []);
}
