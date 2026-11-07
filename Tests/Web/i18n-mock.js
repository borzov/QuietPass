import fs from 'node:fs';

export const locales=['en','ru','zh_CN','de','fr','es'];
export function catalog(locale){
  return JSON.parse(fs.readFileSync(new URL(`../../Extension/Resources/_locales/${locale}/messages.json`,import.meta.url),'utf8'));
}
export function mockI18n(locale='ru'){
  const english=catalog('en'),selected=catalog(locale);
  return {
    getUILanguage:()=>locale.replaceAll('_','-'),
    getMessage(key,substitutions=[]){
      const entry=selected[key]||english[key];
      if(!entry)return '';
      const values=Array.isArray(substitutions)?substitutions:[substitutions];
      return entry.message.replace(/\$([a-z_]+)\$/gi,(_,name)=>{
        const placeholder=Object.entries(entry.placeholders||{}).find(([key])=>key.toLowerCase()===name.toLowerCase());
        return placeholder?placeholder[1].content:'';
      }).replace(/\$(\d)/g,(_,index)=>String(values[Number(index)-1]??'')).replaceAll('$$','$');
    }
  };
}
