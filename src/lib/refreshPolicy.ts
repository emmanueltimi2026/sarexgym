export const PORTAL_POLL_INTERVALS = {
  staffLive: 12_000,
  portal: 30_000,
  notifications: 45_000,
} as const;

const STAFF_LIVE_ROUTES = new Set([
  '/staff',
  '/staff/dashboard',
  '/staff/check-in',
  '/staff/attendance',
]);

const POLLED_PORTAL_ROUTES = [
  /^\/admin(?:$|\/(?:dashboard|members|membership-plans|plans|attendance|payments|staff|trainers|events|audit)(?:\/|$))/,
  /^\/staff\/(?:members|memberships|payments|events)(?:\/|$)/,
  /^\/member(?:$|\/(?:dashboard|membership|payments|attendance|check-in|events|workout)(?:\/|$))/,
  /^\/trainer(?:$|\/(?:dashboard|members|plans|workout-plans|progress)(?:\/|$))/,
];

export function getPortalPollInterval(pathname: string): number | null {
  if (STAFF_LIVE_ROUTES.has(pathname)) return PORTAL_POLL_INTERVALS.staffLive;
  return POLLED_PORTAL_ROUTES.some(pattern => pattern.test(pathname))
    ? PORTAL_POLL_INTERVALS.portal
    : null;
}

type RefreshTarget = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
type FocusTarget = Pick<Window, 'addEventListener' | 'removeEventListener' | 'setInterval' | 'clearInterval'>;

export function startVisibilityAwarePolling({
  refresh,
  intervalMs,
  onError,
  documentTarget = document,
  windowTarget = window,
}: {
  refresh: (signal: AbortSignal) => Promise<void>;
  intervalMs: number;
  onError?: (error: unknown) => void;
  documentTarget?: RefreshTarget;
  windowTarget?: FocusTarget;
}) {
  let activeController: AbortController | null = null;
  let stopped = false;

  const run = async () => {
    if (stopped || documentTarget.visibilityState === 'hidden' || activeController) return;
    activeController = new AbortController();
    try {
      await refresh(activeController.signal);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) onError?.(error);
    } finally {
      activeController = null;
    }
  };

  const refreshWhenActive = () => {
    if (documentTarget.visibilityState === 'visible') void run();
  };

  const timer = windowTarget.setInterval(() => void run(), intervalMs);
  windowTarget.addEventListener('focus', refreshWhenActive);
  documentTarget.addEventListener('visibilitychange', refreshWhenActive);

  return {
    run,
    stop() {
      stopped = true;
      activeController?.abort();
      windowTarget.clearInterval(timer);
      windowTarget.removeEventListener('focus', refreshWhenActive);
      documentTarget.removeEventListener('visibilitychange', refreshWhenActive);
    },
  };
}

export async function mutateAndRefresh<T>(mutation: () => Promise<T>, refresh: () => Promise<void>) {
  const result = await mutation();
  await refresh();
  return result;
}
