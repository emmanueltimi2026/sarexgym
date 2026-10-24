export const INSTALL_SUCCEEDED_KEY = 'sarex.pwa.install-succeeded';
export const INSTALL_REQUEST_EVENT = 'sarex:pwa-install-request';
export const INSTALL_SUCCEEDED_EVENT = 'sarex:pwa-installed';

export const isStandaloneDisplayMode = (displayMode, navigatorStandalone = false) =>
  Boolean(displayMode || navigatorStandalone);

export const isInstalledApp = ({ standalone, navigatorStandalone, persisted, relatedApps = [] }) =>
  isStandaloneDisplayMode(standalone, navigatorStandalone)
  || persisted
  || relatedApps.length > 0;

export const isIosDevice = (userAgent = '', platform = '', maxTouchPoints = 0) =>
  /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);

export const persistInstallSuccess = storage => {
  try { storage?.setItem(INSTALL_SUCCEEDED_KEY, 'true'); } catch { /* Storage can be disabled. */ }
};

export const requestInstall = async promptEvent => {
  if (!promptEvent || typeof promptEvent.prompt !== 'function') return null;
  await promptEvent.prompt();
  return promptEvent.userChoice;
};
