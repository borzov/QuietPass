import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { DEFAULT_OPTIONS, validateOptions, generateBatch } from '../../Extension/Resources/generator.js';
import {locales,mockI18n} from './i18n-mock.js';

const html=fs.readFileSync(new URL('../../Extension/Resources/popup.html',import.meta.url),'utf8');
const script=fs.readFileSync(new URL('../../Extension/Resources/popup.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const localizationScript=fs.readFileSync(new URL('../../Extension/Resources/i18n.js',import.meta.url),'utf8').replace(/^export /gm,'');
const nativeScript=fs.readFileSync(new URL('../../Extension/Resources/native.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({clipboardFails=false,recordFails=false,insertionResult={ok:false,error:'noField'},locale='ru'}={}){
  const dom=new JSDOM(html,{url:'https://quietpass.test/popup.html',runScripts:'outside-only'});
  const {window}=dom,records=[],requests=[],copied=[],preferences={},openedTabs=[];
  let days=7,closeCalls=0;
  const dispose=window.close.bind(window);
  window.close=()=>{closeCalls++};
  window.DEFAULT_OPTIONS=DEFAULT_OPTIONS;window.validateOptions=validateOptions;window.generateBatch=generateBatch;
  window.browser={storage:{local:{async get(){return {}},async set(value){Object.assign(preferences,value)}},session:{async get(){return {}},async set(){}}},runtime:{async sendMessage(message){requests.push(message);return typeof insertionResult==='function'?insertionResult():insertionResult}}};
  window.browser.i18n=mockI18n(locale);
  window.browser.tabs={async create(tab){openedTabs.push(tab);return {id:1}}};
  vm.runInContext(localizationScript+nativeScript,dom.getInternalVMContext());
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
  return {dom,document:window.document,window,records,requests,copied,preferences,openedTabs,click,dispose,closeCalls:()=>closeCalls};
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
  ui.dispose();
});

test('opening the generator does not wake native history; history loads when requested',async()=>{
  const ui=await setup();
  assert.equal(ui.document.querySelector('#main-password').textContent.length,20);
  assert.equal(ui.document.querySelectorAll('.alternative').length,5);
  assert.equal(ui.requests.length,0);
  assert.equal(ui.document.querySelector('#retention-info').textContent,'');
  await ui.click('[data-action="history"]');
  assert.equal(ui.requests.filter(request=>request.action==='list').length,1);
  assert.match(ui.document.querySelector('#retention-info').textContent,/7 дней/);
  ui.dispose();
});

for(const locale of locales){
  test(`generator, history, settings and confirmation are localized in ${locale}`,async()=>{
    const ui=await setup({locale});
    const message=(key,values=[])=>mockI18n(locale).getMessage(key,values);
    assert.equal(ui.document.documentElement.lang,locale.replaceAll('_','-'));
    assert.equal(ui.document.querySelector('legend').textContent,message('passwordOptions'));
    assert.equal(ui.document.querySelector('[data-action="insert"]').textContent.trim(),message('insertPassword'));
    await ui.click('[data-action="copy"][data-index="0"]');
    assert.equal(ui.document.querySelector('#status').textContent,message('copied'));
    await ui.click('[data-action="history"]');
    assert.equal(ui.document.querySelector('h1').textContent,message('historyTitle'));
    assert.ok(ui.document.querySelector('.history-row small').textContent.includes(message('actionCopied')));
    await ui.click('[data-action="clear"]');
    assert.equal(ui.document.querySelector('#confirm-title').textContent,message('clearHistoryTitle'));
    await ui.click('[data-action="cancel"]');
    await ui.click('[data-action="settings"]');
    assert.equal(ui.document.querySelector('h1').textContent,message('settingsTitle'));
    assert.equal(ui.document.querySelector('label[for="retention"]').textContent,message('retentionLabel'));
    if(locale!=='ru')assert.doesNotMatch(ui.document.body.textContent,/[А-Яа-яЁё]/);
    const websiteLocale=locale==='zh_CN'?'zh-Hans':locale;
    for(const page of ['privacy','support']){
      const link=ui.document.querySelector(`a[data-action="${page}"]`);
      const url=`https://borzov.github.io/QuietPass/${websiteLocale}/${page}.html`;
      assert.equal(link?.href,url);
      await ui.click(`a[data-action="${page}"]`);
      assert.equal(ui.openedTabs.at(-1).url,url);
    }
    assert.equal(ui.records.length,1);
    ui.dispose();
  });
}

test('copy is recorded once; history copying does not duplicate it and internal navigation retains the current set',async()=>{
  const ui=await setup();const password=ui.document.querySelector('#main-password').textContent;
  await ui.click('[data-action="copy"][data-index="0"]');
  assert.deepEqual(ui.copied,[password]);assert.equal(ui.records.length,1);
  await ui.click('[data-action="history"]');assert.equal(ui.document.querySelector('.history-line code').textContent,password);
  await ui.click('[data-action="history-copy"]');assert.equal(ui.records.length,1);assert.equal(ui.copied.length,2);
  await ui.click('[data-action="back"]');assert.equal(ui.document.querySelector('#main-password').textContent,password);
  ui.dispose();
});

test('failed clipboard and failed insertion do not create history records',async()=>{
  const ui=await setup({clipboardFails:true});
  await ui.click('[data-action="copy"][data-index="0"]');assert.equal(ui.records.length,0);
  assert.match(ui.document.querySelector('#status').textContent,/Не удалось скопировать/);
  await ui.click('[data-action="insert"][data-index="0"]');assert.equal(ui.records.length,0);
  assert.match(ui.document.querySelector('#status').textContent,/Выберите текстовое поле/);
  assert.equal(ui.requests.filter(request=>request.type==='insert').length,1);
  ui.dispose();
});

test('history failure after successful copying reports partial success without repeating the copy',async()=>{
  const ui=await setup({recordFails:true});await ui.click('[data-action="copy"][data-index="0"]');
  assert.equal(ui.copied.length,1);assert.match(ui.document.querySelector('#status').textContent,/скопирован.*Сохранить в историю не удалось/);
  ui.dispose();
});

test('disabling history requires explicit confirmation and cancel does not send a destructive request',async()=>{
  const ui=await setup();await ui.click('[data-action="settings"]');
  const chooseOff=async()=>{const select=ui.document.querySelector('#retention');select.value='0';select.dispatchEvent(new ui.window.Event('change',{bubbles:true}));await tick()};
  await chooseOff();assert.ok(ui.document.querySelector('[role="alertdialog"]'));
  await ui.click('[data-action="cancel"]');assert.equal(ui.requests.filter(r=>r.action==='setRetention').length,0);
  await chooseOff();await ui.click('[data-action="confirm"]');
  assert.deepEqual(ui.requests.find(r=>r.action==='setRetention'),{action:'setRetention',days:0,confirmed:true});
  ui.dispose();
});

test('popup closes after the background confirms insertion and history handling',async()=>{
  let complete;
  const reply=new Promise(resolve=>{complete=resolve});
  const ui=await setup({insertionResult:()=>reply});
  await ui.click('[data-action="insert"][data-index="0"]');
  assert.equal(ui.closeCalls(),0);
  complete({ok:true,historySaved:true,history:{ok:true,entries:[],retentionDays:7}});
  await tick();
  assert.equal(ui.closeCalls(),1);
  ui.dispose();
});

test('insertion and history failures remain visible instead of closing the popup',async()=>{
  for(const insertionResult of [{ok:false,error:'noField'},{ok:true,historySaved:false}]){
    const ui=await setup({insertionResult});
    await ui.click('[data-action="insert"][data-index="0"]');
    assert.equal(ui.closeCalls(),0);
    assert.ok(ui.document.querySelector('#status').textContent);
    ui.dispose();
  }
});
