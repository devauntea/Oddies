// The chat inside the oddie panel. Each oddie keeps its own history on the server.
import { api, setNotice } from './api.js';

export function initChat(panel) {
  const log = panel.querySelector('[data-role="chat-log"]');
  const empty = panel.querySelector('[data-role="chat-empty"]');
  const form = panel.querySelector('[data-role="chat-form"]');
  const input = panel.querySelector('[data-role="chat-input"]');
  const send = panel.querySelector('[data-action="chat-send"]');
  const status = panel.querySelector('[data-role="chat-status"]');
  const error = panel.querySelector('[data-role="chat-error"]');

  let oddie = null;

  function append(message) {
    const item = document.createElement('li');
    item.className = `chat-message chat-message--${message.role}`;
    item.dataset.messageRole = message.role;

    const who = document.createElement('span');
    who.className = 'chat-message__who';
    who.textContent = message.role === 'user' ? 'You' : oddie.name;

    const text = document.createElement('p');
    text.className = 'chat-message__text';
    text.textContent = message.text;

    item.append(who, text);
    log.append(item);
    empty.hidden = true;
    item.scrollIntoView({ block: 'nearest' });
    return item;
  }

  function setBusy(busy) {
    panel.dataset.chatBusy = busy;
    input.disabled = busy;
    send.disabled = busy;
    setNotice(status, busy ? `${oddie.name} is writing…` : '');
  }

  // Shows one oddie's saved conversation.
  async function open(nextOddie) {
    oddie = nextOddie;
    log.replaceChildren();
    empty.hidden = false;
    empty.textContent = `Ask ${oddie.name} what that life was like, what it cost, or what to do first.`;
    setNotice(error, '');
    setNotice(status, '');
    try {
      const { messages } = await api.chatHistory(oddie.id);
      if (oddie.id !== nextOddie.id) return; // another oddie was opened meanwhile
      messages.forEach(append);
    } catch (err) {
      setNotice(error, err.message);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || !oddie || input.disabled) return;
    const askedOf = oddie;

    setNotice(error, '');
    const pending = append({ role: 'user', text });
    setBusy(true);
    try {
      const { reply } = await api.chat(askedOf.id, text);
      input.value = '';
      if (oddie.id === askedOf.id) append({ role: 'oddie', text: reply });
    } catch (err) {
      // Nothing was saved, so take the question back out of the log.
      pending.remove();
      empty.hidden = log.children.length > 0;
      setNotice(error, err.message);
    } finally {
      setBusy(false);
      input.focus();
    }
  });

  // Enter sends, Shift+Enter makes a new line.
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  return { open };
}
