import { fieldOperation } from './field.js';

async function activeTab() {
  const [tab] = await browser.tabs.query({active:true, currentWindow:true});
  if (!tab?.id) throw new Error('noTab');
  return tab;
}

export async function routeMessage(message, sender) {
  if (sender.tab || sender.id !== browser.runtime.id) return {ok:false, error:'forbidden'};
  try {
    const tab = await activeTab();
    if (tab.incognito) return {ok:false, error:'privateMode'};
    if (message?.type === 'history') {
      return await browser.runtime.sendNativeMessage('com.borzov.QuietPass', message.request);
    }
    if (message?.type !== 'insert' || typeof message.password !== 'string' ||
        message.password.length < 8 || message.password.length > 64) return {ok:false,error:'invalidRequest'};
    const token = crypto.randomUUID();
    const detected = await browser.scripting.executeScript({
      target:{tabId:tab.id, allFrames:true}, func:fieldOperation, args:[{operation:'detect', token}]
    });
    const candidates = detected.filter(frame => frame.result?.found);
    if (candidates.length !== 1) return {ok:false,error:candidates.length?'ambiguousField':'noField'};
    const results = await browser.scripting.executeScript({
      target:{tabId:tab.id, frameIds:[candidates[0].frameId]}, func:fieldOperation,
      args:[{operation:'insert', token, password:message.password}]
    });
    if (results.length !== 1 || results[0].result?.ok !== true) return {ok:false,error:'fieldChanged'};
    // The background completes recording even if the popup closes after insertion.
    try {
      const history = await browser.runtime.sendNativeMessage('com.borzov.QuietPass', {
        action:'record', password:message.password, kind:'insert'
      });
      return {ok:true, historySaved:history?.ok === true, history};
    } catch { return {ok:true,historySaved:false}; }
  } catch { return {ok:false,error:message?.type === 'insert'?'pageUnavailable':'nativeUnavailable'}; }
}

browser.runtime.onMessage.addListener(routeMessage);
