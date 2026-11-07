export function t(key, substitutions = []) {
  return browser.i18n.getMessage(key, substitutions.map(String));
}

export function uiLanguage() {
  return browser.i18n.getUILanguage().replaceAll('_', '-');
}

export function websiteURL(page) {
  const language=uiLanguage().split('-')[0].toLowerCase();
  const locale=language==='zh'?'zh-Hans':['en','ru','de','fr','es'].includes(language)?language:'en';
  return `https://borzov.github.io/QuietPass/${locale}/${page}.html`;
}
