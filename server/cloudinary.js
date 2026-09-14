import crypto from 'node:crypto';

const allowed=new Set(['image/jpeg','image/png','image/webp']);
const parseDataUrl=value=>{
  if(!value?.startsWith('data:'))return null;
  const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if(!match||!allowed.has(match[1]))throw Object.assign(new Error('Image must be JPG, PNG, or WebP'),{status:422,code:'INVALID_IMAGE_TYPE'});
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length>20_000_000)throw Object.assign(new Error('Image must be 20 MB or smaller'),{status:413,code:'IMAGE_TOO_LARGE'});
  return {mime:match[1],bytes};
};
const signature=(params,secret)=>crypto.createHash('sha1').update(new URLSearchParams(Object.entries(params).sort()).toString().replaceAll('%2F','/')+secret).digest('hex');

export const createImageStorage=config=>{
  const ready=Boolean(config.CLOUDINARY_CLOUD_NAME&&config.CLOUDINARY_API_KEY&&config.CLOUDINARY_API_SECRET);
  const upload=async(value,folder)=>{
    if(!value||!value.startsWith('data:'))return value?{url:value,publicId:null}:null;
    const parsed=parseDataUrl(value);
    if(!ready)throw Object.assign(new Error('Image storage is not configured'),{status:503,code:'STORAGE_UNAVAILABLE'});
    const timestamp=Math.floor(Date.now()/1000),params={folder:`sarex/${folder}`,timestamp:String(timestamp)},form=new FormData();
    form.set('file',new Blob([parsed.bytes],{type:parsed.mime}),'upload');form.set('api_key',config.CLOUDINARY_API_KEY);form.set('timestamp',String(timestamp));form.set('folder',params.folder);form.set('signature',signature(params,config.CLOUDINARY_API_SECRET));
    const response=await fetch(`https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/upload`,{method:'POST',body:form});const body=await response.json();
    if(!response.ok||!body.secure_url||!body.public_id)throw Object.assign(new Error('Image upload failed'),{status:502,code:'STORAGE_UPLOAD_FAILED'});
    return{url:body.secure_url,publicId:body.public_id};
  };
  const remove=async publicId=>{
    if(!ready||!publicId)return;
    const timestamp=Math.floor(Date.now()/1000),params={public_id:publicId,timestamp:String(timestamp)},form=new FormData();
    form.set('public_id',publicId);form.set('api_key',config.CLOUDINARY_API_KEY);form.set('timestamp',String(timestamp));form.set('signature',signature(params,config.CLOUDINARY_API_SECRET));
    const response=await fetch(`https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/destroy`,{method:'POST',body:form});if(!response.ok)throw new Error('Cloudinary image deletion failed');
  };
  return{upload,remove};
};

