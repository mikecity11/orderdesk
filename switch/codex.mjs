import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export function parseCodexOutput(output){
 const events=output.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
 if(events.some(e=>e.type==='turn.failed'||e.type==='error')||!events.some(e=>e.type==='turn.completed'))throw Error('Codex did not complete the explanation.');
 const messages=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').map(e=>e.item.text).filter(Boolean);
 if(!messages.length)throw Error('Codex returned no explanation.');
 return messages.at(-1);
}

export async function explainWithCodex(prompt){
 const dir=await mkdtemp(join(tmpdir(),'orderdesk-explain-'));
 // Retain the user's CLI login without passing Switch credentials to the child.
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^(SWITCH_|ORDERDESK_|AI_GATEWAY_|AGENT_REGISTRATION_)/i.test(key)));
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(process.env.ORDERDESK_CODEX_PATH||(process.platform==='win32'?'codex.exe':'codex'),['exec','--skip-git-repo-check','--sandbox','read-only','--json','-'],{cwd:dir,env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>{child.kill();finish(Error('Codex explanation timed out.'));},90000);
  child.on('error',()=>finish(Error('Cannot start Codex. Check ORDERDESK_CODEX_PATH and your Codex login.')));
  child.stdin.on('error',()=>{});
  child.stdout.on('data',chunk=>{output+=chunk;if(output.length>1000000){child.kill();finish(Error('Codex output exceeded the limit.'));}});
  child.stderr.resume();
  child.on('close',code=>{if(settled)return;try{if(code!==0)throw Error('Codex explanation failed. Check your CLI login.');finish(null,parseCodexOutput(output));}catch(error){finish(error);}});
  child.stdin.end(prompt);
 });}finally{await rm(dir,{recursive:true,force:true});}
}
