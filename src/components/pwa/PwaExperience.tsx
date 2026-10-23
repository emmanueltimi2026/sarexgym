import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import {
  INSTALL_DISMISSED_UNTIL_KEY,
  INSTALL_SUCCEEDED_KEY,
  isStandaloneDisplayMode,
  persistInstallDismissal,
  persistInstallSuccess,
  requestInstall,
  shouldShowInstallToast,
} from '../../lib/pwaInstall.js';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const isIosDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandaloneApp = () => isStandaloneDisplayMode(
  window.matchMedia('(display-mode: standalone)').matches,
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
);

const getDismissedUntil = () => {
  try { return localStorage.getItem(INSTALL_DISMISSED_UNTIL_KEY); } catch { return null; }
};

const isAlreadyInstalled = () => {
  try { return localStorage.getItem(INSTALL_SUCCEEDED_KEY) === 'true'; } catch { return false; }
};

export const PwaExperience: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { currentPath } = useGym();
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnlineNotice, setShowOnlineNotice] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const activateUpdateRef = useRef(false);
  const onlineNoticeTimer = useRef<number | undefined>(undefined);
  const engagementTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const appleDevice = isIosDevice();
    const standalone = isStandaloneApp();
    setIsIos(appleDevice);
    setInstalled(standalone || isAlreadyInstalled());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
      setInstalled(isStandaloneApp() || isAlreadyInstalled());
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setInstallVisible(false);
      persistInstallSuccess(localStorage);
    };
    const onDisplayModeChange = () => setInstalled(isStandaloneApp() || isAlreadyInstalled());
    const displayMode = window.matchMedia('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
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

  // A successful sign-in is a meaningful point to offer installation. Public visitors
  // qualify after a short period of visible use and an intentional interaction.
  useEffect(() => {
    const qualifyAfterEngagement = () => {
      window.clearTimeout(engagementTimer.current);
      if (document.visibilityState !== 'visible') return;
      engagementTimer.current = window.setTimeout(() => setEngaged(true), 12_000);
    };
    const onSessionChanged = () => setEngaged(true);
    document.addEventListener('pointerdown', qualifyAfterEngagement, { passive: true });
    document.addEventListener('keydown', qualifyAfterEngagement);
    document.addEventListener('visibilitychange', qualifyAfterEngagement);
    window.addEventListener('sarex:session-changed', onSessionChanged);
    return () => {
      window.clearTimeout(engagementTimer.current);
      document.removeEventListener('pointerdown', qualifyAfterEngagement);
      document.removeEventListener('keydown', qualifyAfterEngagement);
      document.removeEventListener('visibilitychange', qualifyAfterEngagement);
      window.removeEventListener('sarex:session-changed', onSessionChanged);
    };
  }, []);

  useEffect(() => {
    const hasModal = () => setModalOpen(Boolean(document.querySelector('[aria-modal="true"]')));
    hasModal();
    const observer = new MutationObserver(hasModal);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const available = isIos || Boolean(deferredPrompt);
    const nextVisible = shouldShowInstallToast({
      available,
      installed,
      standalone: isStandaloneApp(),
      dismissedUntil: getDismissedUntil(),
      route: currentPath,
      modalOpen,
      engaged,
    });
    setInstallVisible(nextVisible);
  }, [currentPath, deferredPrompt, engaged, installed, isIos, modalOpen]);

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

  const dismissInstall = useCallback(() => {
    setInstallVisible(false);
    persistInstallDismissal(localStorage);
  }, []);

  const install = useCallback(async () => {
    if (installed || !deferredPrompt) return;
    const promptEvent = deferredPrompt;
    setDeferredPrompt(null);
    try {
      const choice = await requestInstall(promptEvent);
      if (choice?.outcome === 'accepted') {
        setInstallVisible(false);
      } else if (choice?.outcome === 'dismissed') {
        dismissInstall();
      }
    } catch {
      // The browser owns the native prompt; keep the page usable if it rejects.
    }
  }, [deferredPrompt, dismissInstall, installed]);

  const activateUpdate = () => {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) return;
    activateUpdateRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <>
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
      {installVisible && !installed && (
        <aside role="status" aria-live="polite" aria-label="SAREX installation option" className="fixed inset-x-3 bottom-4 z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-gray-200/90 bg-white/95 p-3.5 text-[#151515] shadow-[0_14px_45px_rgba(17,17,17,.18)] backdrop-blur-md sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px]">
          <img src="/icons/icon-192.png" width="42" height="42" alt="" className="h-10 w-10 shrink-0 rounded-xl shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">SAREX Fitness</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
              {isIos ? 'Add SAREX to your Home Screen. Tap the Share button, then choose “Add to Home Screen”.' : 'Add SAREX to your Home Screen for faster access to your membership, workouts and QR check-in.'}
            </p>
          </div>
          {isIos ? (
            <button type="button" onClick={dismissInstall} className="shrink-0 rounded-lg bg-[#151515] px-3 py-2 text-xs font-bold text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF1B23]">Got it</button>
          ) : (
            <div className="flex shrink-0 flex-col-reverse items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
              <button type="button" onClick={dismissInstall} className="rounded-md px-2 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#EF1B23]">Not now</button>
              <button type="button" onClick={() => void install()} className="rounded-lg bg-[#EF1B23] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]">Install</button>
            </div>
          )}
        </aside>
      )}
      {updateReady && (
        <aside role="status" className="fixed inset-x-3 bottom-3 z-[95] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-[#151515] shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5">
          <RefreshCw className="h-5 w-5 shrink-0 text-[#EF1B23]" aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="font-bold">A new version is ready</p><p className="text-xs text-gray-600">Update SAREX when you’re ready.</p></div>
          <button type="button" onClick={activateUpdate} className="rounded-lg bg-[#EF1B23] px-3 py-2 text-xs font-bold text-white hover:bg-red-700">Update</button>
        </aside>
      )}
    </>
  );
};
