import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {read} from './store.mjs';
const key=process.env.ORDERDESK_SERVICE_KEY;
if(!key||key.length<24)throw Error('Set ORDERDESK_SERVICE_KEY to a random secret of at least 24 characters.');
createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');const auth=req.headers.authorization||'';const expected='Bearer '+key;if(Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected))){res.writeHead(401);return res.end(JSON.stringify({error:'Unauthorized'}));}if(req.method!=='GET'||req.url!=='/workspace'){res.writeHead(404);return res.end(JSON.stringify({error:'Not found'}));}try{const data=await read();delete data.processed;res.end(JSON.stringify(data));}catch{res.writeHead(500);res.end(JSON.stringify({error:'Unable to read workspace.'}));}}).listen(Number(process.env.PORT||8788),process.env.HOST||'127.0.0.1',()=>console.log('OrderDesk read-only service started.'));
