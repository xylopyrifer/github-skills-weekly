import { readdir, readFile } from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import path from 'node:path';
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=b=>{let c=0xffffffff;for(const n of b)c=table[(c^n)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
export async function collectFiles(folder,prefix=''){
 const files=[];
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const name=prefix+entry.name;
  if(entry.isDirectory())files.push(...await collectFiles(path.join(folder,entry.name),name+'/'));
  else if(entry.isFile())files.push({name,bytes:await readFile(path.join(folder,entry.name))});
 }
 return files;
}
// Standard ZIP/deflate with UTF-8 names. No platform archiver or npm package required.
export function makeZip(files){
 const local=[],central=[];let offset=0;
 if(files.length>65535)throw new Error('ZIP64 is not supported');
 for(const file of files){
  const name=Buffer.from(file.name.replace(/\\/g,'/')),bytes=Buffer.from(file.bytes),compressed=deflateRawSync(bytes),crc=crc32(bytes);
  if(bytes.length>0xffffffff||offset>0xffffffff)throw new Error('ZIP64 is not supported');
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(bytes.length,22);h.writeUInt16LE(name.length,26);
  local.push(h,name,compressed);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(bytes.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+compressed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
