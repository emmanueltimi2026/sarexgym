import React, { useEffect, useRef, useState } from 'react';

declare global { interface Window { google?: { accounts: { id: { initialize(options: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean }): void; renderButton(element: HTMLElement, options: Record<string, unknown>): void } } } } }

let initializedClientId: string | undefined;
let activeCredentialHandler: ((credential: string) => void) | undefined;

type GoogleResult = { user?: { roles: string[] }; registration?: { token: string; profile: { firstName: string; lastName: string; email: string; picture: string } } };

export const GoogleAuthButton: React.FC<{ onResult: (result: GoogleResult) => void; onError: (message: string) => void; text?: 'signin_with' | 'signup_with' }> = ({ onResult, onError, text = 'signin_with' }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const container = useRef<HTMLDivElement>(null);
  const resultHandler = useRef(onResult);
  const errorHandler = useRef(onError);
  const [ready, setReady] = useState(false);
  resultHandler.current = onResult;
  errorHandler.current = onError;

  useEffect(() => {
    if (!clientId) return;
    const setup = () => {
      if (!window.google || !container.current) return;
      activeCredentialHandler = async credential => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/google`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body?.error?.message || 'Google authentication failed.');
          resultHandler.current(body);
        } catch (error) { errorHandler.current(error instanceof Error ? error.message : 'Google authentication failed.'); }
      };
      if (initializedClientId !== clientId) {
        window.google.accounts.id.initialize({ client_id: clientId, auto_select: false, callback: ({ credential }) => void activeCredentialHandler?.(credential) });
        initializedClientId = clientId;
      }
      container.current.replaceChildren();
      window.google.accounts.id.renderButton(container.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', width: Math.min(container.current.clientWidth || 400, 400), text });
      setReady(true);
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-sarex-google]');
    if (existing) { if (window.google) setup(); else existing.addEventListener('load', setup, { once: true }); return; }
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.dataset.sarexGoogle = 'true'; script.onload = setup; script.onerror = () => errorHandler.current('Google sign-in could not be loaded.'); document.head.appendChild(script);
  }, [clientId, text]);

  if (!clientId) return null;
  return <div className="w-full overflow-hidden rounded-xl"><div ref={container} className="flex min-h-11 w-full justify-center overflow-hidden rounded-xl" aria-label="Continue with Google"/>{!ready && <div className="h-11 animate-pulse rounded-xl bg-gray-100"/>}</div>;
};
