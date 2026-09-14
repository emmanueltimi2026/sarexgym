import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageStorage } from './cloudinary.js';

test('image upload rejects unsupported MIME types before contacting storage',async()=>{
 await assert.rejects(createImageStorage({}).upload('data:image/gif;base64,R0lGODlh','test'),error=>error.code==='INVALID_IMAGE_TYPE');
});

test('image upload rejects files larger than 20 MB',async()=>{
 const value=`data:image/png;base64,${Buffer.alloc(20_000_001).toString('base64')}`;
 await assert.rejects(createImageStorage({}).upload(value,'test'),error=>error.code==='IMAGE_TOO_LARGE');
});

