const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { HttpError } = require('../src/errors');

// A stand-in for Gemini that records what it was asked.
function fakeGemini(reply = 'In my version, I started with the class.') {
  const calls = [];
  return {
    calls,
    configured: true,
    async generate(options) {
      calls.push(options);
      if (reply instanceof Error) throw reply;
      return { text: reply, tokens: { input: 10, output: 5, total: 15 } };
    },
  };
}

test('chat sends the persona, the self summary, real progress and history', async (t) => {
  const gemini = fakeGemini();
  const app = await startApp({ gemini });
  t.after(app.close);

  const first = await app.call('POST', '/api/oddies/1/chat', { text: 'What did it cost you?' });
  assert.equal(first.status, 200);
  assert.equal(first.json.reply, 'In my version, I started with the class.');

  const { system, contents } = gemini.calls[0];
  assert.match(system, /June the Luthier/);
  assert.match(system, /apprenticed under a violin maker/, 'persona brief');
  assert.match(system, /instrument making/, 'interests');
  assert.match(system, /Astoria, Queens/, 'self summary');
  assert.match(system, /Milestones they have reached: Take a weekend instrument repair class; Restore a damaged student cello\./);
  assert.match(system, /Next milestone: Apprentice part time with a working luthier\./);
  assert.match(system, /Never claim to know for certain/);
  assert.deepEqual(contents, [{ role: 'user', parts: [{ text: 'What did it cost you?' }] }]);

  await app.call('POST', '/api/oddies/1/chat', { text: 'And what would you do first?' });
  assert.deepEqual(
    gemini.calls[1].contents.map((c) => c.role),
    ['user', 'model', 'user']
  );

  const history = await app.call('GET', '/api/oddies/1/chat');
  assert.deepEqual(history.json.messages.map((m) => m.role), ['user', 'oddie', 'user', 'oddie']);
});

test('each oddie has its own history and its own prompt', async (t) => {
  const gemini = fakeGemini();
  const app = await startApp({ gemini });
  t.after(app.close);

  await app.call('POST', '/api/oddies/1/chat', { text: 'hello luthier' });
  await app.call('POST', '/api/oddies/5/chat', { text: 'hello translator' });

  assert.match(gemini.calls[1].system, /June the Translator/);
  assert.doesNotMatch(gemini.calls[1].system, /violin maker/);
  assert.equal(gemini.calls[1].contents.length, 1, 'the translator does not see the luthier chat');
  assert.equal((await app.call('GET', '/api/oddies/5/chat')).json.messages.length, 2);
});

test('a failed model call saves nothing', async (t) => {
  const gemini = fakeGemini(new HttpError(502, 'gemini_failed', 'The model did not answer.'));
  const app = await startApp({ gemini });
  t.after(app.close);

  const res = await app.call('POST', '/api/oddies/1/chat', { text: 'hello' });
  assert.equal(res.status, 502);
  assert.equal(res.json.error, 'gemini_failed');
  assert.equal((await app.call('GET', '/api/oddies/1/chat')).json.messages.length, 0);
});

test('chat input is checked', async (t) => {
  const app = await startApp({ gemini: fakeGemini() });
  t.after(app.close);

  assert.equal((await app.call('POST', '/api/oddies/1/chat', { text: '   ' })).status, 400);
  assert.equal((await app.call('POST', '/api/oddies/1/chat', { text: 'x'.repeat(2001) })).status, 400);
  assert.equal((await app.call('POST', '/api/oddies/99/chat', { text: 'hi' })).status, 404);
});

test('PATCH and DELETE an oddie', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const patched = await app.call('PATCH', '/api/oddies/2', { status: 'dormant', interests: ['triage', 'night shifts'] });
  assert.equal(patched.status, 200);
  assert.equal(patched.json.oddie.status, 'dormant');
  assert.deepEqual(patched.json.oddie.interests, ['triage', 'night shifts']);
  assert.equal(patched.json.oddie.name, 'June the Trauma Nurse', 'untouched fields stay');

  assert.equal((await app.call('PATCH', '/api/oddies/2', { status: 'asleep' })).status, 400);

  assert.equal((await app.call('DELETE', '/api/oddies/2')).status, 200);
  const state = (await app.call('GET', '/api/state')).json;
  assert.equal(state.oddies.length, 4);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM milestone WHERE oddie_id = 2').get().n, 0);
  assert.equal((await app.call('DELETE', '/api/oddies/2')).status, 404);
});
