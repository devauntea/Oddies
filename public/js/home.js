import { api, setNotice } from './api.js';

const notice = document.querySelector('[data-role="notice"]');
const demoButton = document.querySelector('[data-action="see-demo"]');

// ---------- Opening ----------
// "Oddies" is written out in cursive, then the view moves through it into the
// page. Plays once per browser tab. Skipped entirely under Reduce Motion.
const intro = document.querySelector('[data-role="intro"]');
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
  document.body.classList.add('page--arriving');
  setTimeout(() => intro.remove(), LEAVE_MS);
}

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || seenBefore()) {
  intro.remove();
} else {
  try {
    sessionStorage.setItem(SEEN, '1');
  } catch {
    // private mode: it just plays again next time
  }
  // Wait for the cursive font so the letters are drawn in the right shape,
  // but never for long.
  const start = () => {
    if (intro.classList.contains('intro--writing')) return;
    intro.classList.add('intro--writing');
    setTimeout(leaveIntro, WRITE_MS);
  };
  document.fonts.load('200px Pacifico').then(start, start);
  setTimeout(start, 1200);
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
