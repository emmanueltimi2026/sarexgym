const enabled = config => process.env.AUTH_DIAGNOSTICS === 'true' || config?.AUTH_DIAGNOSTICS === true || config?.AUTH_DIAGNOSTICS === 'true';

export const hasSessionCookie = req => Boolean(req.cookies?.[req.app.locals.config.SESSION_COOKIE_NAME]);

export const setAuthDiagnostic = (req, data) => {
  req.authDiagnostic = { ...(req.authDiagnostic || {}), ...data };
};

export const logAuthDiagnostic = (req, res, data = {}) => {
  if (!enabled(req.app?.locals?.config)) return;
  const payload = {
    event: 'auth_diagnostic',
    requestId: req.requestId,
    route: req.path,
    origin: req.get('origin') || null,
    userAgent: req.get('user-agent') || null,
    sessionCookiePresent: hasSessionCookie(req),
    authenticationSucceeded: Boolean(data.authenticationSucceeded ?? req.authDiagnostic?.authenticationSucceeded),
    statusCode: data.statusCode ?? res.statusCode
  };
  console.log(JSON.stringify(payload));
};

export const attachAuthDiagnostic = (req, res, data = {}) => {
  setAuthDiagnostic(req, data);
  if (!enabled(req.app?.locals?.config) || typeof res.once !== 'function') return;
  if (req.authDiagnosticAttached) return;
  req.authDiagnosticAttached = true;
  res.once('finish', () => logAuthDiagnostic(req, res));
};
