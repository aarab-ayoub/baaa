// windows has no flag emojis: chrome and edge there draw 🇫🇷 as the letters "FR". whether
// this browser draws them is seen by painting one in white, then in black: a real (colored)
// emoji comes out the same both times (the test country-flag-emoji-polyfill uses, MIT)
const EMOJI_FONTS = '"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji",sans-serif';

function paints(emoji: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  g.textBaseline = 'top';
  g.font = `100px ${EMOJI_FONTS}`;
  g.scale(0.01, 0.01);
  const pixel = (color: string) => {
    g.clearRect(0, 0, 100, 100);
    g.fillStyle = color;
    g.fillText(emoji, 0, 0);
    return g.getImageData(0, 0, 1, 1).data.join(',');
  };
  const black = pixel('#000');
  return pixel('#fff') === black && !black.startsWith('0,0,0,');
}

// whenever a flag can't be seen painted, the page takes its flags from our font (globals.css):
// windows, linux without an emoji font, and browsers that blur canvas drawings for privacy
// (brave, tor, firefox resisting fingerprinting). at worst a mac shows twemoji's flags
export function addFlagFontIfNeeded() {
  let native = false;
  try {
    native = paints('🇨🇭');
  } catch {}
  if (!native) document.documentElement.classList.add('flag-font');
}
