const messages = {
  privateMode:'В приватном окне история и вставка недоступны. Можно сгенерировать и скопировать пароль.',
  nativeUnavailable:'Не удалось открыть защищённую историю. Откройте приложение QuietPass и повторите попытку.',
  storageUnavailable:'Защищённая история недоступна. Проверьте, что Связка ключей разблокирована.',
  noTab:'Нет активной вкладки Safari.',
  noField:'Выберите текстовое поле на странице и снова откройте QuietPass.',
  ambiguousField:'Не удалось однозначно определить поле. Используйте копирование.',
  pageUnavailable:'Safari не разрешил доступ к странице. Разрешите доступ расширению к этому сайту или используйте копирование.',
  fieldChanged:'Выбранное поле изменилось или не приняло значение. Выберите его ещё раз.',
  invalidRequest:'Не удалось выполнить действие. Закройте и снова откройте QuietPass.',
  confirmationRequired:'Для удаления истории требуется подтверждение.'
};

export function errorMessage(code) { return messages[code] || 'Не удалось выполнить действие. Повторите попытку.'; }

export async function historyRequest(action, values = {}) {
  let response;
  try { response = await browser.runtime.sendMessage({type:'history', request:{action, ...values}}); }
  catch { throw new Error(errorMessage('nativeUnavailable')); }
  if (!response?.ok) throw new Error(errorMessage(response?.error));
  return response;
}
