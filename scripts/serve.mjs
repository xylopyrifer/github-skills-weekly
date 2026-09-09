import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { build, root } from './build.mjs';
await build();
const folder=path.join(root,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const resolved=path.resolve(folder,'.'+pathname);
  if(resolved!==folder&&!resolved.startsWith(folder+path.sep)){res.writeHead(403).end();return;}
  const file=(await stat(resolved)).isDirectory()?path.join(resolved,'index.html'):resolved;
  res.setHeader('Content-Type',types[path.extname(file)]||'text/plain; charset=utf-8');
  res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');
  res.end(await readFile(file));
 }catch(_){res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}`));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
if(!process.argv.includes('--dist')){
 let timer;
 for(const dir of ['src','data','config'])watch(path.join(root,dir),{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(()=>build().catch(console.error),180);});
 watch(path.join(root,'index.html'),()=>build().catch(console.error));
}
