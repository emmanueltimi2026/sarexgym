import crypto from 'node:crypto';
import { sha256, timingSafeEqualText } from './security.js';

const unsafe=new Set(['POST','PUT','PATCH','DELETE']);

export const sessionCookieOptions=(config,expires)=>({
  httpOnly:true,
  secure:config.secureCookies,
  sameSite:config.COOKIE_SAME_SITE,
  path:'/',
  ...(expires?{expires,maxAge:Math.max(0,expires.getTime()-Date.now())}:{})
});

export const clearSessionCookie=(res,config)=>res.clearCookie(config.SESSION_COOKIE_NAME,sessionCookieOptions(config));

const csrfValue=(rawSession,config)=>crypto.createHmac('sha256',config.CSRF_SECRET||'development-only-csrf-secret-not-for-production').update(rawSession).digest('base64url');

export const csrfTokenForRequest=(req,config)=>{
  const raw=req.cookies?.[config.SESSION_COOKIE_NAME];
  return raw?csrfValue(raw,config):null;
};

export const requireCsrf=config=>(req,res,next)=>{
  if(!unsafe.has(req.method))return next();
  const origin=req.get('origin');
  const referer=req.get('referer');
  const expectedOrigin=config.FRONTEND_URL||config.APP_ORIGIN;
  if(origin!==expectedOrigin&&(!origin&&(!referer||!referer.startsWith(expectedOrigin+'/'))))return res.status(403).json({error:{code:'INVALID_ORIGIN',message:'Request origin is not allowed',requestId:req.requestId}});
  const supplied=req.get('x-csrf-token')||'';
  const expected=csrfTokenForRequest(req,config)||'';
  if(!supplied||!expected||!timingSafeEqualText(supplied,expected))return res.status(403).json({error:{code:'CSRF_REJECTED',message:'Security token is missing or invalid',requestId:req.requestId}});
  next();
};

export const rateLimitSubject=req=>sha256(`${req.ip||'unknown'}|${String(req.body?.email||'').toLowerCase()}`);
