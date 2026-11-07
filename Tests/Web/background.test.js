import test from 'node:test';
import assert from 'node:assert/strict';

let privateTab = false, candidates = [], nativeCalls = 0, executions = [];
globalThis.browser = {
  runtime: {id:'test-extension', onMessage:{addListener(){}}, async sendNativeMessage(){nativeCalls++;return {ok:true,entries:[],retentionDays:7};}},
  tabs: {async query(){return [{id:1,incognito:privateTab}];}},
  scripting: {async executeScript(options){executions.push(options);return options.args[0].operation==='detect'?candidates:[{result:{ok:true}}];}}
};
const { routeMessage } = await import('../../Extension/Resources/background.js');
const sender = {id:'test-extension'};

test('web page/content messages cannot read or write native history', async () => {
  nativeCalls=0;
  assert.equal((await routeMessage({type:'history',request:{action:'list'}},{...sender,tab:{id:1}})).ok,false);
  assert.equal(nativeCalls,0);
});

test('private browsing never reads normal native history', async () => {
  privateTab=true;nativeCalls=0;
  assert.equal((await routeMessage({type:'history',request:{action:'list'}},sender)).error,'privateMode');
  assert.equal(nativeCalls,0);privateTab=false;
});

test('ambiguous or absent fields are never filled', async () => {
  for(const detected of [[],[{frameId:0,result:{found:true}},{frameId:2,result:{found:true}}]]) {
    candidates=detected;executions=[];nativeCalls=0;
    assert.equal((await routeMessage({type:'insert',password:'somepassword'},sender)).ok,false);
    assert.equal(executions.length,1);
    assert.equal(nativeCalls,0);
  }
});

test('only the detected frame receives the password and successful insertion is recorded', async () => {
  candidates=[{frameId:3,result:{found:true}}];executions=[];nativeCalls=0;
  assert.equal((await routeMessage({type:'insert',password:'somepassword'},sender)).ok,true);
  assert.deepEqual(executions[1].target.frameIds,[3]);
  assert.equal(executions[0].args[0].password,undefined);
  assert.equal(nativeCalls,1);
});
