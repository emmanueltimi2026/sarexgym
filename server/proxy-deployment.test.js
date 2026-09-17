import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');

const sourceFiles=async directory=>{
 const entries=await readdir(directory,{withFileTypes:true});
 const files=await Promise.all(entries.map(entry=>{
  const target=path.join(directory,entry.name);
  return entry.isDirectory()?sourceFiles(target):/\.(ts|tsx)$/.test(entry.name)?[target]:[];
 }));
 return files.flat();
};

test('Vercel proxies API requests to Render before the SPA fallback',async()=>{
 const config=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));
 assert.deepEqual(config.rewrites[0],{
  source:'/api/:path*',
  destination:'https://sarexgym.onrender.com/api/:path*'
 });
 assert.match(config.rewrites[1].source,/api\//);
});

test('production browser traffic cannot bypass the shared API policy',async()=>{
 const files=await sourceFiles(path.join(root,'src'));
 for(const file of files){
  const relative=path.relative(root,file).replaceAll('\\','/');
  const source=await readFile(file,'utf8');
  assert.doesNotMatch(source,/sarexgym\.onrender\.com/,
   `${relative} must not call Render directly`);
  if(relative!=='src/lib/secureFetch.ts'&&relative!=='src/vite-env.d.ts'){
   assert.doesNotMatch(source,/VITE_API_BASE_URL/,
    `${relative} must use the centralized API URL helper`);
  }
 }
 const helper=await readFile(path.join(root,'src/lib/secureFetch.ts'),'utf8');
 assert.match(helper,/import\.meta\.env\.PROD&&!useDirectApi\?'':/);
});
