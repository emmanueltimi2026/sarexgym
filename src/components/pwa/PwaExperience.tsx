import React, { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { INSTALL_REQUEST_EVENT, INSTALL_SUCCEEDED_EVENT, persistInstallSuccess, requestInstall } from '../../lib/pwaInstall.js';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const PwaExperience: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOnlineNotice, setShowOnlineNotice] = useState(false);
  const deferredPrompt = useRef<InstallPromptEvent | null>(null);
  const onlineNoticeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Leave the browser's own install promotion enabled. Retain the event only
      // as an optional action for the public footer fallback.
      deferredPrompt.current = event as InstallPromptEvent;
    };
    const onAppInstalled = () => {
      deferredPrompt.current = null;
      persistInstallSuccess(localStorage);
      window.dispatchEvent(new Event(INSTALL_SUCCEEDED_EVENT));
    };
    const onInstallRequest = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<{ onUnavailable?: () => void }>;
      const promptEvent = deferredPrompt.current;
      if (!promptEvent) {
        event.detail?.onUnavailable?.();
        return;
      }
      deferredPrompt.current = null;
      void requestInstall(promptEvent).then(choice => {
        if (choice?.outcome === 'accepted') {
          persistInstallSuccess(localStorage);
          window.dispatchEvent(new Event(INSTALL_SUCCEEDED_EVENT));
        }
        // A dismissed native prompt is respected without showing another prompt.
      }).catch(() => event.detail?.onUnavailable?.());
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener(INSTALL_REQUEST_EVENT, onInstallRequest);

    let active = true;
    let updateWhenVisible: (() => void) | undefined;
    if ('serviceWorker' in navigator) {
      const buildId = typeof __SAREX_BUILD_ID__ === 'string' ? __SAREX_BUILD_ID__ : 'dev';
      navigator.serviceWorker.register(`/service-worker.js?build=${encodeURIComponent(buildId)}`, { scope: '/' })
        .then((nextRegistration) => {
          if (!active) return;
          updateWhenVisible = () => {
            if (document.visibilityState === 'visible') void nextRegistration.update().catch(() => undefined);
          };
          document.addEventListener('visibilitychange', updateWhenVisible);
          nextRegistration.update().catch(() => undefined);
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
      if (updateWhenVisible) document.removeEventListener('visibilitychange', updateWhenVisible);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener(INSTALL_REQUEST_EVENT, onInstallRequest);
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
    </>
  );
};
