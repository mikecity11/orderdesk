import WebSocket from 'ws';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {read,transact} from '../server/store.mjs';
import {parseCommand,authorize} from './commands.mjs';
import {summary} from '../lib/engine.mjs';
import {explain} from './ai.mjs';
const {SWITCH_BASE_URL:base,SWITCH_AGENT_ID:agentId,SWITCH_API_KEY:key,SWITCH_ROOM_ID:room}=process.env;
if(!base||!agentId||!key||!room)throw Error('Set SWITCH_BASE_URL, SWITCH_AGENT_ID, SWITCH_API_KEY and SWITCH_ROOM_ID.');
const origin=new URL(base);if(!['http:','https:'].includes(origin.protocol))throw Error('Invalid Switch URL.');
const mapping=JSON.parse(process.env.ORDERDESK_STAFF_ROLES||'{}');if(!Object.keys(mapping).length)throw Error('Configure ORDERDESK_STAFF_ROLES with exact Switch participant IDs.');
const cursorFile='.data/switch-cursor.json';await mkdir('.data',{recursive:true});
let checkpoint;try{checkpoint=JSON.parse(await readFile(cursorFile,'utf8'));}catch{checkpoint={connectionId:randomUUID(),cursor:null,generation:null};}
let cursor=checkpoint.cursor,stopped=false,chain=Promise.resolve(),socket,saveChain=Promise.resolve();
function save(){const snapshot={...checkpoint,cursor};saveChain=saveChain.then(async()=>{await writeFile(cursorFile+'.tmp',JSON.stringify(snapshot),{mode:0o600});await rename(cursorFile+'.tmp',cursorFile);});return saveChain;}
async function post(content){const r=await fetch(new URL(`/agents/${encodeURIComponent(agentId)}/message`,base),{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({room_id:room,content}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Switch message delivery failed: '+r.status);}
async function handle(frame){const data=frame.data||frame,p=data.payload||{};if(data.type==='message'&&data.room_id===room&&p.addressed){let response;try{const action=parseCommand(p.body);authorize(action,p.sender,mapping);if(action.type==='help')response='OrderDesk commands: report <SKU> <quantity> <reason>; plan; confirm <order>; approve-transfer <order>; approve-customer <order>; decline-customer <order>; pack <order>; dispatch <order>; status; explain <question>. Customer-service staff must obtain actual customer consent before recording it.';else if(action.type==='status')response=summary(await read());else if(action.type==='explain')response=await explain(await read(),action.question);else{const result=await transact({...action,actor:p.sender_name+' ['+p.sender+']'},{eventId:p.message_id||String(frame.id)});response=(result.duplicate?'Already processed this message. No duplicate action taken.\n':'Action recorded.\n')+summary(result.state);}}catch(e){response='OrderDesk: '+e.message;}await post(response);}
 if(typeof frame.id==='number'){cursor=Math.max(cursor||0,frame.id);await save();}}
function connect(){const url=new URL(`/agents/${encodeURIComponent(agentId)}/connection/ws`,base);url.protocol=origin.protocol==='https:'?'wss:':'ws:';url.searchParams.set('connection_id',checkpoint.connectionId);url.searchParams.set('rooms',room);url.searchParams.set('scope','single');url.searchParams.set('filter','all');url.searchParams.set('start_from',cursor===null?'head':String(cursor));if(checkpoint.generation!==null)url.searchParams.set('expected_generation',String(checkpoint.generation));socket=new WebSocket(url,{headers:{Authorization:`Bearer ${key}`}});
 socket.on('open',()=>console.log('Switch socket connected; waiting for connection state.'));
 socket.on('message',raw=>{let f;try{f=JSON.parse(raw.toString());}catch{return;}const type=f.event||f.type||f.data?.type;const d=f.data||f;
  if(type==='ping'){socket.send(JSON.stringify({type:'pong',cursor:cursor||0}));return;}
  if(type==='connection_state'){if(!d.rooms?.includes(room)){stopped=true;console.error('Switch did not grant the configured room.');socket.close();return;}checkpoint.generation=d.generation;cursor=d.cursor;save();console.log('Switch room claimed. Recovery agent ready.');return;}
  if(type==='gap'){stopped=true;console.error('Switch replay gap. Stopping to avoid acting on incomplete context. Review room history and reconcile cursor before restarting.');socket.close();return;}
  if(type==='evicted'&&d.code==='taken_over'||type==='refused'){stopped=true;console.error('Switch connection refused or taken over. Check configuration before restarting.');socket.close();return;}
  chain=chain.then(()=>handle(f)).catch(()=>{console.error('Event delivery failed. Reconnecting from last committed cursor.');socket.close();});
 });
 socket.on('error',()=>console.error('Switch connection error; check reachability and credentials.'));
 socket.on('close',code=>{if([4400,4401,4403,4409].includes(code))stopped=true;if(!stopped)setTimeout(connect,3000);});
}
process.on('SIGINT',()=>{stopped=true;socket?.close();setTimeout(()=>process.exit(0),100);});connect();
