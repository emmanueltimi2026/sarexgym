import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { z } from 'zod';
import { errorHandler, requestContext, requireAuth, requirePermission } from './middleware.js';
import { hashPassword, randomToken, sha256, verifyPassword, timingSafeEqualText } from './security.js';
import { installProtectedRoutes, installPublicRoutes } from './routes.js';
import { clearSessionCookie, csrfTokenForRequest, requireCsrf, sessionCookieOptions } from './http-security.js';
import { createSharedRateLimit } from './rate-limit.js';
import { verifyReceptionCheckInToken } from './check-in-token.js';
import { recordDeniedAttendance } from './attendance.js';

const asyncRoute = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const loginSchema=z.object({email:z.string().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(8).max(200),remember:z.boolean().optional().default(true)}).strict();

export function createApp({db,config}) {
 const app=express(); app.disable('x-powered-by'); app.locals.config=config;
 if(config.TRUST_PROXY==='true') app.set('trust proxy',1);
 const frontendOrigin=config.FRONTEND_URL||config.APP_ORIGIN;
 app.use(requestContext,(req,res,next)=>{const started=Date.now();res.once('finish',()=>console.log(JSON.stringify({timestamp:new Date().toISOString(),level:'info',event:'http_request',requestId:req.requestId,method:req.method,path:req.path,status:res.statusCode,durationMs:Date.now()-started})));next()},helmet({contentSecurityPolicy:false,crossOriginOpenerPolicy:{policy:'same-origin-allow-popups'}}),cors({origin:frontendOrigin,credentials:true,methods:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','X-CSRF-Token','X-Request-ID','Idempotency-Key'],maxAge:86400}),cookieParser());
 app.use((req,res,next)=>{const origin=req.get('origin');if(origin&&origin!==frontendOrigin)return res.status(403).json({error:{code:'INVALID_ORIGIN',message:'Request origin is not allowed',requestId:req.requestId}});next()});

 // Paystack requires the exact raw bytes for HMAC verification.
 app.post('/api/v1/webhooks/paystack',express.raw({type:'application/json',limit:'256kb'}),asyncRoute(async(req,res)=>{
   if(!config.PAYSTACK_SECRET_KEY) return res.sendStatus(503);
   const signature=req.get('x-paystack-signature')||'';
   const expected=crypto.createHmac('sha512',config.PAYSTACK_SECRET_KEY).update(req.body).digest('hex');
   if(!timingSafeEqualText(signature,expected)) return res.status(401).json({error:{code:'INVALID_SIGNATURE',message:'Invalid webhook signature',requestId:req.requestId}});
   const event=JSON.parse(req.body.toString('utf8')); const reference=event?.data?.reference;
   if(event.event!=='charge.success'||typeof reference!=='string') return res.sendStatus(202);
   await db.transaction(async c=>{
     const eventKey=`charge.success:${reference}`; const payloadHash=sha256(req.body);
     const inserted=await c.query(`INSERT INTO webhook_events(provider,event_key,payload_hash) VALUES('paystack',$1,$2) ON CONFLICT DO NOTHING RETURNING id`,[eventKey,payloadHash]);
     if(!inserted.rowCount) return;
     const eventRegistration=(await c.query("SELECT r.*,e.title,e.currency FROM event_registrations r JOIN events e ON e.id=r.event_id WHERE r.provider_reference=$1 FOR UPDATE",[reference])).rows[0];
     if(eventRegistration){
       if(event.data.status!=='success'||Number(event.data.amount)!==Number(eventRegistration.amount_minor)||event.data.currency!==eventRegistration.currency)throw Object.assign(new Error('Event payment verification mismatch'),{status:422,code:'PAYMENT_MISMATCH'});
       await c.query("UPDATE event_registrations SET status='confirmed',receipt_number=COALESCE(receipt_number,'SRX-E-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))) WHERE id=$1",[eventRegistration.id]);
       await c.query("INSERT INTO notifications(recipient_user_id,type,title,message,metadata) SELECT user_id,'event_booking','Event booking confirmed',$1,$2 FROM members WHERE id=$3",[`Your payment and place for ${eventRegistration.title} are confirmed.`,JSON.stringify({eventId:eventRegistration.event_id}),eventRegistration.member_id]);
       await c.query(`UPDATE webhook_events SET status='processed',processed_at=now() WHERE id=$1`,[inserted.rows[0].id]);
       await c.query(`INSERT INTO audit_logs(action,entity_type,entity_id,new_values,request_id,ip) VALUES('event.payment_verified','event_registration',$1,$2,$3,$4)`,[eventRegistration.id,JSON.stringify({provider:'paystack',reference}),req.requestId,req.ip]);
       return;
     }
     const orderResult=await c.query(`SELECT o.*,p.duration_days,p.trainer_access,p.workout_plan_access FROM payment_orders o JOIN membership_plans p ON p.id=o.plan_id WHERE o.provider='paystack' AND o.provider_reference=$1 FOR UPDATE`,[reference]);
     const order=orderResult.rows[0];
     if(!order||event.data.status!=='success'||Number(event.data.amount)!==Number(order.amount_minor)||event.data.currency!==order.currency) throw Object.assign(new Error('Payment verification mismatch'),{status:422,code:'PAYMENT_MISMATCH'});
     const current=await c.query(`SELECT * FROM subscriptions WHERE member_id=$1 AND status='active' ORDER BY ends_at DESC LIMIT 1 FOR UPDATE`,[order.member_id]);
     const isPlanChange=Boolean(current.rows[0]&&current.rows[0].plan_id!==order.plan_id);
     const startsAt=isPlanChange?new Date():current.rows[0]&&new Date(current.rows[0].ends_at)>new Date()?current.rows[0].ends_at:new Date();
     const endsAt=new Date(startsAt); endsAt.setUTCDate(endsAt.getUTCDate()+order.duration_days);
     const membershipAmount=Number(order.membership_amount_minor||order.amount_minor),registrationFee=Number(order.registration_fee_minor||0);
     const subscription=await c.query(`INSERT INTO subscriptions(member_id,plan_id,starts_at,ends_at,status,amount_minor,currency) VALUES($1,$2,$3,$4,'active',$5,$6) RETURNING id`,[order.member_id,order.plan_id,startsAt,endsAt,membershipAmount,order.currency]);
     if(isPlanChange)await c.query("UPDATE subscriptions SET status='expired',updated_at=now() WHERE member_id=$1 AND id<>$2 AND status='active'",[order.member_id,subscription.rows[0].id]);
     await c.query(`INSERT INTO payments(order_id,member_id,subscription_id,plan_id,amount_minor,membership_amount_minor,registration_fee_minor,currency,method,provider,provider_reference,status,paid_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'paystack','paystack',$9,'successful',now())`,[order.id,order.member_id,subscription.rows[0].id,order.plan_id,order.amount_minor,membershipAmount,registrationFee,order.currency,reference]);
     if(registrationFee>0)await c.query('UPDATE members SET registration_fee_paid_at=COALESCE(registration_fee_paid_at,now()) WHERE id=$1',[order.member_id]);
     if(order.trainer_access)await c.query("INSERT INTO notifications(recipient_user_id,type,title,message,metadata) SELECT u.id,'trainer_assignment_required','Trainer assignment requested',$1,$2 FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.code='admin'",['A paid membership with trainer access needs a trainer assignment.',JSON.stringify({memberId:order.member_id,subscriptionId:subscription.rows[0].id})]);
     await c.query(`UPDATE payment_orders SET status='successful' WHERE id=$1`,[order.id]);
     await c.query(`UPDATE webhook_events SET status='processed',processed_at=now() WHERE id=$1`,[inserted.rows[0].id]);
     await c.query(`INSERT INTO audit_logs(action,entity_type,entity_id,new_values,request_id,ip) VALUES('payment.verified','payment_order',$1,$2,$3,$4)`,[order.id,JSON.stringify({provider:'paystack',reference}),req.requestId,req.ip]);
   },'SERIALIZABLE'); res.sendStatus(200);
 }));

 app.use(express.json({limit:'3mb'}));
 
 app.get('/health',(_req,res)=>res.json({status:'ok'}));
 app.get('/health/live',(_req,res)=>res.json({status:'ok'}));
 app.get('/health/ready',asyncRoute(async(_req,res)=>{await db.query('SELECT 1');res.json({status:'ready'})}));
 const loginLimit=createSharedRateLimit({db,config,name:'authentication',windowMs:15*60_000,limit:15});
 const checkInLimit=createSharedRateLimit({db,config,name:'check-in',windowMs:60_000,limit:30,key:req=>sha256(req.actor?.id||req.ip||'unknown')});
 const paymentLimit=createSharedRateLimit({db,config,name:'payment',windowMs:10*60_000,limit:20,key:req=>sha256(req.actor?.id||req.ip||'unknown')});
 installPublicRoutes(app,{db,config,loginLimit});
 app.post('/api/v1/auth/login',loginLimit,asyncRoute(async(req,res)=>{
   const input=loginSchema.parse(req.body); const result=await db.query(`SELECT u.id,u.email,u.password_hash,u.status,u.must_change_password,COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL),'{}') roles FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE lower(u.email)=$1 GROUP BY u.id`,[input.email]); const user=result.rows[0];
   const valid=user&&await verifyPassword(input.password,user.password_hash);
   if(!valid||user.status!=='active') return res.status(401).json({error:{code:'INVALID_CREDENTIALS',message:'Invalid email or password',requestId:req.requestId}});
   const token=randomToken(); const sessionHours=input.remember?config.SESSION_TTL_HOURS:12; const expires=new Date(Date.now()+sessionHours*3_600_000);
   await db.query(`INSERT INTO sessions(user_id,token_hash,expires_at,ip,user_agent) VALUES($1,$2,$3,$4,$5)`,[user.id,sha256(token),expires,req.ip,req.get('user-agent')?.slice(0,500)]);
   res.cookie(config.SESSION_COOKIE_NAME,token,sessionCookieOptions(config,expires)); res.json({user:{id:user.id,email:user.email,roles:user.roles,mustChangePassword:user.must_change_password}});
 }));
 app.use('/api/v1',requireAuth(db));
 app.get('/api/v1/csrf',(req,res)=>res.json({csrfToken:csrfTokenForRequest(req,config)}));
 app.use('/api/v1',requireCsrf(config));
 app.post('/api/v1/auth/logout',asyncRoute(async(req,res)=>{await db.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[req.actor.session_id]);clearSessionCookie(res,config);res.sendStatus(204)}));
 app.post('/api/v1/auth/change-initial-password',asyncRoute(async(req,res)=>{const input=z.object({password:z.string().min(10).max(200)}).strict().parse(req.body);await db.transaction(async c=>{await c.query('UPDATE users SET password_hash=$1,must_change_password=false,credential_version=credential_version+1,updated_at=now() WHERE id=$2',[await hashPassword(input.password),req.actor.id]);await c.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL',[req.actor.id,req.actor.session_id])});res.sendStatus(204)}));
 app.post('/api/v1/auth/change-password',asyncRoute(async(req,res)=>{const input=z.object({currentPassword:z.string().min(1).max(200),newPassword:z.string().min(10).max(200)}).strict().parse(req.body);const user=(await db.query('SELECT password_hash FROM users WHERE id=$1',[req.actor.id])).rows[0];if(!user||!await verifyPassword(input.currentPassword,user.password_hash))return res.status(401).json({error:{code:'INVALID_CURRENT_PASSWORD',message:'Current password is incorrect',requestId:req.requestId}});await db.transaction(async c=>{await c.query('UPDATE users SET password_hash=$1,must_change_password=false,credential_version=credential_version+1,updated_at=now() WHERE id=$2',[await hashPassword(input.newPassword),req.actor.id]);await c.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL',[req.actor.id,req.actor.session_id]);await c.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values,ip,request_id) VALUES($1,'auth.password_changed','user',$2,$3,$4,$5)",[req.actor.id,req.actor.id,JSON.stringify({revokedOtherSessions:true}),req.ip,req.requestId])});res.sendStatus(204)}));
 app.get('/api/v1/session',asyncRoute(async(req,res)=>res.json({user:{id:req.actor.id,email:req.actor.email,roles:req.actor.roles,permissions:req.actor.permissions}})));
 app.post('/api/v1/attendance/reception-check-in',checkInLimit,asyncRoute(async(req,res)=>{
   const token=z.object({token:z.string().min(40).max(1000)}).strict().parse(req.body).token,credential=verifyReceptionCheckInToken(token,config.CSRF_SECRET);
   if(!credential)throw Object.assign(new Error('This reception QR code is not valid for SAREX check-in.'),{status:422,code:'INVALID_CHECK_IN_QR'});
   if(!req.actor.roles.includes('member'))throw Object.assign(new Error('A member account is required for reception check-in'),{status:403,code:'MEMBER_REQUIRED'});
   const result=await db.transaction(async c=>{
     const member=(await c.query('SELECT m.id,m.member_number,m.first_name,m.last_name,m.profile_image_url,m.home_branch_id,u.status user_status FROM members m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 FOR UPDATE',[req.actor.id])).rows[0];
     if(!member)throw Object.assign(new Error('A registered member profile is required for reception check-in'),{status:403,code:'MEMBER_REQUIRED'});
     const branch=(await c.query('SELECT id,name,timezone FROM branches WHERE id=$1 AND active',[credential.branchId])).rows[0];
     if(!branch)throw Object.assign(new Error('Reception check-in is not configured'),{status:422,code:'RECEPTION_REQUIRED'});
     const deny=async(message,code,httpStatus)=>{
       const visit=await recordDeniedAttendance(c,{memberId:member.id,branchId:branch.id,scannerUserId:req.actor.id,method:'reception_qr',reason:message});
       await c.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values,ip,request_id) VALUES($1,'attendance.reception_qr_denied','attendance',$2,$3,$4,$5)",[req.actor.id,visit.id,JSON.stringify({memberId:member.id,branchId:branch.id,reason:message,code}),req.ip,req.requestId]);
       return{denied:true,httpStatus,code,message};
     };
     if(member.user_status!=='active')return deny('Your member account is not active','ACCESS_DENIED',403);
     const access=(await c.query("SELECT s.id,p.name plan_name,s.ends_at FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id WHERE s.member_id=$1 AND s.status='active' AND s.starts_at<=now() AND s.ends_at>now() AND NOT EXISTS(SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND now()>=f.starts_at AND now()<f.ends_at) ORDER BY s.ends_at DESC LIMIT 1 FOR UPDATE OF s",[member.id])).rows[0];
     if(!access)return deny('You do not have an active membership','INACTIVE_MEMBERSHIP',403);
     await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[member.id]);
     const existing=(await c.query("SELECT checked_in_at FROM attendance WHERE member_id=$1 AND status='completed' AND (checked_in_at AT TIME ZONE $2)::date=(now() AT TIME ZONE $2)::date ORDER BY checked_in_at DESC LIMIT 1",[member.id,branch.timezone])).rows[0];
     if(existing)return deny('You already checked in today at '+new Date(existing.checked_in_at).toLocaleTimeString('en-NG',{timeZone:branch.timezone,hour:'2-digit',minute:'2-digit'}),'ALREADY_CHECKED_IN',409);
     const visit=(await c.query("INSERT INTO attendance(member_id,branch_id,checked_in_at,scanner_user_id,method,status) VALUES($1,$2,now(),$3,'reception_qr','completed') RETURNING id,checked_in_at",[member.id,branch.id,req.actor.id])).rows[0];
     await c.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,new_values,ip,request_id) VALUES($1,'attendance.reception_qr_check_in','attendance',$2,$3,$4,$5)",[req.actor.id,visit.id,JSON.stringify({memberId:member.id,branchId:branch.id}),req.ip,req.requestId]);
     return{...visit,member:{id:member.id,memberId:member.member_number,firstName:member.first_name,lastName:member.last_name,photo:member.profile_image_url,planName:access.plan_name,membershipExpiryDate:access.ends_at,membershipStatus:'Active'},branch:{id:branch.id,name:branch.name}};
   },'SERIALIZABLE');
   if(result.denied)return res.status(result.httpStatus).json({error:{code:result.code,message:result.message,requestId:req.requestId}});
   res.status(201).json({data:result});
 }));
 installProtectedRoutes(app,{db,config,checkInLimit,paymentLimit});
 app.get('/api/v1/members',requirePermission('members.view'),asyncRoute(async(req,res)=>{
   // Trainers receive only assigned members; members receive only themselves.
   const sql=req.actor.permissions.includes('members.update')
    ? `SELECT id,member_number,first_name,last_name,phone,home_branch_id,joined_at FROM members ORDER BY created_at DESC LIMIT 100`
    : `SELECT m.id,m.member_number,m.first_name,m.last_name,m.phone,m.home_branch_id,m.joined_at FROM members m JOIN trainer_assignments a ON a.member_id=m.id JOIN trainers t ON t.id=a.trainer_id WHERE t.user_id=$1 AND a.active ORDER BY m.first_name LIMIT 100`;
   const result=await db.query(sql,req.actor.permissions.includes('members.update')?[]:[req.actor.id]); res.json({data:result.rows});
 }));
 app.use((req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Route not found',requestId:req.requestId}}));
 app.use(errorHandler); return app;
}
