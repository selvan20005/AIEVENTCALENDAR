#!/usr/bin/env node
// Self-hosted scheduler (alternative to GitHub Actions) using the open-source `node-cron` library.
// Runs the updater every Monday 18:00 India Standard Time.  Start: npm run scheduler
import cron from 'node-cron';
import { run } from './update-events.mjs';

const SCHEDULE = process.env.AIEC_CRON || '0 18 * * 1';
const TZ = process.env.AIEC_TZ || 'Asia/Kolkata';

console.log(`AI event updater scheduled: "${SCHEDULE}" (${TZ})`);
cron.schedule(SCHEDULE, async () => {
  try { await run(); } catch (e) { console.error('Update failed:', e); }
}, { timezone: TZ });

if (process.argv.includes('--now')) run();
