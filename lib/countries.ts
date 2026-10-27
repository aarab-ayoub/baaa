// campus countries as the api spells them -> ISO code, which is all a flag emoji needs
export const COUNTRY_CODES: Record<string, string> = {
  Angola: 'AO', Armenia: 'AM', Australia: 'AU', Austria: 'AT', Belgium: 'BE', Brazil: 'BR', Canada: 'CA',
  'Czech Republic': 'CZ', Finland: 'FI', France: 'FR', Germany: 'DE', Italy: 'IT', Japan: 'JP', Jordan: 'JO',
  'Korea, Republic of': 'KR', Lebanon: 'LB', Luxembourg: 'LU', Madagascar: 'MG', Malaysia: 'MY', Morocco: 'MA',
  Netherlands: 'NL', 'Palestine, State of': 'PS', Poland: 'PL', Portugal: 'PT', Singapore: 'SG', Spain: 'ES',
  Switzerland: 'CH', Thailand: 'TH', Turkey: 'TR', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
};

// two regional-indicator letters make a flag
export function flag(country?: string) {
  const cc = country && COUNTRY_CODES[country];
  return cc ? String.fromCodePoint(...[...cc].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : '';
}

// "Korea, Republic of" -> "Korea"
export const countryName = (country?: string) => (country || '?').split(',')[0];
