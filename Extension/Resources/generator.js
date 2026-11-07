export const DEFAULT_OPTIONS = Object.freeze({length:20, complexity:'complex', special:true, hyphen:false});

export function validateOptions(options) {
  if (!options || !Number.isInteger(options.length) || options.length < 8 || options.length > 64 ||
      !['simple','standard','complex'].includes(options.complexity) ||
      typeof options.special !== 'boolean' || typeof options.hyphen !== 'boolean') {
    throw new Error('invalidOptions');
  }
  return {length:options.length, complexity:options.complexity, special:options.special, hyphen:options.hyphen};
}

function randomIndex(limit) {
  const value = new Uint32Array(1);
  const ceiling = Math.floor(4294967296 / limit) * limit;
  do { crypto.getRandomValues(value); } while (value[0] >= ceiling);
  return value[0] % limit;
}

export function generatePassword(options) {
  const settings = validateOptions(options);
  const classes = ['abcdefghijklmnopqrstuvwxyz'];
  if (settings.complexity !== 'simple') classes.push('0123456789');
  if (settings.complexity === 'complex') classes.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (settings.special) classes.push('!@#$%&*?');
  const alphabet = classes.join('');
  const count = settings.length - (settings.hyphen ? 2 : 0);
  for (;;) {
    let body = '';
    for (let index = 0; index < count; index++) body += alphabet[randomIndex(alphabet.length)];
    if (!classes.every(characters => [...body].some(character => characters.includes(character)))) continue;
    if (!settings.hyphen) return body;
    const groups = [], base = Math.floor(count / 3), remainder = count % 3;
    let offset = 0;
    for (let index = 0; index < 3; index++) {
      const size = base + (index < remainder ? 1 : 0);
      groups.push(body.slice(offset, offset + size));
      offset += size;
    }
    return groups.join('-');
  }
}

export function generateBatch(options, count = 6, exclude = []) {
  validateOptions(options);
  if (!Number.isInteger(count) || count < 1 || count > 6) throw new Error('invalidBatchSize');
  const seen = new Set(exclude), passwords = [];
  while (passwords.length < count) {
    const password = generatePassword(options);
    if (seen.has(password)) continue;
    seen.add(password);
    passwords.push(password);
  }
  return passwords;
}
