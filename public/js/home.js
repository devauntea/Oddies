import { api, setNotice } from './api.js';
import { drawPaths } from './paths.js';

const $ = (selector) => document.querySelector(selector);
const notice = $('[data-role="notice"]');
const demoButton = $('[data-action="see-demo"]');
const hero = $('[data-role="hero"]');
const paths = $('[data-role="paths"]');
const todayDot = $('[data-role="today-dot"]');
const intro = $('[data-role="intro"]');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Below this width the paths sit under the words instead of behind them.
const narrow = window.matchMedia('(max-width: 899px)');

// ---------- The life paths ----------

// Where today is. On wide screens it is the dot after "One you", so the
// paths grow out of the sentence. On narrow screens the drawing has its own
// space and today sits near its left edge.
// Measured from the layout, not from what is on screen right now, so it is
// right even while the words are still sliding into place.
function todayPoint() {
  if (narrow.matches) return { x: Math.round(paths.clientWidth * 0.14), y: Math.round(paths.clientHeight * 0.5) };
  let x = todayDot.offsetWidth / 2;
  let y = todayDot.offsetHeight / 2;
  for (let node = todayDot; node && node !== hero; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

let started = false;

function draw(animate) {
  drawPaths(paths, {
    today: todayPoint(),
    dotRadius: todayDot.offsetWidth / 2,
    em: parseFloat(getComputedStyle(todayDot).fontSize),
    compact: narrow.matches,
    animate: animate && !reduceMotion.matches,
    motion: !reduceMotion.matches,
  });
}

// Runs the entrance: the words rise, then the paths grow out of today.
// Waits for the fonts first, because the dot's position depends on them.
function startHero() {
  if (started) return;
  started = true;
  const go = () => {
    draw(true);
    hero.classList.add('hero--go');
  };
  // Never wait long for fonts: a slow network should not hold the page back.
  Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]).then(go, go);
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  if (!started) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => draw(false), 160);
});
// A late font swap can move the dot. Redraw once everything has settled.
document.fonts.ready.then(() => started && setTimeout(() => draw(false), 3600));

// ---------- Opening ----------
// "Oddies" is written out in cursive, then the view moves through it into the
// page. Plays once per browser tab. Skipped entirely under Reduce Motion.
const SEEN = 'oddies-intro-seen';
const WRITE_MS = 2300; // how long the writing takes before the zoom starts
const LEAVE_MS = 800; // the zoom itself

function seenBefore() {
  try {
    return sessionStorage.getItem(SEEN) === '1';
  } catch {
    return false;
  }
}

function leaveIntro() {
  if (!intro.isConnected || intro.classList.contains('intro--leaving')) return;
  intro.classList.add('intro--leaving');
  // The words start rising while the green is still clearing.
  setTimeout(startHero, 250);
  setTimeout(() => intro.remove(), LEAVE_MS);
}

if (reduceMotion.matches || seenBefore()) {
  intro.remove();
  startHero();
} else {
  try {
    sessionStorage.setItem(SEEN, '1');
  } catch {
    // private mode: it just plays again next time
  }
  // Wait for the cursive font so the letters are drawn in the right shape,
  // but never for long.
  const write = () => {
    if (intro.classList.contains('intro--writing')) return;
    intro.classList.add('intro--writing');
    setTimeout(leaveIntro, WRITE_MS);
  };
  document.fonts.load('200px Pacifico').then(write, write);
  setTimeout(write, 1200);
  intro.addEventListener('click', leaveIntro);
  window.addEventListener('keydown', leaveIntro, { once: true });
}

// ---------- See the demo ----------
// The app holds one person's tree. If someone has replaced the demo with their
// own oddies, ask before putting the demo back.
demoButton.addEventListener('click', async () => {
  demoButton.disabled = true;
  try {
    const state = await api.state();
    if (!state.is_demo) {
      const ok = window.confirm('This replaces the current oddies with the demo set. Continue?');
      if (!ok) return;
      await api.resetDemo();
    }
    window.location.href = '/tree';
  } catch (error) {
    setNotice(notice, error.message);
  } finally {
    demoButton.disabled = false;
  }
});
