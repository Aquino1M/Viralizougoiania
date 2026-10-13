export function finiteMetric(value) {
  if (value === null || value === undefined || (typeof value === 'string'&&!value.trim()) || typeof value === 'boolean' || typeof value === 'object') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function evidenceLevel(comparablePosts = 0) {
  const n = Math.max(0, Number(comparablePosts) || 0);
  if (n < 5) return { key: 'exploracao', label: 'Exploração', autoPromote: false };
  if (n < 20) return { key: 'preliminar', label: 'Sinal preliminar', autoPromote: true };
  return { key: 'consistente', label: 'Evidência mais consistente', autoPromote: true };
}

export const STRICT_WINDOW_TOLERANCE_HOURS = Object.freeze({1:0.5,6:1.5,24:4,72:12});

export function outcomeSampleQuality(ageHours, targetHours) {
  const age = finiteMetric(ageHours), target = finiteMetric(targetHours);
  if (age === null || target === null || target <= 0) return 'unknown';
  const delta = Math.abs(age - target);
  const strictTolerance = STRICT_WINDOW_TOLERANCE_HOURS[target] ?? Math.max(0.5, target * 0.15);
  if (delta <= strictTolerance) return 'on-time';
  if (delta <= Math.max(strictTolerance * 2, target * 0.50)) return 'near';
  return 'late';
}

export function selectOutcomeForWindow(rows = [], targetHours, { strict = false } = {}) {
  const target = Number(targetHours);
  let candidates = (rows || []).filter(row => Number(row?.milestoneHours) === target && finiteMetric(row?.views) !== null);
  if (strict) candidates = candidates.filter(row => outcomeSampleQuality(row?.ageHours, target) === 'on-time');
  if (!candidates.length) return null;
  const qv = q => q === 'on-time' ? 0 : q === 'near' ? 1 : q === 'late' ? 2 : 3;
  return [...candidates].sort((a, b) => {
    const qa = outcomeSampleQuality(a.ageHours, target), qb = outcomeSampleQuality(b.ageHours, target);
    const aa = finiteMetric(a.ageHours), ab = finiteMetric(b.ageHours);
    const da = aa === null ? Number.POSITIVE_INFINITY : Math.abs(aa-target);
    const db = ab === null ? Number.POSITIVE_INFINITY : Math.abs(ab-target);
    return qv(qa)-qv(qb) || da-db || new Date(b.observedAt||b.at||0)-new Date(a.observedAt||a.at||0);
  })[0];
}

const SHORT_TERMS = new Set(['ia','ai','rh','ti','ceo','cfo','cto','mvp','ltv','roi','ux','ui']);
const STOP = new Set(['para','como','mais','isso','esse','essa','sobre','pela','pelo','com','uma','uns','das','dos','que','por','de','do','da','em','no','na','nos','nas','the','and','with','from','this','that','video','vídeo','corte','short']);
const TERM_ALIASES = new Map([
  ['ia', new Set(['ia','inteligenciaartificial'])],
  ['ai', new Set(['ai','artificialintelligence'])],
  ['inteligenciaartificial', new Set(['inteligenciaartificial','ia'])],
  ['artificialintelligence', new Set(['artificialintelligence','ai'])]
]);

export function normalizeTopicText(text = '') {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function topicTerms(text = '') {
  const normalized = normalizeTopicText(text);
  const parts = normalized.split(/\s+/).filter(Boolean);
  const terms = [];
  for (const p of parts) if ((p.length >= 3 || SHORT_TERMS.has(p)) && !STOP.has(p)) terms.push(p);
  for (let size=2; size<=3; size++) {
    for (let i=0;i<=parts.length-size;i++) {
      const slice=parts.slice(i,i+size);
      if(slice.every(p => (!STOP.has(p) || SHORT_TERMS.has(p)))) terms.push(slice.join(''));
    }
  }
  return [...new Set(terms)];
}

export function hashtagMatchesContext(tag = '', contextText = '') {
  const cleanTag = normalizeTopicText(String(tag || '').replace(/^#/, '')).replace(/\s+/g, '');
  if (!cleanTag) return false;
  const terms = new Set(topicTerms(contextText));
  if (terms.has(cleanTag)) return true;
  const aliases = TERM_ALIASES.get(cleanTag);
  if (aliases && [...aliases].some(x=>terms.has(x))) return true;
  return false;
}

export function evidenceMatchesSource(evidence='', sourceText='') {
  const evTerms=topicTerms(evidence), src=new Set(topicTerms(sourceText));
  if(!evTerms.length) return false;
  const meaningful=evTerms.filter(x=>x.length>=3||SHORT_TERMS.has(x));
  if(!meaningful.length) return false;
  const matches=meaningful.filter(x=>src.has(x));
  return meaningful.length<=2 ? matches.length===meaningful.length : matches.length>=Math.min(2, meaningful.length);
}
