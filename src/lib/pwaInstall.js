export const INSTALL_DISMISSED_UNTIL_KEY = 'sarex.pwa.install-dismissed-until';
export const INSTALL_SUCCEEDED_KEY = 'sarex.pwa.install-succeeded';
export const INSTALL_DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

export const isStandaloneDisplayMode = (displayMode, navigatorStandalone = false) =>
  displayMode || navigatorStandalone;

export const isInstallDismissed = (dismissedUntil, now = Date.now()) =>
  Number(dismissedUntil || 0) > now;

export const persistInstallSuccess = storage => {
  try { storage?.setItem(INSTALL_SUCCEEDED_KEY, 'true'); } catch { /* Storage can be disabled. */ }
};

export const persistInstallDismissal = (storage, now = Date.now()) => {
  try { storage?.setItem(INSTALL_DISMISSED_UNTIL_KEY, String(now + INSTALL_DISMISS_FOR_MS)); } catch { /* Storage can be disabled. */ }
};

export const isCriticalPwaRoute = pathname =>
  /(?:^|\/)(?:check-in|checkin|checkout|payment\/checkout)(?:\/|$)/i.test(pathname || '');

export const shouldShowInstallToast = ({
  available,
  installed,
  standalone,
  dismissedUntil,
  now = Date.now(),
  route,
  modalOpen,
  engaged,
}) => Boolean(
  available
  && !installed
  && !standalone
  && !isInstallDismissed(dismissedUntil, now)
  && !isCriticalPwaRoute(route)
  && !modalOpen
  && engaged,
);

export const requestInstall = async promptEvent => {
  if (!promptEvent) return null;
  await promptEvent.prompt();
  return promptEvent.userChoice;
};
