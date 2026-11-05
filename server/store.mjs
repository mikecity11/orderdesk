import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {seed,apply} from '../lib/engine.mjs';
const path=resolve(process.env.ORDERDESK_DATA_FILE||'.data/workspace.json');
let queue=Promise.resolve();
export async function read(){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return seed();throw e;}}
export function transact(action,{eventId,revision}={}){const job=queue.then(async()=>{const prior=await read();if(eventId&&prior.processed?.includes(eventId))return {state:prior,duplicate:true};if(revision!==undefined&&revision!==prior.revision)throw Error('Workspace changed; refresh and retry.');const next=apply(prior,action);if(eventId)next.processed=[...(prior.processed||[]),eventId];await mkdir(dirname(path),{recursive:true});await writeFile(path+'.tmp',JSON.stringify(next,null,2),{mode:0o600});await rename(path+'.tmp',path);return {state:next,duplicate:false};});queue=job.catch(()=>{});return job;}
