import { rateLimitSubject } from './http-security.js';

const memory=new Map();

export function createSharedRateLimit({db,config,name,windowMs,limit,key=rateLimitSubject}) {
  return async function sharedRateLimit(req,res,next) {
    try {
      const subject=key(req),now=Date.now(),windowStart=new Date(Math.floor(now/windowMs)*windowMs);
      let count;
      if(config.NODE_ENV==='production') {
        const result=await db.query(`INSERT INTO rate_limit_windows(limiter,subject_hash,window_start,request_count) VALUES($1,$2,$3,1)
          ON CONFLICT(limiter,subject_hash,window_start) DO UPDATE SET request_count=rate_limit_windows.request_count+1 RETURNING request_count`,[name,subject,windowStart]);
        count=Number(result.rows[0].request_count);
      } else {
        const id=`${name}:${subject}:${windowStart.toISOString()}`;
        count=(memory.get(id)||0)+1;memory.set(id,count);
      }
      res.setHeader('RateLimit-Limit',String(limit));
      res.setHeader('RateLimit-Remaining',String(Math.max(0,limit-count)));
      res.setHeader('RateLimit-Reset',String(Math.ceil((windowStart.getTime()+windowMs)/1000)));
      if(count>limit)return res.status(429).json({error:{code:'RATE_LIMITED',message:'Too many requests. Please try again later.',requestId:req.requestId}});
      next();
    } catch(error){next(error)}
  };
}
