import { t } from './i18n.js';

export function errorMessage(code) { return t(`error_${code}`) || t('error_generic'); }

export async function historyRequest(action, values = {}) {
  let response;
  try { response = await browser.runtime.sendMessage({type:'history', request:{action, ...values}}); }
  catch { throw new Error(errorMessage('nativeUnavailable')); }
  if (!response?.ok) throw new Error(errorMessage(response?.error));
  return response;
}
