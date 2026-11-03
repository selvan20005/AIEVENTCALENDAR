// Pure module (no DOM) — shared by the browser app and the Node updater.
export const REGIONS = ['Global', 'Americas', 'Europe', 'Middle East & Africa', 'Asia-Pacific'];

const COUNTRY_REGION = {
  'U.S.A.': 'Americas', USA: 'Americas', 'United States': 'Americas', Canada: 'Americas', Brazil: 'Americas', Mexico: 'Americas', Argentina: 'Americas', Chile: 'Americas', Colombia: 'Americas',
  'U.K.': 'Europe', UK: 'Europe', 'United Kingdom': 'Europe', Germany: 'Europe', France: 'Europe', Spain: 'Europe', Italy: 'Europe', Netherlands: 'Europe', Switzerland: 'Europe', Poland: 'Europe', Sweden: 'Europe', Norway: 'Europe', Denmark: 'Europe', Finland: 'Europe', Belgium: 'Europe', Austria: 'Europe', Portugal: 'Europe', Ireland: 'Europe', 'Czech Republic': 'Europe', Romania: 'Europe', Greece: 'Europe', Ukraine: 'Europe', Hungary: 'Europe', Lithuania: 'Europe', Estonia: 'Europe', Latvia: 'Europe', Serbia: 'Europe', Croatia: 'Europe', Bulgaria: 'Europe', Slovenia: 'Europe', Luxembourg: 'Europe',
  'United Arab Emirates': 'Middle East & Africa', UAE: 'Middle East & Africa', Qatar: 'Middle East & Africa', 'Saudi Arabia': 'Middle East & Africa', Israel: 'Middle East & Africa', Egypt: 'Middle East & Africa', Nigeria: 'Middle East & Africa', Kenya: 'Middle East & Africa', 'South Africa': 'Middle East & Africa', Morocco: 'Middle East & Africa', Turkey: 'Middle East & Africa', Bahrain: 'Middle East & Africa', Oman: 'Middle East & Africa', Kuwait: 'Middle East & Africa', Jordan: 'Middle East & Africa', Ghana: 'Middle East & Africa', Rwanda: 'Middle East & Africa',
  India: 'Asia-Pacific', Japan: 'Asia-Pacific', China: 'Asia-Pacific', Singapore: 'Asia-Pacific', Australia: 'Asia-Pacific', 'New Zealand': 'Asia-Pacific', 'South Korea': 'Asia-Pacific', Korea: 'Asia-Pacific', Taiwan: 'Asia-Pacific', Indonesia: 'Asia-Pacific', Vietnam: 'Asia-Pacific', Thailand: 'Asia-Pacific', Malaysia: 'Asia-Pacific', Philippines: 'Asia-Pacific', Nepal: 'Asia-Pacific', 'Sri Lanka': 'Asia-Pacific', Pakistan: 'Asia-Pacific', Bangladesh: 'Asia-Pacific', 'Hong Kong': 'Asia-Pacific',
};
export const regionOf = country => (country ? COUNTRY_REGION[country] || 'Global' : 'Global');

