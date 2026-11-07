// Self-contained: Safari serializes this function into the isolated content world.
export function fieldOperation({operation, password, token}) {
  const targetKey = '__quietPassInsertionTarget';
  const activeField = () => {
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
    return element;
  };
  const editable = element => element?.isConnected && !element.disabled && !element.readOnly && (
    element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement &&
      ['text','password','email','url','search','tel'].includes(element.type)));
  if (operation === 'detect') {
    const element = activeField();
    if (!editable(element)) {
      delete globalThis[targetKey];
      return {found:false};
    }
    globalThis[targetKey] = {element, token};
    return {found:true};
  }
  const target = globalThis[targetKey];
  delete globalThis[targetKey];
  if (operation !== 'insert' || typeof password !== 'string' || !target ||
      target.token !== token || target.element !== activeField() || !editable(target.element)) {
    return {ok:false, error:'fieldChanged'};
  }
  const element = target.element;
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, password);
  element.dispatchEvent(new InputEvent('input', {bubbles:true, composed:true, inputType:'insertReplacementText', data:password}));
  element.dispatchEvent(new Event('change', {bubbles:true}));
  return element.value === password ? {ok:true} : {ok:false, error:'fieldRejected'};
}
