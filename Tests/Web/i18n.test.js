import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog,locales,mockI18n} from './i18n-mock.js';

test('all six catalogs have the same complete key and placeholder sets',()=>{
  const english=catalog('en');
  for(const locale of locales){
    const messages=catalog(locale);
    assert.deepEqual(Object.keys(messages).sort(),Object.keys(english).sort(),locale);
    for(const [key,entry] of Object.entries(messages)){
      assert.ok(entry.message.trim(),`${locale}:${key}`);
      assert.deepEqual(Object.keys(entry.placeholders||{}).sort(),Object.keys(english[key].placeholders||{}).sort(),`${locale}:${key}`);
      for(const match of entry.message.matchAll(/\$([a-z_]+)\$/gi)){
        assert.ok(Object.keys(entry.placeholders||{}).some(name=>name.toLowerCase()===match[1].toLowerCase()),`${locale}:${key}:${match[1]}`);
      }
    }
    const translated=mockI18n(locale).getMessage('newPasswordCaption',['21']);
    assert.ok(translated.includes('21'));assert.doesNotMatch(translated,/\$[a-z_]+\$/i);
  }
});

test('manifest and JavaScript message keys resolve in the English fallback catalog',()=>{
  const english=catalog('en');
  const manifest=JSON.parse(fs.readFileSync(new URL('../../Extension/Resources/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.default_locale,'en');
  for(const match of JSON.stringify(manifest).matchAll(/__MSG_([\w]+)__/g))assert.ok(english[match[1]],match[1]);
  for(const file of ['popup.js','native.js']){
    const source=fs.readFileSync(new URL(`../../Extension/Resources/${file}`,import.meta.url),'utf8');
    for(const match of source.matchAll(/\b(?:t|tx)\('([^']+)'\s*[,)]/g))assert.ok(english[match[1]],`${file}:${match[1]}`);
  }
});

test('the shared native string catalog covers all six languages',()=>{
  const native=JSON.parse(fs.readFileSync(new URL('../../Shared/Localizable.xcstrings',import.meta.url),'utf8'));
  assert.equal(native.sourceLanguage,'en');
  for(const [key,entry] of Object.entries(native.strings)){
    for(const locale of ['en','ru','zh-Hans','de','fr','es'])assert.ok(entry.localizations[locale]?.stringUnit?.value.trim(),`${locale}:${key}`);
  }
});
