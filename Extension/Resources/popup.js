import { DEFAULT_OPTIONS, validateOptions, generateBatch } from './generator.js';
import { historyRequest, errorMessage } from './native.js';

const paths={key:'<circle cx="8" cy="8" r="4"/><path d="m11 11 9 9m-4-4 2-2m-5-1 2-2"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',history:'<path d="M3 4v5h5"/><path d="M4 8a9 9 0 1 1 0 8M12 7v5l3 2"/>',settings:'<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6m8 0v6m-6 0v6"/>',insert:'<rect x="4" y="14" width="16" height="7" rx="2"/><path d="M12 3v12m-4-4 4 4 4-4"/>',back:'<path d="m14 5-7 7 7 7"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const levels=[['simple','Простой'],['standard','Стандартный'],['complex','Сложный']];
const state={options:{...DEFAULT_OPTIONS},passwords:[],entries:[],retentionDays:7,view:'generator',notice:'',busy:false,confirmation:null,historyAvailable:false};
let preferenceWrites=Promise.resolve();
const daysLabel=days=>days===0?'выключена':days===1?'1 день':`${days} дней`;
const button=(name,label,action,index='')=>`<button class="toolbar" type="button" aria-label="${label}" title="${label}" data-action="${action}" data-index="${index}">${icon(name)}</button>`;

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
  if(element)element.textContent=state.historyAvailable?`История: ${daysLabel(state.retentionDays)}`:'История недоступна';
}
function syncPasswords() {
  document.getElementById('main-password').textContent=state.passwords[0];
  document.getElementById('caption').textContent=`Новый пароль · ${state.options.length} символов`;
  document.querySelectorAll('.alternative code').forEach((element,index)=>element.textContent=state.passwords[index+1]);
}
function saveOptions() {
  const options={...state.options};
  preferenceWrites=preferenceWrites.then(()=>browser.storage.local.set({options})).catch(()=>notice('Не удалось запомнить параметры. Повторите изменение.'));
}
function parametersChanged() {
  state.passwords=generateBatch(state.options,6,state.passwords);
  syncPasswords();saveOptions();notice('Параметры сохранены. Пароли обновлены.');
}
function generator() {
  const options=state.options;
  return `<section class="hero" aria-label="Новый пароль"><div class="hero-top"><span id="caption">Новый пароль · ${options.length} символов</span>${button('refresh','Сгенерировать новый пароль','refresh')}</div><p class="password" id="main-password">${escapeHTML(state.passwords[0])}</p><div class="actions"><button class="action" type="button" data-action="copy" data-index="0">${icon('copy')}Скопировать</button><button class="action" type="button" data-action="insert" data-index="0">${icon('insert')}Вставить</button></div></section><fieldset class="configuration"><legend>Параметры пароля</legend><div class="row"><label for="length">Длина пароля</label><input class="number" id="length" type="number" min="8" max="64" step="1" value="${options.length}" aria-label="Количество символов"></div><input class="range" id="range" type="range" min="8" max="64" value="${options.length}" aria-label="Длина пароля"><div class="row"><label for="complexity">Сложность</label><select class="level" id="complexity">${levels.map(([value,title])=>`<option value="${value}"${value===options.complexity?' selected':''}>${title}</option>`).join('')}</select></div><div class="row"><label class="checkbox"><input type="checkbox" id="special"${options.special?' checked':''}>Спецсимволы</label><span class="example">! @ # $ %</span></div><div class="row"><label class="checkbox"><input type="checkbox" id="hyphen"${options.hyphen?' checked':''}>Дефис</label><span class="example" title="Три группы, два разделителя">abc-def-ghi</span></div></fieldset><section aria-label="Пять дополнительных паролей"><h2 class="section-title">Ещё 5 вариантов${button('refresh','Обновить пять вариантов','alternatives')}</h2><ul class="alternatives">${state.passwords.slice(1).map((password,index)=>`<li class="alternative"><code>${escapeHTML(password)}</code>${button('copy',`Скопировать вариант ${index+1}`,'copy',index+1)}${button('insert',`Вставить вариант ${index+1}`,'insert',index+1)}</li>`).join('')}</ul></section>`;
}
function history() {
  return `<section class="secondary"><h1 class="view-title" tabindex="-1">История</h1><p class="note">Только использованные пароли. ${state.historyAvailable?'Срок хранения: '+daysLabel(state.retentionDays)+'.':'Не удалось открыть историю.'}</p>${state.entries.length?state.entries.map((entry,index)=>`<div class="history-row"><div class="history-line"><code>${escapeHTML(entry.password)}</code>${button('copy','Скопировать запись истории','history-copy',index)}</div><small>${escapeHTML(new Date(entry.createdAt).toLocaleString('ru-RU'))} · ${entry.action==='copy'?'Скопирован':'Вставлен'}</small></div>`).join(''):'<div class="empty">'+icon('history')+'<p>Записей пока нет</p></div>'}${state.entries.length?'<button class="plain" type="button" data-action="clear">Очистить историю…</button>':''}</section>`;
}
function settings() {
  return `<section class="secondary"><h1 class="view-title" tabindex="-1">Настройки</h1><p class="note">В историю попадают пароли после копирования или вставки.</p><div class="settings-group row"><label for="retention">Хранить записи</label><select id="retention">${[[0,'Не сохранять'],[1,'1 день'],[7,'7 дней'],[30,'30 дней'],[90,'90 дней']].map(([value,label])=>`<option value="${value}"${state.retentionDays===value?' selected':''}>${label}</option>`).join('')}</select></div><p class="note">Срок применяется ко всем записям со дня их использования. Просроченные записи удаляются при следующем обращении к истории.</p><p class="note">История хранится локально в защищённой Связке ключей. Неиспользованные пароли в историю не попадают.</p><p class="note">Длина включает дефисы. Если дефис включён, пароль разбивается на три группы.</p></section>`;
}
function confirmation() {
  return `<section class="confirmation" role="alertdialog" aria-labelledby="confirm-title"><h1 class="view-title" id="confirm-title" tabindex="-1">${state.confirmation==='off'?'Отключить историю?':'Очистить историю?'}</h1><p class="note">Все сохранённые пароли этого профиля будут удалены. Восстановить их не получится.${state.confirmation==='off'?' Новые пароли не будут сохраняться.':''}</p><div class="actions"><button type="button" class="action" data-action="cancel">Отмена</button><button type="button" class="action" data-action="confirm">${state.confirmation==='off'?'Удалить и отключить':'Удалить историю'}</button></div></section>`;
}
function render(focus=false) {
  document.getElementById('app').innerHTML=`<header class="header">${state.view!=='generator'||state.confirmation?button('back','Вернуться к генератору','back'):''}<div class="title">${icon('key')}QuietPass</div>${button('history','Открыть историю','history')}${button('settings','Открыть настройки','settings')}</header><div class="content">${state.confirmation?confirmation():state.view==='generator'?generator():state.view==='history'?history():settings()}<p class="status" id="status" role="status" aria-live="polite">${escapeHTML(state.notice||'Параметры сохраняются автоматически.')}</p></div><footer class="footer"><span id="retention-info"></span><span>Только использованные пароли</span></footer>`;
  updateFooter();busy(state.busy);
  if(focus){const target=document.querySelector('.view-title')||document.querySelector('.title');target.setAttribute('tabindex','-1');target.focus();}
}
async function record(password,kind,successMessage) {
  try { applyHistory(await historyRequest('record',{password,kind}));notice(successMessage); }
  catch { notice(`${successMessage} Сохранить в историю не удалось.`); }
}
async function act(action,index) {
  if(action==='refresh'){state.passwords[0]=generateBatch(state.options,1,state.passwords)[0];syncPasswords();notice('Новый пароль готов.');return;}
  if(action==='alternatives'){state.passwords=[state.passwords[0],...generateBatch(state.options,5,state.passwords)];syncPasswords();notice('Пять новых вариантов готовы.');return;}
  if(action==='copy'||action==='history-copy'){
    const password=action==='copy'?state.passwords[index]:state.entries[index]?.password;
    if(!password)return;
    try{await navigator.clipboard.writeText(password);}catch{notice('Не удалось скопировать пароль. Повторите попытку.');return;}
    if(action==='copy')await record(password,'copy','Пароль скопирован.');else notice('Пароль скопирован.');
    return;
  }
  if(action==='insert'){
    let response;
    try{response=await browser.runtime.sendMessage({type:'insert',password:state.passwords[index]});}catch{notice(errorMessage('pageUnavailable'));return;}
    if(!response?.ok){notice(errorMessage(response?.error));return;}
    if(response.history?.ok)applyHistory(response.history);
    notice(response.historySaved?'Пароль вставлен.':'Пароль вставлен. Сохранить в историю не удалось.');return;
  }
  if(action==='clear'){state.confirmation='clear';state.notice='';render(true);return;}
  if(action==='confirm'){
    const mode=state.confirmation;
    applyHistory(await historyRequest(mode==='off'?'setRetention':'clear',mode==='off'?{days:0,confirmed:true}:{confirmed:true}));
    state.confirmation=null;state.notice=mode==='off'?'История отключена.':'История очищена.';render(true);return;
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
  if(!element||state.busy)return;
  busy(true);
  try{await act(element.dataset.action,Number(element.dataset.index||0));}catch(error){notice(error.message);}finally{busy(false);}
});
document.addEventListener('input',event=>{
  if(!['length','range'].includes(event.target.id))return;
  const value=Number(event.target.value);
  if(!Number.isInteger(value)||value<8||value>64){event.target.setAttribute('aria-invalid','true');notice('Введите целую длину от 8 до 64 символов.');return;}
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
    try{applyHistory(await historyRequest('setRetention',{days}));notice('Срок хранения изменён.');}
    catch(error){event.target.value=state.retentionDays;notice(error.message);}finally{busy(false);}
  }
});

async function initialize(){
  let storageFailed=false;
  try{const saved=await browser.storage.local.get('options');if(saved.options){try{state.options=validateOptions(saved.options);}catch{/* Use safe defaults for obsolete settings. */}}}catch{storageFailed=true;}
  state.passwords=generateBatch(state.options);render();
  try{applyHistory(await historyRequest('list'));if(storageFailed)notice('Не удалось загрузить параметры. Используются стандартные.');}
  catch(error){notice(error.message);}
}
initialize().catch(()=>{document.getElementById('app').textContent='Не удалось запустить генератор. Закройте и снова откройте QuietPass.';});
