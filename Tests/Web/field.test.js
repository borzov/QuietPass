import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldOperation } from '../../Extension/Resources/field.js';

class FakeInput {
  constructor() { this.type = 'password'; this.isConnected = true; this.disabled = false; this.readOnly = false; this.events = []; this.stored = 'old'; }
  get value() { return this.stored; }
  set value(value) { this.stored = value; this.usedNativeSetter = true; }
  dispatchEvent(event) { this.events.push(event.type); return true; }
}
class FakeTextarea extends FakeInput {
  get value() { return this.stored; }
  set value(value) { this.stored = value; this.usedNativeSetter = true; }
}
globalThis.HTMLInputElement = FakeInput;
globalThis.HTMLTextAreaElement = FakeTextarea;
globalThis.InputEvent = class extends Event {};

test('detect is read only and insert replaces the selected password with events', () => {
  const input = new FakeInput();
  globalThis.document = {activeElement: input};
  assert.equal(fieldOperation({operation:'detect', token:'one'}).found, true);
  assert.equal(input.value, 'old');
  assert.equal(fieldOperation({operation:'insert', token:'one', password:'newpassword'}).ok, true);
  assert.equal(input.value, 'newpassword');
  assert.equal(input.usedNativeSetter, true);
  assert.deepEqual(input.events, ['input', 'change']);
});

test('readonly, disabled and unsupported controls are rejected', () => {
  for (const changes of [{readOnly:true}, {disabled:true}, {type:'checkbox'}, {type:'number'}]) {
    const input = Object.assign(new FakeInput(), changes);
    globalThis.document = {activeElement:input};
    assert.equal(fieldOperation({operation:'detect', token:'two'}).found, false);
    assert.equal(input.value, 'old');
  }
});

test('open shadow roots and textareas are supported', () => {
  const textarea = new FakeTextarea();
  globalThis.document = {activeElement:{shadowRoot:{activeElement:textarea}}};
  assert.equal(fieldOperation({operation:'detect', token:'shadow'}).found, true);
  assert.equal(fieldOperation({operation:'insert', token:'shadow', password:'shadowpass'}).ok, true);
  assert.equal(textarea.value, 'shadowpass');
});

test('a changed, detached or differently tagged target is never filled', () => {
  for (const change of ['focus', 'detach', 'token']) {
    const input = new FakeInput();
    globalThis.document = {activeElement:input};
    fieldOperation({operation:'detect', token:'before'});
    if (change === 'focus') document.activeElement = new FakeInput();
    if (change === 'detach') input.isConnected = false;
    assert.equal(fieldOperation({operation:'insert', token:change === 'token'?'wrong':'before', password:'badfill'}).ok, false);
    assert.equal(input.value, 'old');
  }
});
