function stripPrefix(value='') {
  return String(value || '').trim().replace(/^@+/, '').trim();
}

function fold(value='') {
  return stripPrefix(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeOne(value='') {
  const clean = stripPrefix(value).replace(/\s+/g, ' ').trim();
  return clean ? `@${clean}` : '';
}

function parseString(value='') {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const out = [];
  for (const segment of raw.split(/[,;\n\r]+/)) {
    const part = segment.trim();
    if (!part) continue;
    const matches = part.match(/@[^@,;\n\r]+?(?=\s+@|$)/g);
    if (matches?.length) {
      for (const m of matches) {
        const v = normalizeOne(m);
        if (v) out.push(v);
      }
    } else {
      const v = normalizeOne(part);
      if (v) out.push(v);
    }
  }
  return out;
}

export function repairLegacyCampaignMentions(values=[]) {
  const arr = [];
  const source = Array.isArray(values) ? values : parseString(values);
  for (const raw of source) {
    const v = normalizeOne(raw);
    if (v) arr.push(v);
  }

  const repaired = [];
  for (let i = 0; i < arr.length;) {
    let matched = false;
    for (let j = Math.min(arr.length - 1, i + 4); j >= i + 2; j--) {
      const display = arr.slice(i, j);
      const handle = arr[j];
      const displayFold = display.map(fold).join('');
      const handleFold = fold(handle);
      const displayLooksLikeName = display.length >= 2 && display.every(x => /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(stripPrefix(x)));
      const handleLooksCompact = !/\s/.test(stripPrefix(handle)) && stripPrefix(handle) === stripPrefix(handle).toLocaleLowerCase('pt-BR');
      if (displayLooksLikeName && handleLooksCompact && displayFold && displayFold === handleFold) {
        repaired.push(`@${display.map(stripPrefix).join(' ')}`);
        repaired.push(handle);
        i = j + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      repaired.push(arr[i]);
      i++;
    }
  }

  const seen = new Set();
  return repaired.filter(v => {
    const key = String(v).toLocaleLowerCase('pt-BR');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeCampaignMentions(value=[]) {
  const parsed = Array.isArray(value)
    ? value.flatMap(v => {
        const raw = String(v || '').trim();
        if (raw.startsWith('@') && !/\s+@/.test(raw)) return [normalizeOne(raw)];
        return parseString(raw);
      }).filter(Boolean)
    : parseString(value);
  return repairLegacyCampaignMentions(parsed);
}
