import { api, setNotice } from './api.js';

const notice = document.querySelector('[data-role="notice"]');
const demoButton = document.querySelector('[data-action="see-demo"]');

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
