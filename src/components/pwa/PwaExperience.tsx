import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCw, Share, WifiOff, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PwaContextValue = {
  canInstall: boolean;
  isIos: boolean;
  installed: boolean;
  openInstall: () => void;
};

const PwaContext = createContext<PwaContextValue | null>(null);
const DISMISSED_UNTIL_KEY = 'sarex.pwa.install-dismissed-until';
const LAST_VISIT_KEY = 'sarex.pwa.last-visit';
const VISIT_COUNT_KEY = 'sarex.pwa.visit-count';
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

const isIosDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandaloneApp = () => window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

const dismissedForNow = () => {
  try {
    const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
    return dismissedUntil > Date.now();
  } catch {
    return false;
  }
};

const recordVisitAndShouldNudge = () => {
  try {
    const now = Date.now();
    const lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);
    let visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || 0);
    if (!lastVisit || now - lastVisit >= 24 * 60 * 60 * 1000) {
      visits += 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(visits));
      localStorage.setItem(LAST_VISIT_KEY, String(now));
    }
    return visits >= 2;
  } catch {
    return false;
  }
};

export const usePwaInstall = () => useContext(PwaContext);

export const PwaInstallAction: React.FC<{ className?: string; onClick?: () => void }> = ({ className = '', onClick }) => {
  const pwa = usePwaInstall();
  if (!pwa || pwa.installed || (!pwa.canInstall && !pwa.isIos)) return null;

  return (
    <button type="button" onClick={() => { pwa.openInstall(); onClick?.(); }} className={className}>
      <Download className="h-4 w-4" aria-hidden="true" />
      <span>Install App</span>
    </button>
  );
};

export const PwaExperience: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showInstallNudge, setShowInstallNudge] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnlineNotice, setShowOnlineNotice] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const activateUpdateRef = useRef(false);
  const onlineNoticeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const appleDevice = isIosDevice();
    const standalone = isStandaloneApp();
    const shouldNudge = recordVisitAndShouldNudge();
    setIsIos(appleDevice);
    setInstalled(standalone);
    setShowInstallNudge(!standalone && shouldNudge && !dismissedForNow());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as InstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setInstalled(isStandaloneApp());
      if (!isStandaloneApp() && !dismissedForNow() && shouldNudge) setShowInstallNudge(true);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowInstallNudge(false);
      setShowIosGuide(false);
    };
    const onDisplayModeChange = () => setInstalled(isStandaloneApp());

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    const displayMode = window.matchMedia('(display-mode: standalone)');
    displayMode.addEventListener('change', onDisplayModeChange);

    let active = true;
    if ('serviceWorker' in navigator) {
      const buildId = typeof __SAREX_BUILD_ID__ === 'string' ? __SAREX_BUILD_ID__ : 'dev';
      navigator.serviceWorker.register(`/service-worker.js?build=${encodeURIComponent(buildId)}`, { scope: '/' })
        .then((nextRegistration) => {
          if (!active) return;
          setRegistration(nextRegistration);
          if (nextRegistration.waiting && navigator.serviceWorker.controller) setUpdateReady(true);

          nextRegistration.addEventListener('updatefound', () => {
            const installing = nextRegistration.installing;
            installing?.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(true);
            });
          });

          const updateWhenVisible = () => {
            if (document.visibilityState === 'visible') void nextRegistration.update().catch(() => undefined);
          };
          document.addEventListener('visibilitychange', updateWhenVisible);
          nextRegistration.update().catch(() => undefined);
        })
        .catch(() => undefined);
    }

    const onControllerChange = () => {
      if (activateUpdateRef.current) window.location.reload();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);

    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      displayMode.removeEventListener('change', onDisplayModeChange);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => {
    const onOffline = () => {
      setIsOffline(true);
      setShowOnlineNotice(false);
    };
    const onOnline = () => {
      setIsOffline(false);
      setShowOnlineNotice(true);
      window.clearTimeout(onlineNoticeTimer.current);
      onlineNoticeTimer.current = window.setTimeout(() => setShowOnlineNotice(false), 3500);
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.clearTimeout(onlineNoticeTimer.current);
    };
  }, []);

  const dismissNudge = useCallback(() => {
    setShowInstallNudge(false);
    try { localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_FOR_MS)); } catch { /* Storage can be disabled. */ }
  }, []);

  const openInstall = useCallback(() => {
    if (installed) return;
    if (isIos) {
      setShowIosGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    void deferredPrompt.prompt().then(async () => {
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') setShowInstallNudge(false);
      else dismissNudge();
      setDeferredPrompt(null);
    }).catch(() => setDeferredPrompt(null));
  }, [deferredPrompt, dismissNudge, installed, isIos]);

  const activateUpdate = () => {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) return;
    activateUpdateRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  const closeIosGuide = () => {
    setShowIosGuide(false);
    dismissNudge();
  };

  const contextValue = useMemo(() => ({ canInstall: Boolean(deferredPrompt), isIos, installed, openInstall }), [deferredPrompt, isIos, installed, openInstall]);

  return (
    <PwaContext.Provider value={contextValue}>
      {children}
      {isOffline && (
        <div role="status" className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-[#151515] px-4 py-3 text-sm text-white shadow-2xl sm:inset-x-auto sm:left-4 sm:mx-0">
          <WifiOff className="h-4 w-4 shrink-0 text-[#EF1B23]" aria-hidden="true" />
          <span><strong className="font-bold">You’re offline.</strong> Live account features need internet.</span>
        </div>
      )}
      {!isOffline && showOnlineNotice && (
        <div role="status" className="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" /> Back online
        </div>
      )}
      {showInstallNudge && !installed && (
        <aside aria-label="Install SAREX" className="fixed inset-x-3 bottom-16 z-[90] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-[#151515] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5">
          <img src="/icons/icon-192.png" width="44" height="44" alt="" className="h-11 w-11 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Install SAREX</p>
            <p className="mt-0.5 text-xs text-gray-600">Quick access to your membership and workouts.</p>
          </div>
          <button type="button" onClick={openInstall} className="rounded-lg bg-[#EF1B23] px-3 py-2 text-xs font-bold text-white hover:bg-red-700">
            {isIos ? 'How to install' : 'Install App'}
          </button>
          <button type="button" onClick={dismissNudge} aria-label="Not now" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"><X className="h-4 w-4" /></button>
        </aside>
      )}
      {updateReady && (
        <aside role="status" className="fixed inset-x-3 bottom-3 z-[95] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-[#151515] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5">
          <RefreshCw className="h-5 w-5 shrink-0 text-[#EF1B23]" aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="font-bold">A new version is ready</p><p className="text-xs text-gray-600">Update SAREX when you’re ready.</p></div>
          <button type="button" onClick={activateUpdate} className="rounded-lg bg-[#EF1B23] px-3 py-2 text-xs font-bold text-white hover:bg-red-700">Update</button>
        </aside>
      )}
      {showIosGuide && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onMouseDown={event => { if (event.target === event.currentTarget) closeIosGuide(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="ios-install-title" className="w-full max-w-md rounded-3xl bg-white p-6 text-[#151515] shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#EF1B23]">SAREX Fitness Clinic</p><h2 id="ios-install-title" className="mt-2 text-xl font-extrabold">Install SAREX on your iPhone</h2></div>
              <button type="button" aria-label="Close installation instructions" onClick={closeIosGuide} className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <ol className="mt-6 space-y-4 text-sm text-gray-700">
              <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-[#EF1B23]"><Share className="h-4 w-4" /></span><span>In Safari, tap the <strong>Share</strong> button.</span></li>
              <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-[#EF1B23]"><span className="text-xs font-black">2</span></span><span>Choose <strong>Add to Home Screen</strong>.</span></li>
              <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-[#EF1B23]"><span className="text-xs font-black">3</span></span><span>Tap <strong>Add</strong> to finish.</span></li>
            </ol>
            <p className="mt-5 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">iPhone and iPad installation is completed from the browser share menu. This app can’t open that menu automatically.</p>
            <button type="button" onClick={closeIosGuide} className="mt-5 w-full rounded-xl bg-[#EF1B23] px-4 py-3 text-sm font-bold text-white hover:bg-red-700">Got it</button>
          </section>
        </div>
      )}
    </PwaContext.Provider>
  );
};
