export function t(key, substitutions = []) {
  return browser.i18n.getMessage(key, substitutions.map(String));
}

export function uiLanguage() {
  return browser.i18n.getUILanguage().replaceAll('_', '-');
}
