import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCodexOutput} from '../switch/codex.mjs';
test('Codex explanation accepts a completed model answer and ignores progress',()=>{
 const output=[{type:'thread.started'},{type:'item.completed',item:{type:'agent_message',text:'Confirm branch stock before packing.'}},{type:'turn.completed'}].map(JSON.stringify).join('\n');
 assert.equal(parseCodexOutput(output),'Confirm branch stock before packing.');
});
test('Codex explanation rejects incomplete, failed and empty turns',()=>{
 for(const events of [[{type:'item.completed',item:{type:'agent_message',text:'Partial'}}],[{type:'turn.failed'}],[{type:'turn.completed'}]])assert.throws(()=>parseCodexOutput(events.map(JSON.stringify).join('\n')));
});
