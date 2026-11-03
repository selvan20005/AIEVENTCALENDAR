// Event data layer.
//  1. Live feed: data/events.json — refreshed weekly by scripts/update-events.mjs (GitHub Actions cron).
//  2. Sample events: recurring virtual sessions + on-demand courses, clearly flagged `sample: true`.
import { prefs } from './state.js';
import { dayKey, addDays } from './time.js';

import { REGIONS, regionOf } from './regions.js';
export { REGIONS, regionOf };

export const TOPIC_LABELS = {
  llm: 'LLMs', agents: 'Agents', genai: 'GenAI', ml: 'Machine learning', mlops: 'MLOps', data: 'Data', rag: 'RAG',
  safety: 'Safety & policy', robotics: 'Robotics', vision: 'Vision', research: 'Research', coding: 'AI for code',
  'open-source': 'Open source', business: 'Business', community: 'Community', hardware: 'Hardware', security: 'Security',
};

const LEARN = {
  llm: 'How frontier and small language models are trained, evaluated and served',
  agents: 'Designing tool-using agents, planning loops and guardrails',
  genai: 'Shipping generative features users actually return to',
  ml: 'Core ML techniques that hold up in production',
  mlops: 'Pipelines, monitoring and cost control for models in prod',
  data: 'Data quality, pipelines and governance for AI',
  rag: 'Retrieval, chunking and evaluation for grounded answers',
  safety: 'Evals, red-teaming and the policy landscape',
  robotics: 'Robot learning, sim-to-real and embodied foundation models',
  vision: 'Multimodal and computer-vision systems',
  research: 'Reading and reproducing this month’s key papers',
  coding: 'AI pair programming and code-generation workflows',
  'open-source': 'Working with open-weights models and tooling',
  business: 'Strategy, ROI and adoption across teams',
  community: 'Meeting builders and finding collaborators',
  hardware: 'Accelerators, inference and edge deployment',
  security: 'Securing AI systems and AI for security',
};
export const learnFor = ev => (ev.topics || []).map(t => LEARN[t]).filter(Boolean).slice(0, 4);

// ---------- Sample (demo) events ----------
const ORGS = [
  { n: 'Frontier Systems Lab', t: 1 }, { n: 'Open Model Collective', t: 1 }, { n: 'AI Safety Forum', t: 1 },
  { n: 'Applied ML Guild', t: 1 }, { n: 'Robotics Learning Network', t: 1 }, { n: 'GenAI Growth Hub', t: 0 },
];
// [slug, title, orgIdx, weekday(0=Sun), 'HH:MM' UTC, durationMin, topics]
const SERIES = [
  ['paper-club', 'LLM Paper Club', 1, 4, '16:00', 60, ['llm', 'research']],
  ['agents-oh', 'Agents Office Hours', 0, 2, '14:00', 45, ['agents', 'llm']],
  ['apac-coffee', 'APAC AI Coffee Chat', 3, 3, '01:30', 45, ['community']],
  ['robot-reading', 'Robotics Reading Group', 4, 5, '13:00', 60, ['robotics', 'research']],
  ['safety-sync', 'Safety Evals Sync', 2, 1, '15:00', 50, ['safety']],
  ['rag-clinic', 'RAG Clinic (live Q&A)', 3, 3, '17:30', 60, ['rag', 'llm']],
  ['mena-builders', 'MENA AI Builders Call', 3, 0, '15:00', 60, ['community', 'genai']],
  ['india-ml', 'India ML Evening Talks', 3, 1, '13:30', 60, ['ml', 'mlops']],
  ['open-weights', 'Open Weights Weekly', 1, 6, '15:00', 45, ['open-source', 'llm']],
  ['hype', 'AI Side-Hustle Webinar', 5, 1, '18:00', 30, ['business']],
];
const ON_DEMAND = [
  ['od-prompt', 'Prompt Engineering Fundamentals', 3, ['llm', 'genai'], 'Beginner'],
  ['od-evals', 'Evaluating LLM Agents', 2, ['agents', 'safety'], 'Advanced'],
  ['od-ft', 'Fine-tuning Small Models', 1, ['llm', 'open-source'], 'Intermediate'],
  ['od-rl', 'Robot Learning 101', 4, ['robotics'], 'Beginner'],
];

function buildSamples(todayKey) {
  const out = [];
  const from = addDays(todayKey, -14), days = 100;
  for (let i = 0; i < days; i++) {
    const k = addDays(from, i);
    const wd = new Date(k + 'T00:00:00Z').getUTCDay();
    SERIES.forEach(([slug, title, o, w, hm, dur, topics]) => {
      if (w !== wd) return;
      const start = new Date(`${k}T${hm}:00Z`);
      const org = ORGS[o];
      out.push({
        id: `s-${slug}-${k.replace(/-/g, '')}`, title, org: org.n, trusted: !!org.t, sample: true, source: 'Sample data',
        start, end: new Date(+start + dur * 6e4), allDay: false, fmt: 'virtual', city: '', country: '', region: 'Global',
        topics, price: o === 5 ? 'paid' : 'free', level: 'All levels', series: 'Weekly',
        desc: `${title} is a weekly live session hosted online by ${org.n}. Join from anywhere — bring questions.`,
        url: '',
      });
    });
  }
  ON_DEMAND.forEach(([id, title, o, topics, level], i) => {
    const k = addDays(todayKey, i * 9 - 3);
    out.push({
      id: `s-${id}`, title, org: ORGS[o].n, trusted: !!ORGS[o].t, sample: true, source: 'Sample data',
      startKey: k, endKey: k, allDay: true, fmt: 'on-demand', start: new Date(k + 'T00:00:00Z'), end: new Date(k + 'T23:59:00Z'),
      availableUntil: addDays(k, 90), city: '', country: '', region: 'Global', topics, price: 'free', level,
      desc: `Self-paced course by ${ORGS[o].n}. Released ${k}; watch any time over the next 90 days.`, url: '',
    });
  });
  return out;
}

// ---------- Live feed ----------
function normalizeLive(e) {
  const allDay = !e.start;
  const ev = {
    id: e.id, title: e.title, org: e.org || '', trusted: !!e.trusted, sample: false, source: e.source || 'Feed',
    allDay, fmt: e.format || 'in-person', city: e.city || '', country: e.country || '',
    region: e.region || regionOf(e.country), topics: e.topics || [], price: e.price || 'unknown', level: e.level || 'All levels',
    desc: e.desc || '', url: e.url || '', cfpUrl: e.cfpUrl || '', cfpEndDate: e.cfpEndDate || '',
  };
  if (allDay) {
    ev.startKey = e.startDate; ev.endKey = e.endDate || e.startDate;
    ev.start = new Date(ev.startKey + 'T00:00:00Z'); ev.end = new Date(ev.endKey + 'T23:59:00Z');
  } else {
    ev.start = new Date(e.start); ev.end = new Date(e.end || +ev.start + 36e5);
  }
  return ev;
}

let _all = null, _meta = null, _promise = null;
export function loadEvents() {
  if (_promise) return _promise;
  _promise = (async () => {
    let live = [];
    try {
      const res = await fetch('data/events.json', { cache: 'no-cache' });
      if (res.ok) { const j = await res.json(); _meta = { generatedAt: j.generatedAt, sources: j.sources, window: j.window }; live = (j.events || []).map(normalizeLive); }
    } catch { /* offline or file:// — samples only */ }
    const today = dayKey(new Date(), 'UTC');
    _all = [...live, ...buildSamples(today)].sort((a, b) => a.start - b.start);
    return _all;
  })();
  return _promise;
}
export const feedMeta = () => _meta;
export const allEvents = () => _all || [];
export const getEvent = id => allEvents().find(e => e.id === id) || null;

// Which day keys an event covers in the given tz (multi-day conferences span days).
export function eventDays(ev, tz) {
  if (ev.allDay) {
    const out = []; let k = ev.startKey;
    for (let i = 0; i < 14 && k <= ev.endKey; i++, k = addDays(k, 1)) out.push(k);
    return out;
  }
  return [dayKey(ev.start, tz)];
}

export function filterEvents(list, f = prefs(), query = '') {
  const q = query.trim().toLowerCase();
  return list.filter(ev => {
    if (!f.showSamples && ev.sample) return false;
    if (f.trustedOnly && !ev.trusted) return false;
    if (f.formats?.length && !f.formats.includes(ev.fmt)) return false;
    if (f.regions?.length && !f.regions.includes(ev.region)) return false;
    if (f.topics?.length && !ev.topics.some(t => f.topics.includes(t))) return false;
    if (f.price === 'free' && ev.price !== 'free') return false;
    if (f.price === 'paid' && ev.price !== 'paid') return false;
    if (q && !`${ev.title} ${ev.org} ${ev.city} ${ev.country} ${ev.topics.join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function statusOf(ev, now = Date.now()) {
  if (ev.fmt === 'on-demand') return now >= +ev.start ? 'available' : 'upcoming';
  if (now >= +ev.start && now <= +ev.end) return 'live';
  if (now > +ev.end) return 'past';
  if (+ev.start - now < 3 * 36e5 && !ev.allDay) return 'soon';
  return 'upcoming';
}
