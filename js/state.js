// App-level settings: white-label brand + user preferences.
import { load, save } from './store.js';

export const DEFAULT_BRAND = {
  name: 'Aether',
  tagline: 'The AI event calendar',
  mark: 'Æ',
  logoUrl: '',
  accent: '#3b5bfd',
  footer: 'Every AI event, everywhere.',
};

export const ALL_FORMATS = ['virtual', 'on-demand', 'in-person', 'hybrid'];

export const DEFAULT_PREFS = {
  view: 'month',            // month | week | agenda
  tz: '',                   // '' = device timezone
  hour12: 'auto',           // auto | 12 | 24
  trustedOnly: false,
  showSamples: true,        // demo/sample events mixed with live feed
  formats: [...ALL_FORMATS],
  regions: [],
  topics: [],
  price: 'any',             // any | free | paid
  theme: 'auto',            // auto | light | dark
  defaultReminder: 60,      // minutes
  requireAuth: false,       // Face ID / passkey on open
  notifications: false,
  onboarded: false,         // first-launch journey done
  interests: [],            // topics picked during onboarding
};

export const brand = () => load('brand', DEFAULT_BRAND);
export const setBrand = patch => { const b = { ...brand(), ...patch }; save('brand', b); return b; };
export const resetBrand = () => save('brand', DEFAULT_BRAND);

export const prefs = () => load('prefs', DEFAULT_PREFS);
export const setPrefs = patch => { const p = { ...prefs(), ...patch }; save('prefs', p); return p; };

export const deviceTZ = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const tz = () => prefs().tz || deviceTZ();
