// Draws the character in one of her outfits. The art is the team's, taken
// from temporal/preview.html (see rig-art.js). Same person every time: only
// the outfit changes.
import { RIG_ART, RIG_VIEWBOX } from './rig-art.js';

const REST_MOUTH =
  '<path d="M285 215 Q300 221 315 214" fill="none" stroke="#D77B69" stroke-width="2.5" stroke-linecap="round"/>';
// Head and shoulders, for small spaces.
const BUST_VIEWBOX = '105 20 390 430';

const stillPlease = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Puts the character into `svg`. Options:
//   bust: show head and shoulders instead of the whole figure
// Returns { stop() } to end the blinking when the figure is removed.
export function mountRig(svg, outfit, { bust = false } = {}) {
  svg.setAttribute('viewBox', bust ? BUST_VIEWBOX : RIG_VIEWBOX);
  svg.dataset.outfit = RIG_ART[outfit] ? outfit : 'base';
  svg.innerHTML = RIG_ART[outfit] || RIG_ART.base;
  const mouth = svg.querySelector('#mouth');
  if (mouth) mouth.innerHTML = REST_MOUTH;

  // A blink every few seconds, at uneven intervals.
  let timer = null;
  const eyes = [
    [svg.querySelector('#eye-left'), 259, 164],
    [svg.querySelector('#eye-right'), 342, 161],
  ];
  const setEyes = (openness) => {
    for (const [eye, x, y] of eyes) {
      if (eye) eye.setAttribute('transform', `translate(${x} ${y}) scale(1 ${openness}) translate(${-x} ${-y})`);
    }
  };
  const blink = () => {
    if (!svg.isConnected) return;
    if (!stillPlease() && !document.hidden) {
      setEyes(0.08);
      setTimeout(() => setEyes(1), 130);
    }
    timer = setTimeout(blink, 3000 + Math.random() * 3000);
  };
  timer = setTimeout(blink, 2200);

  return { stop: () => clearTimeout(timer) };
}
