import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { DEFAULT_OPTIONS, validateOptions, generateBatch } from '../../Extension/Resources/generator.js';
import { errorMessage } from '../../Extension/Resources/native.js';

const html=fs.readFileSync(new URL('../../Extension/Resources/popup.html',import.meta.url),'utf8');
const script=fs.readFileSync(new URL('../../Extension/Resources/popup.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({clipboardFails=false,recordFails=false}={}){
  const dom=new JSDOM(html,{url:'https://quietpass.test/popup.html',runScripts:'outside-only'});
  const {window}=dom,records=[],requests=[],copied=[],preferences={};
  let days=7;
  window.DEFAULT_OPTIONS=DEFAULT_OPTIONS;window.validateOptions=validateOptions;window.generateBatch=generateBatch;window.errorMessage=errorMessage;
  window.browser={storage:{local:{async get(){return {}},async set(value){Object.assign(preferences,value)}},session:{async get(){return {}},async set(){}}},runtime:{async sendMessage(message){requests.push(message);return {ok:false,error:'noField'}}}};
  Object.defineProperty(window.navigator,'clipboard',{value:{async writeText(password){if(clipboardFails)throw new Error('denied');copied.push(password)}}});
  window.historyRequest=async(action,values={})=>{
    requests.push({action,...values});
    if(action==='record'){
      if(recordFails)throw new Error('unavailable');
      records.unshift({id:'test-id',password:values.password,createdAt:Date.now(),action:values.kind});
    }
    if(action==='clear')records.splice(0);
    if(action==='setRetention'){days=values.days;if(days===0)records.splice(0);}
    return {ok:true,entries:[...records],retentionDays:days};
  };
  vm.runInContext(script,dom.getInternalVMContext());await tick();
  const click=async selector=>{window.document.querySelector(selector).click();await tick()};
  return {dom,document:window.document,window,records,requests,copied,preferences,click};
}

test('popup renders six unique passwords; length changes preserve focus and only settings are persisted',async()=>{
  const ui=await setup();
  const initial=[ui.document.querySelector('#main-password').textContent,...[...ui.document.querySelectorAll('.alternative code')].map(e=>e.textContent)];
  assert.equal(new Set(initial).size,6);
  const length=ui.document.querySelector('#length');length.focus();length.value='32';length.dispatchEvent(new ui.window.Event('input',{bubbles:true}));await tick();
  assert.equal(ui.document.activeElement,length);
  assert.equal(ui.document.querySelector('#main-password').textContent.length,32);
  assert.deepEqual(Object.keys(ui.preferences),['options']);
  const hyphen=ui.document.querySelector('#hyphen');hyphen.checked=true;hyphen.dispatchEvent(new ui.window.Event('change',{bubbles:true}));await tick();
  assert.equal(ui.document.querySelector('#main-password').textContent.split('-').length,3);
  const main=ui.document.querySelector('#main-password').textContent;
  await ui.click('[data-action="alternatives"]');
  assert.equal(ui.document.querySelector('#main-password').textContent,main);
  ui.dom.window.close();
});

test('copy is recorded once; history copying does not duplicate it and internal navigation retains the current set',async()=>{
  const ui=await setup();const password=ui.document.querySelector('#main-password').textContent;
  await ui.click('[data-action="copy"][data-index="0"]');
  assert.deepEqual(ui.copied,[password]);assert.equal(ui.records.length,1);
  await ui.click('[data-action="history"]');assert.equal(ui.document.querySelector('.history-line code').textContent,password);
  await ui.click('[data-action="history-copy"]');assert.equal(ui.records.length,1);assert.equal(ui.copied.length,2);
  await ui.click('[data-action="back"]');assert.equal(ui.document.querySelector('#main-password').textContent,password);
  ui.dom.window.close();
});

test('failed clipboard and failed insertion do not create history records',async()=>{
  const ui=await setup({clipboardFails:true});
  await ui.click('[data-action="copy"][data-index="0"]');assert.equal(ui.records.length,0);
  assert.match(ui.document.querySelector('#status').textContent,/Не удалось скопировать/);
  await ui.click('[data-action="insert"][data-index="0"]');assert.equal(ui.records.length,0);
  assert.match(ui.document.querySelector('#status').textContent,/Выберите текстовое поле/);
  assert.equal(ui.requests.filter(request=>request.type==='insert').length,1);
  ui.dom.window.close();
});

test('history failure after successful copying reports partial success without repeating the copy',async()=>{
  const ui=await setup({recordFails:true});await ui.click('[data-action="copy"][data-index="0"]');
  assert.equal(ui.copied.length,1);assert.match(ui.document.querySelector('#status').textContent,/скопирован.*Сохранить в историю не удалось/);
  ui.dom.window.close();
});

test('disabling history requires explicit confirmation and cancel does not send a destructive request',async()=>{
  const ui=await setup();await ui.click('[data-action="settings"]');
  const chooseOff=async()=>{const select=ui.document.querySelector('#retention');select.value='0';select.dispatchEvent(new ui.window.Event('change',{bubbles:true}));await tick()};
  await chooseOff();assert.ok(ui.document.querySelector('[role="alertdialog"]'));
  await ui.click('[data-action="cancel"]');assert.equal(ui.requests.filter(r=>r.action==='setRetention').length,0);
  await chooseOff();await ui.click('[data-action="confirm"]');
  assert.deepEqual(ui.requests.find(r=>r.action==='setRetention'),{action:'setRetention',days:0,confirmed:true});
  ui.dom.window.close();
});
