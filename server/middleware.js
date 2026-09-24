import { randomUUID } from 'node:crypto';
import { sha256 } from './security.js';
import { sessionCookieOptions } from './http-security.js';
import { attachAuthDiagnostic, setAuthDiagnostic } from './auth-diagnostics.js';

export const requestContext = (req, res, next) => {
  req.requestId = req.get('x-request-id')?.slice(0, 100) || randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
};

export const requireAuth = db => async (req, res, next) => {
  try {
    if (req.path === '/session' || req.path === '/csrf' || req.path.startsWith('/auth/') || req.path.startsWith('/attendance/reception-check-in')) {
      attachAuthDiagnostic(req, res);
    }
    const raw = req.cookies?.[req.app.locals.config.SESSION_COOKIE_NAME];
    if (!raw) {
      setAuthDiagnostic(req, { authenticationSucceeded: false });
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required', requestId: req.requestId } });
    }
    const { rows } = await db.query(`SELECT s.id session_id, u.id, u.email, u.status, u.must_change_password, COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') permissions, COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') roles
      FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id LEFT JOIN role_permissions rp ON rp.role_id=ur.role_id LEFT JOIN permissions p ON p.id=rp.permission_id
      WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()
        AND s.last_seen_at > now() - make_interval(hours => $2)
      GROUP BY s.id,u.id,u.email,u.status,u.must_change_password`, [sha256(raw), req.app.locals.config.SESSION_IDLE_TIMEOUT_HOURS]);
    const actor = rows[0];
    if (!actor || actor.status !== 'active') {
      setAuthDiagnostic(req, { authenticationSucceeded: false });
      res.clearCookie(req.app.locals.config.SESSION_COOKIE_NAME, sessionCookieOptions(req.app.locals.config));
      return res.status(401).json({ error: { code: 'INVALID_SESSION', message: 'Session is no longer valid', requestId: req.requestId } });
    }
    await db.query('UPDATE sessions SET last_seen_at=now() WHERE id=$1', [actor.session_id]);
    req.actor = actor;
    setAuthDiagnostic(req, { authenticationSucceeded: true });
    if (req.method !== 'GET' && actor.roles.some(role => ['admin','staff','trainer'].includes(role))) {
      res.once('finish', () => {
        if (res.statusCode < 400) void db.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,new_values,ip,request_id) VALUES($1,$2,'request',$3,$4,$5)", [actor.id, req.method.toLowerCase()+'.'+req.path, JSON.stringify({ statusCode: res.statusCode }), req.ip, req.requestId]).catch(() => {});
      });
    }
    next();
  } catch (error) { next(error); }
};

export const requirePermission = permission => (req, res, next) => req.actor?.permissions?.includes(permission)
  ? next()
  : res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action', requestId: req.requestId } });

export const errorHandler = (error, req, res, _next) => {
  const validation = error?.name === 'ZodError' || (error instanceof SyntaxError && 'body' in error);
  const conflict = error?.code === '23505' || error?.code === '23P01';
  const status = validation ? 400 : conflict ? 409 : Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(JSON.stringify({ level: 'error', requestId: req.requestId, message: error.message, stack: process.env.NODE_ENV === 'production' ? undefined : error.stack }));
  res.status(status).json({ error: { code: validation ? 'VALIDATION_ERROR' : conflict ? 'CONFLICT' : error.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'), message: status === 500 ? 'An unexpected error occurred' : validation ? 'The request data is invalid' : error.message, requestId: req.requestId } });
};

