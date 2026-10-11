// Every call to the server goes through here. Throws an Error with .code and
// .status when the server answers with an error.
async function request(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const error = new Error('Could not reach the server. Check your connection and try again.');
    error.code = 'network';
    throw error;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.code = data.error || 'server_error';
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  state: () => request('GET', '/api/state'),
  intake: (text) => request('POST', '/api/intake', { text }),
  saveOddies: (payload) => request('POST', '/api/oddies', payload),
  addOddie: (oddie) => request('POST', '/api/oddies/add', oddie),
  updateOddie: (id, patch) => request('PATCH', `/api/oddies/${id}`, patch),
  deleteOddie: (id) => request('DELETE', `/api/oddies/${id}`),
  chatHistory: (id) => request('GET', `/api/oddies/${id}/chat`),
  chat: (id, text) => request('POST', `/api/oddies/${id}/chat`, { text }),
  today: (oddieId, refresh = false) => request('POST', '/api/today', { oddie_id: oddieId, refresh }),
  research: (oddieId) => request('POST', '/api/research', { oddie_id: oddieId }),
  setStepDone: (id, done) => request('PATCH', `/api/steps/${id}`, { done }),
  readStep: (id) => request('POST', `/api/steps/${id}/read`),
  resetDemo: () => request('POST', '/api/demo/reset'),
};

// Shows or hides a status line. Pass an empty message to hide it.
export function setNotice(element, message) {
  if (!element) return;
  element.textContent = message || '';
  element.hidden = !message;
}
