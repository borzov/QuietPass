import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OPTIONS, validateOptions, generateBatch, generatePassword } from '../../Extension/Resources/generator.js';

test('defaults and options do not accept invalid lengths or flags', () => {
  assert.equal(DEFAULT_OPTIONS.length, 20);
  for (const length of [0, 7, 65, 20.5, NaN, Infinity, '20']) {
    assert.throws(() => validateOptions({...DEFAULT_OPTIONS, length}));
  }
  assert.throws(() => validateOptions({...DEFAULT_OPTIONS, complexity: 'unknown'}));
  assert.throws(() => validateOptions({...DEFAULT_OPTIONS, hyphen: 1}));
  assert.throws(() => validateOptions({...DEFAULT_OPTIONS, special: 'true'}));
});

for (const complexity of ['simple', 'standard', 'complex']) {
  for (const length of [8, 20, 21, 64]) for (const special of [false, true]) for (const hyphen of [false, true]) {
    test(`${complexity}, length ${length}, symbols ${special}, hyphen ${hyphen}`, () => {
      const options = {complexity, length, special, hyphen};
      for (let iteration = 0; iteration < 25; iteration++) {
        const batch = generateBatch(options);
        assert.equal(batch.length, 6);
        assert.equal(new Set(batch).size, 6);
        for (const password of batch) {
          assert.equal(password.length, length);
          assert.match(password, /[a-z]/);
          if (complexity !== 'simple') assert.match(password, /\d/);
          else assert.doesNotMatch(password, /\d/);
          if (complexity === 'complex') assert.match(password, /[A-Z]/);
          else assert.doesNotMatch(password, /[A-Z]/);
          assert.equal(/[!@#$%&*?]/.test(password), special);
          assert.equal(password.includes('-'), hyphen);
          assert.match(password, /^[a-zA-Z0-9!@#$%&*?\-]+$/);
          if (hyphen) {
            const groups = password.split('-');
            assert.equal(groups.length, 3);
            assert.ok(groups.every(group => group.length > 0));
            const sizes = groups.map(group => group.length);
            assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
          }
        }
        const next = generateBatch(options, 6, batch);
        assert.equal(new Set([...batch, ...next]).size, 12);
      }
    });
  }
}

test('twenty characters include two separators and three groups of six', () => {
  assert.deepEqual(generatePassword({...DEFAULT_OPTIONS, hyphen:true}).split('-').map(s => s.length), [6,6,6]);
});
