#!/usr/bin/env node
// Weekly AI-event refresh → data/events.json
// Window: today → +3 months. Sources:
//   1. confs.tech open dataset (github.com/tech-conferences/conference-data, MIT, PR-reviewed → trusted)
//   2. Any public iCalendar feeds listed in config/sources.json (Luma / Meetup / university calendars …)
// Usage: node scripts/update-events.mjs [--days 92] [--dry]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ical from 'node-ical';
import { regionOf } from '../js/regions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DAYS = +(args[args.indexOf('--days') + 1] || 0) || 92;
const DRY = args.includes('--dry');
const TOKEN = process.env.GITHUB_TOKEN;

const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const from = today.toISOString().slice(0, 10);
const to = new Date(+today + DAYS * 864e5).toISOString().slice(0, 10);

// ---------- AI relevance + topic tagging ----------
const AI_RE = /\b(a\.?i\.?|ai[-\s]?native|artificial intelligence|machine learning|ml(ops|con)?|deep learning|llms?|genai|generative|gpt|agents?|agentic|nlp|computer vision|neural|rag|data science|robotics|copilot|prompt|diffusion|transformers?)\b/i;
const TOPIC_RULES = [
  ['agents', /\bagent(s|ic)?\b/i], ['llm', /\b(llms?|gpt|language model|prompt)\b/i], ['genai', /\b(genai|generative|diffusion)\b/i],
  ['mlops', /\bmlops|production|platform\b/i], ['data', /\bdata\b/i], ['rag', /\brag\b|retrieval/i], ['safety', /safety|ethic|policy|responsible|governance/i],
  ['robotics', /robot/i], ['vision', /vision|multimodal|image/i], ['research', /research|paper|symposium|scientific/i],
  ['coding', /coding|developer|engineering|devs?\b|copilot/i], ['open-source', /open[-\s]?source|open weights/i], ['business', /business|summit|leaders?|enterprise|strategy/i],
  ['security', /secur/i], ['hardware', /hardware|edge|chip|gpu/i], ['community', /meetup|community|builders/i],
];
const topicsFor = text => { const t = TOPIC_RULES.filter(([, re]) => re.test(text)).map(([k]) => k); return t.length ? t.slice(0, 4) : ['ml']; };
const id = (...p) => 'c-' + createHash('sha1').update(p.join('|').toLowerCase()).digest('hex').slice(0, 10);
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const inWindow = (s, e = s) => e >= from && s <= to;

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'ai-event-calendar-updater', ...(TOKEN && url.includes('api.github.com') ? { Authorization: `Bearer ${TOKEN}` } : {}) } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// ---------- Source 1: confs.tech ----------
const FALLBACK_TOPICS = ['data', 'general', 'python', 'devops', 'javascript', 'security', 'opensource', 'leadership', 'product', 'api', 'iot', 'sre', 'testing', 'ux', 'java', 'dotnet', 'typescript'];
async function confsTech() {
  const years = [...new Set([from.slice(0, 4), to.slice(0, 4)])];
  const out = [];
  for (const y of years) {
    let files;
    try { files = (await getJSON(`https://api.github.com/repos/tech-conferences/conference-data/contents/conferences/${y}`)).map(f => f.name); }
    catch { files = FALLBACK_TOPICS.map(t => `${t}.json`); }
    for (const f of files.filter(n => n.endsWith('.json'))) {
      let list; try { list = await getJSON(`https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${y}/${f}`); } catch { continue; }
      for (const c of list) {
        const text = `${c.name} ${c.url}`;
        if (!AI_RE.test(text) || !inWindow(c.startDate, c.endDate)) continue;
        const country = c.country === 'Online' ? '' : (c.country || '');
        const physical = !!(c.city && c.city !== 'Online');
        out.push({
          id: id(c.name, c.startDate), title: c.name.trim(), url: c.url, org: host(c.url),
          startDate: c.startDate, endDate: c.endDate || c.startDate,
          format: physical ? (c.online ? 'hybrid' : 'in-person') : 'virtual',
          city: physical ? c.city : '', country, region: physical ? regionOf(country) : 'Global',
          topics: topicsFor(text), trusted: true, source: 'confs.tech',
          cfpUrl: c.cfpUrl || '', cfpEndDate: c.cfpEndDate || '', price: 'unknown',
          desc: `${c.name} — ${physical ? `${c.city}${country ? ', ' + country : ''}${c.online ? ' and online' : ''}` : 'online'}. Listed on the community-reviewed confs.tech dataset.`,
        });
      }
    }
  }
  return out;
}

// ---------- Source 2: iCal feeds ----------
async function icalFeeds(feeds) {
  const out = [];
  for (const feed of feeds) {
    try {
      const data = await ical.async.fromURL(feed.url);
      for (const v of Object.values(data)) {
        if (v.type !== 'VEVENT' || !v.start) continue;
        const text = `${v.summary} ${v.description || ''}`;
        if (feed.aiOnly !== false && !AI_RE.test(text)) continue;
        const allDay = v.datetype === 'date';
        const s = new Date(v.start), e = new Date(v.end || +s + 36e5);
        const sk = s.toISOString().slice(0, 10);
        if (!inWindow(sk, e.toISOString().slice(0, 10))) continue;
        const loc = String(v.location || '');
        const online = /zoom|meet\.google|teams|online|virtual|youtube|https?:\/\//i.test(loc) || !loc;
        const ev = {
          id: id(feed.name, v.uid || v.summary, sk), title: String(v.summary).trim(), url: v.url?.val || v.url || feed.homepage || '',
          org: feed.org || feed.name, format: feed.format || (online ? 'virtual' : 'in-person'),
          city: online ? '' : loc.split(',').slice(-2, -1)[0]?.trim() || loc, country: feed.country || '',
          region: online ? 'Global' : (feed.region || regionOf(feed.country)), topics: feed.topics || topicsFor(text),
          trusted: !!feed.trusted, source: feed.name, price: feed.price || 'unknown',
          desc: String(v.description || '').replace(/\s+/g, ' ').slice(0, 600),
        };
        if (allDay) { ev.startDate = sk; ev.endDate = new Date(+e - 1).toISOString().slice(0, 10); }
        else { ev.start = s.toISOString(); ev.end = e.toISOString(); }
        out.push(ev);
      }
      console.log(`  ✓ ${feed.name}`);
    } catch (err) { console.warn(`  ✗ ${feed.name}: ${err.message}`); }
  }
  return out;
}

export async function run() {
  console.log(`Updating AI events ${from} → ${to}`);
  const cfg = JSON.parse(await readFile(path.join(ROOT, 'config/sources.json'), 'utf8'));
  const sources = [];
  let events = [];
  if (cfg.confsTech !== false) {
    const c = await confsTech(); events.push(...c);
    sources.push({ name: 'confs.tech', url: 'https://github.com/tech-conferences/conference-data', count: c.length, trusted: true });
    console.log(`  ✓ confs.tech: ${c.length}`);
  }
  const feeds = (cfg.icalFeeds || []).filter(f => f.url && !f.disabled);
  if (feeds.length) {
    const f = await icalFeeds(feeds); events.push(...f);
    feeds.forEach(fd => sources.push({ name: fd.name, url: fd.homepage || fd.url, count: f.filter(e => e.source === fd.name).length, trusted: !!fd.trusted }));
  }
  // dedupe (same title + start date across sources): keep trusted first
  const seen = new Map();
  for (const e of events.sort((a, b) => b.trusted - a.trusted)) {
    const k = e.title.toLowerCase().replace(/[^a-z0-9]/g, '') + (e.startDate || e.start).slice(0, 10);
    if (!seen.has(k)) seen.set(k, e);
  }
  events = [...seen.values()].sort((a, b) => (a.startDate || a.start).localeCompare(b.startDate || b.start));

  const file = path.join(ROOT, 'data/events.json');
  let prev = []; try { prev = JSON.parse(await readFile(file, 'utf8')).events || []; } catch {}
  const prevIds = new Set(prev.map(e => e.id)), nowIds = new Set(events.map(e => e.id));
  const added = events.filter(e => !prevIds.has(e.id)).length, removed = prev.filter(e => !nowIds.has(e.id)).length;

  const out = { generatedAt: new Date().toISOString(), window: { from, to }, sources, count: events.length, events };
  if (!DRY) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(out, null, 1) + '\n'); }
  if (!DRY) await appendRunLog({ ok: true, count: events.length, added, removed, sources: sources.map(s => `${s.name}:${s.count}`) });
  console.log(`Done: ${events.length} events (+${added} / -${removed})${DRY ? ' [dry run]' : ''}`);
  return { count: events.length, added, removed };
}

// data/update-log.json — last 26 runs (≈ 6 months of Mondays), shown in Settings → Logs
async function appendRunLog(entry) {
  const file = path.join(ROOT, 'data/update-log.json');
  let log = { runs: [] }; try { log = JSON.parse(await readFile(file, 'utf8')); } catch {}
  const trigger = { schedule: 'weekly', workflow_dispatch: 'manual run', push: 'push' }[process.env.GITHUB_EVENT_NAME] || process.env.AIEC_TRIGGER || 'manual';
  log.runs = [...(log.runs || []), { at: new Date().toISOString(), trigger, window: { from, to }, ...entry }].slice(-26);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(log, null, 1) + '\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch(async e => { console.error(e); if (!DRY) await appendRunLog({ ok: false, error: String(e.message || e).slice(0, 200) }).catch(() => {}); process.exit(1); });
}
