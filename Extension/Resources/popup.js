import { DEFAULT_OPTIONS, validateOptions, generateBatch } from './generator.js';
import { historyRequest, errorMessage } from './native.js';
import { t, uiLanguage, websiteURL } from './i18n.js';

const paths={key:'<circle cx="8" cy="8" r="4"/><path d="m11 11 9 9m-4-4 2-2m-5-1 2-2"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',history:'<path d="M3 4v5h5"/><path d="M4 8a9 9 0 1 1 0 8M12 7v5l3 2"/>',settings:'<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6m8 0v6m-6 0v6"/>',insert:'<rect x="4" y="14" width="16" height="7" rx="2"/><path d="M12 3v12m-4-4 4 4 4-4"/>',back:'<path d="m14 5-7 7 7 7"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const tx=(key,substitutions=[])=>escapeHTML(t(key,substitutions));
const levels=['simple','standard','complex'];
const state={options:{...DEFAULT_OPTIONS},passwords:[],entries:[],retentionDays:7,view:'generator',notice:'',busy:false,confirmation:null,historyAvailable:false};
let preferenceWrites=Promise.resolve();
const daysLabel=days=>days===0?t('historyOff'):days===1?t('retentionOneDay'):t('retentionDays',[days]);
const button=(name,label,action,index='')=>`<button class="toolbar" type="button" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}" data-action="${action}" data-index="${index}">${icon(name)}</button>`;

function notice(text) {
  state.notice=text;
  const element=document.getElementById('status');
  if(element)element.textContent=text;
}
function busy(value) {
  state.busy=value;
  document.querySelectorAll('button,input,select').forEach(element=>element.disabled=value);
  document.getElementById('app').setAttribute('aria-busy',String(value));
}
function applyHistory(response) {
  state.entries=response.entries;
  state.retentionDays=response.retentionDays;
  state.historyAvailable=true;
  updateFooter();
}
function updateFooter() {
  const element=document.getElementById('retention-info');
  if(element)element.textContent=state.historyAvailable?t('historyFooter',[daysLabel(state.retentionDays)]):'';
}
function syncPasswords() {
  document.getElementById('main-password').textContent=state.passwords[0];
  document.getElementById('caption').textContent=t('newPasswordCaption',[state.options.length]);
  document.querySelectorAll('.alternative code').forEach((element,index)=>element.textContent=state.passwords[index+1]);
}
function saveOptions() {
  const options={...state.options};
  preferenceWrites=preferenceWrites.then(()=>browser.storage.local.set({options})).catch(()=>notice(t('preferencesSaveFailed')));
}
function parametersChanged() {
  state.passwords=generateBatch(state.options,6,state.passwords);
  syncPasswords();saveOptions();notice(t('parametersUpdated'));
}
function generator() {
  const options=state.options;
  return `<section class="hero" aria-label="${tx('newPassword')}">
    <div class="hero-top"><span id="caption">${tx('newPasswordCaption',[options.length])}</span>${button('refresh',t('generateNewPassword'),'refresh')}</div>
    <p class="password" id="main-password">${escapeHTML(state.passwords[0])}</p>
    <div class="actions"><button class="action" type="button" data-action="copy" data-index="0">${icon('copy')}${tx('copyPassword')}</button><button class="action" type="button" data-action="insert" data-index="0">${icon('insert')}${tx('insertPassword')}</button></div>
  </section><fieldset class="configuration"><legend>${tx('passwordOptions')}</legend>
    <div class="row"><label for="length">${tx('lengthLabel')}</label><input class="number" id="length" type="number" min="8" max="64" step="1" value="${options.length}" aria-label="${tx('lengthAccessible')}"></div>
    <input class="range" id="range" type="range" min="8" max="64" value="${options.length}" aria-label="${tx('lengthLabel')}">
    <div class="row"><label for="complexity">${tx('complexityLabel')}</label><select class="level" id="complexity">${levels.map(value=>`<option value="${value}"${value===options.complexity?' selected':''}>${tx('complexity_'+value)}</option>`).join('')}</select></div>
    <div class="row"><label class="checkbox"><input type="checkbox" id="special"${options.special?' checked':''}>${tx('specialCharacters')}</label><span class="example">! @ # $ %</span></div>
    <div class="row"><label class="checkbox"><input type="checkbox" id="hyphen"${options.hyphen?' checked':''}>${tx('hyphenLabel')}</label><span class="example" title="${tx('hyphenHint')}">abc-def-ghi</span></div>
  </fieldset><section aria-label="${tx('morePasswords')}"><h2 class="section-title">${tx('morePasswords')}${button('refresh',t('refreshAlternatives'),'alternatives')}</h2>
    <ul class="alternatives">${state.passwords.slice(1).map((password,index)=>`<li class="alternative"><code>${escapeHTML(password)}</code>${button('copy',t('copyAlternative',[index+1]),'copy',index+1)}${button('insert',t('insertAlternative',[index+1]),'insert',index+1)}</li>`).join('')}</ul>
  </section>`;
}
function history() {
  const description=state.historyAvailable?(state.retentionDays===0?t('historyDisabled'):t('historyDescription',[daysLabel(state.retentionDays)])):t('historyUnavailableDescription');
  return `<section class="secondary"><h1 class="view-title" tabindex="-1">${tx('historyTitle')}</h1><p class="note">${escapeHTML(description)}</p>
    ${state.entries.length?state.entries.map((entry,index)=>`<div class="history-row"><div class="history-line"><code>${escapeHTML(entry.password)}</code>${button('copy',t('historyCopy'),'history-copy',index)}</div><small>${escapeHTML(new Date(entry.createdAt).toLocaleString(uiLanguage()))} · ${tx(entry.action==='copy'?'actionCopied':'actionInserted')}</small></div>`).join(''):`<div class="empty">${icon('history')}<p>${tx('historyEmpty')}</p></div>`}
    ${state.entries.length?`<button class="plain" type="button" data-action="clear">${tx('clearHistoryButton')}</button>`:''}</section>`;
}
function settings() {
  return `<section class="secondary"><h1 class="view-title" tabindex="-1">${tx('settingsTitle')}</h1><p class="note">${tx('settingsDescription')}</p>
    <div class="settings-group row"><label for="retention">${tx('retentionLabel')}</label><select id="retention">${[0,1,7,30,90].map(value=>`<option value="${value}"${state.retentionDays===value?' selected':''}>${escapeHTML(value===0?t('retentionOff'):daysLabel(value))}</option>`).join('')}</select></div>
    <p class="note">${tx('retentionExplanation')}</p><p class="note">${tx('privacyExplanation')}</p><p class="note">${tx('hyphenExplanation')}</p>
    <nav class="legal-links"><a href="${websiteURL('privacy')}" data-action="privacy" target="_blank" rel="noopener noreferrer">${tx('privacyPolicy')}</a><a href="${websiteURL('support')}" data-action="support" target="_blank" rel="noopener noreferrer">${tx('support')}</a></nav></section>`;
}
function confirmation() {
  const off=state.confirmation==='off';
  return `<section class="confirmation" role="alertdialog" aria-labelledby="confirm-title"><h1 class="view-title" id="confirm-title" tabindex="-1">${tx(off?'disableHistoryTitle':'clearHistoryTitle')}</h1><p class="note">${tx(off?'disableConfirmation':'clearConfirmation')}</p><div class="actions"><button type="button" class="action" data-action="cancel">${tx('cancel')}</button><button type="button" class="action" data-action="confirm">${tx(off?'deleteAndDisable':'deleteHistory')}</button></div></section>`;
}
function render(focus=false) {
  document.getElementById('app').innerHTML=`<header class="header">${state.view!=='generator'||state.confirmation?button('back',t('backToGenerator'),'back'):''}<div class="title">${icon('key')}QuietPass</div>${button('history',t('openHistory'),'history')}${button('settings',t('openSettings'),'settings')}</header><div class="content">${state.confirmation?confirmation():state.view==='generator'?generator():state.view==='history'?history():settings()}<p class="status" id="status" role="status" aria-live="polite">${escapeHTML(state.notice||t('parametersSaved'))}</p></div><footer class="footer"><span id="retention-info"></span><span>${tx('usedPasswordsOnly')}</span></footer>`;
  updateFooter();busy(state.busy);
  if(focus){const target=document.querySelector('.view-title')||document.querySelector('.title');target.setAttribute('tabindex','-1');target.focus();}
}
async function record(password,kind,successMessage) {
  try { applyHistory(await historyRequest('record',{password,kind}));notice(successMessage); }
  catch { notice(t('copyHistoryFailed')); }
}
async function act(action,index) {
  if(action==='privacy'||action==='support'){
    try{await browser.tabs.create({url:websiteURL(action)});window.close();}catch{notice(t('openLinkFailed'));}
    return;
  }
  if(action==='refresh'){state.passwords[0]=generateBatch(state.options,1,state.passwords)[0];syncPasswords();notice(t('newPasswordReady'));return;}
  if(action==='alternatives'){state.passwords=[state.passwords[0],...generateBatch(state.options,5,state.passwords)];syncPasswords();notice(t('alternativesReady'));return;}
  if(action==='copy'||action==='history-copy'){
    const password=action==='copy'?state.passwords[index]:state.entries[index]?.password;
    if(!password)return;
    try{await navigator.clipboard.writeText(password);}catch{notice(t('clipboardError'));return;}
    if(action==='copy')await record(password,'copy',t('copied'));else notice(t('copied'));
    return;
  }
  if(action==='insert'){
    let response;
    try{response=await browser.runtime.sendMessage({type:'insert',password:state.passwords[index]});}catch{notice(errorMessage('pageUnavailable'));return;}
    if(!response?.ok){notice(errorMessage(response?.error));return;}
    if(response.history?.ok)applyHistory(response.history);
    notice(t(response.historySaved?'inserted':'insertHistoryFailed'));
    if(response.historySaved)window.close();
    return;
  }
  if(action==='clear'){state.confirmation='clear';state.notice='';render(true);return;}
  if(action==='confirm'){
    const mode=state.confirmation;
    applyHistory(await historyRequest(mode==='off'?'setRetention':'clear',mode==='off'?{days:0,confirmed:true}:{confirmed:true}));
    state.confirmation=null;state.notice=t(mode==='off'?'historyDisabled':'historyCleared');render(true);return;
  }
  if(action==='cancel'){state.confirmation=null;state.notice='';render(true);return;}
  state.confirmation=null;state.notice='';
  if(action==='back')state.view='generator';
  else if(action==='history'||action==='settings'){
    state.view=action;
    try{applyHistory(await historyRequest('list'));}catch(error){state.entries=[];state.historyAvailable=false;state.notice=error.message;}
  }else return;
  render(true);
}

document.addEventListener('click',async event=>{
  const element=event.target.closest('[data-action]');
  if(!element)return;
  event.preventDefault();
  if(state.busy)return;
  busy(true);
  try{await act(element.dataset.action,Number(element.dataset.index||0));}catch(error){notice(error.message);}finally{busy(false);}
});
document.addEventListener('input',event=>{
  if(!['length','range'].includes(event.target.id))return;
  const value=Number(event.target.value);
  if(!Number.isInteger(value)||value<8||value>64){event.target.setAttribute('aria-invalid','true');notice(t('invalidLength'));return;}
  event.target.removeAttribute('aria-invalid');state.options.length=value;
  document.getElementById('length').value=value;document.getElementById('range').value=value;parametersChanged();
});
document.addEventListener('change',async event=>{
  const id=event.target.id;
  if(id==='length'){event.target.value=state.options.length;event.target.removeAttribute('aria-invalid');}
  else if(id==='complexity'){state.options.complexity=event.target.value;parametersChanged();}
  else if(id==='special'||id==='hyphen'){state.options[id]=event.target.checked;parametersChanged();}
  else if(id==='retention'){
    const days=Number(event.target.value);
    if(days===0){state.confirmation='off';state.notice='';render(true);return;}
    busy(true);
    try{applyHistory(await historyRequest('setRetention',{days}));notice(t('retentionChanged'));}
    catch(error){event.target.value=state.retentionDays;notice(error.message);}finally{busy(false);}
  }
});

async function initialize(){
  document.documentElement.lang=uiLanguage();
  document.title=t('extensionName');
  document.querySelector('.loading').textContent=t('loading');
  let storageFailed=false;
  try{const saved=await browser.storage.local.get('options');if(saved.options){try{state.options=validateOptions(saved.options);}catch{/* Use safe defaults for obsolete settings. */}}}catch{storageFailed=true;}
  state.passwords=generateBatch(state.options);render();
  if(storageFailed)notice(t('preferencesLoadFailed'));
}
initialize().catch(()=>{document.getElementById('app').textContent=t('startupError');});
