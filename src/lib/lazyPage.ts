import { lazy } from 'react';

const staleChunkRecoveryKey = 'sarex:stale-chunk-recovery-at';
const staleChunkRecoveryWindowMs = 30_000;

export const isStaleChunkError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /dynamically imported module|importing a module script failed|failed to fetch dynamically imported module|chunkloaderror|loading chunk/i.test(message);
};

const clearSarexCaches = async () => {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('sarex-static-') || key.startsWith('sarex-offline-')).map(key => caches.delete(key)));
};

const recoverFromStaleChunk = () => {
  if (typeof window === 'undefined') return false;
  const now = Date.now();
  try {
    const previous = Number(sessionStorage.getItem(staleChunkRecoveryKey) || 0);
    if (previous && now - previous < staleChunkRecoveryWindowMs) return false;
    sessionStorage.setItem(staleChunkRecoveryKey, String(now));
  } catch {
    // A browser may block storage; a normal reload is still a useful recovery.
  }
  void clearSarexCaches().catch(() => undefined).finally(() => window.location.reload());
  return true;
};

export const lazyPage = (loader: () => Promise<Record<string, unknown>>, exportName: string) => lazy(async () => {
  try {
    return { default: (await loader())[exportName] as React.ComponentType<any> };
  } catch (error) {
    if (isStaleChunkError(error) && recoverFromStaleChunk()) {
      // Keep Suspense pending while the browser reloads with the new manifest.
      return new Promise<never>(() => undefined);
    }
    throw error;
  }
});
