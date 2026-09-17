type AuthDiagnostic = {
  requestId?: string | null;
  route: string;
  origin?: string;
  userAgent?: string;
  sessionCookiePresent?: 'unknown';
  authenticationSucceeded: boolean;
  statusCode?: number;
  redirectTarget?: string;
};

export const logAuthDiagnostic = (event: 'login' | 'session' | 'portal_redirect', data: AuthDiagnostic) => {
  if (import.meta.env.VITE_AUTH_DIAGNOSTICS !== 'true') return;
  console.info(JSON.stringify({
    event: `auth_client_${event}`,
    requestId: data.requestId || null,
    route: data.route,
    origin: data.origin || window.location.origin,
    userAgent: data.userAgent || navigator.userAgent,
    sessionCookiePresent: data.sessionCookiePresent || 'unknown',
    authenticationSucceeded: data.authenticationSucceeded,
    statusCode: data.statusCode,
    redirectTarget: data.redirectTarget
  }));
};
