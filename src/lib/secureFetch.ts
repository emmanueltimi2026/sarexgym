const configuredApiBase=import.meta.env.VITE_API_BASE_URL;
if(import.meta.env.PROD&&!configuredApiBase)throw new Error('VITE_API_BASE_URL is required for production builds');
const apiBase=(configuredApiBase||'http://localhost:8080').replace(/\/$/,'');
export const apiUrl=(path:string)=>`${apiBase}${path.startsWith('/')?path:`/${path}`}`;
const nativeFetch=window.fetch.bind(window);
const unsafe=new Set(['POST','PUT','PATCH','DELETE']);
const publicUnsafe=[
  '/api/v1/auth/login','/api/v1/auth/register','/api/v1/auth/google',
  '/api/v1/auth/google/register','/api/v1/auth/forgot-password','/api/v1/auth/reset-password'
];
let csrfToken:string|null=null;
let csrfRequest:Promise<string|null>|null=null;

const loadCsrf=()=>{
  if(csrfToken)return Promise.resolve(csrfToken);
  if(!csrfRequest)csrfRequest=nativeFetch(`${apiBase}/api/v1/csrf`,{credentials:'include'})
    .then(async response=>response.ok?(await response.json()).csrfToken:null)
    .then(token=>(csrfToken=token))
    .finally(()=>{csrfRequest=null});
  return csrfRequest;
};

export function installSecureFetch(){
  window.fetch=async(input,init={})=>{
    const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    const url=new URL(raw,location.origin),api=new URL(apiBase,location.origin);
    if(url.origin!==api.origin||!url.pathname.startsWith('/api/'))return nativeFetch(input,init);
    const method=(init.method||(typeof input!=='string'&&!(input instanceof URL)?input.method:'GET')).toUpperCase();
    const options:RequestInit={...init,credentials:init.credentials||'include'};
    if(unsafe.has(method)&&!publicUnsafe.includes(url.pathname)){
      const token=await loadCsrf(),headers=new Headers(init.headers||(typeof input!=='string'&&!(input instanceof URL)?input.headers:undefined));
      if(token)headers.set('X-CSRF-Token',token);
      options.headers=headers;
    }
    const response=await nativeFetch(input,options);
    if(response.status===401||url.pathname==='/api/v1/auth/logout'||publicUnsafe.includes(url.pathname))csrfToken=null;
    return response;
  };
}
