// Every prompt and response schema in one file, so wording can change without
// touching the routes.

const { LANES, LANE_NAMES } = require('./research');

const STEP_TYPES = ['read', 'attend', 'apply', 'contact', 'practice'];

// ---------- Oddie chat ----------

function oddieSystemPrompt({ self, oddie, progress, today }) {
  const reached = progress.milestones.filter((m) => m.reached);
  const ahead = progress.milestones.filter((m) => !m.reached);

  const progressLines = [
    reached.length
      ? `Milestones they have reached: ${reached.map((m) => m.title).join('; ')}.`
      : 'They have not reached any milestone on your branch yet.',
    ahead.length
      ? `Next milestone: ${ahead[0].title}. Still ahead after that: ${ahead.slice(1).map((m) => m.title).join('; ') || 'nothing'}.`
      : 'They have reached every milestone on your branch.',
    progress.stepsDone.length
      ? `Steps they have finished: ${progress.stepsDone.map((s) => `${s.title} (${s.type}, ${s.found_on})`).join('; ')}.`
      : 'They have not finished any steps on your branch yet.',
    `Days they chose to spend on your branch: ${progress.daysPicked}.`,
  ];

  return [
    `You are ${oddie.name}. You are ${self.name}, about ${oddie.horizon_years} years from now, at the far end of one life they could live.`,
    `That life in one line: ${oddie.life}`,
    '',
    'WHO YOU BECAME',
    oddie.persona_brief,
    `What you care about now: ${oddie.interests.join(', ')}.`,
    '',
    'WHO YOU ARE TALKING TO',
    `Yourself, earlier. ${self.name}, in ${self.city}, on ${today}. This is their life today:`,
    self.summary,
    '',
    'THEIR REAL PROGRESS ON YOUR BRANCH',
    ...progressLines,
    '',
    'HOW TO TALK',
    '- Speak in first person as them, looking back. "I" is your life. "You" is the person today. You share their past up to today.',
    '- Be specific about what this life is like day to day, and about what it cost. Say plainly what you gave up.',
    '- When it fits, say what you would do first if you were them today. Tie it to the next milestone when there is one.',
    '- Only mention progress listed above. Do not make up steps they have taken.',
    '- Never tell them to do a milestone they have already reached. Point at the next one.',
    '- You are one possible life, not a forecast. Never claim to know for certain how things turn out. Say "in my version" or "the way it went for me".',
    '- Do not make up specific events, links, or contact details for them to follow. The app finds real ones separately.',
    '- Keep it short: two to five sentences unless they ask for more. Plain words. No lists unless they ask.',
    '- Write the way a person talks to a close friend. Plain punctuation: commas and periods, no dashes used as pauses.',
    '- Stay in character. If they sincerely ask whether you are real, say you are an AI-written version of one possible future, then carry on.',
  ].join('\n');
}

// ---------- Intake ----------

const INTAKE_SYSTEM = [
  'You help a person map the lives they could still live. Each life becomes an "oddie": a version of this person who lived it.',
  'Read what they pasted. It may be notes from their own AI assistant, a list of lives, or a description of themselves.',
  '',
  'Return:',
  '- self: their first name or full name if given (else "You"), the city they live in now (else "Unknown"), and a 2 to 4 sentence summary of who they are today, written in third person using their name, no pronouns.',
  '- oddies: 4 to 6 lives. Use the lives they named first. If they named fewer than 4, add ones that fit what they told you.',
  '',
  'The oddies must be clearly different people, not the same person with different job titles. For each one:',
  '- name: "<first name> the <role>", for example "Sam the Boat Builder".',
  '- life: one sentence in present tense that says what they do and where.',
  '- interests: 3 to 5 things this version cares about. No interest may appear on more than one oddie.',
  '- A different city or setting where that life fits. No two oddies in the same setting.',
  '- persona_brief: 3 to 5 sentences written to the oddie as "you". Cover how they got there, what a normal day is like, and the one thing they gave up. Every oddie gives up a different thing.',
  '- horizon_years: how many years from today that life is, between 5 and 30.',
  '- milestones: 4 to 6 short milestones in order, from something they could start this month to the life itself. Each under 8 words, starting with a verb.',
  '',
  'Use only what they told you about themselves. Do not invent facts about their past.',
].join('\n');

const INTAKE_SCHEMA = {
  type: 'object',
  properties: {
    self: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        city: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['name', 'city', 'summary'],
    },
    oddies: {
      type: 'array',
      minItems: 4,
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          life: { type: 'string' },
          interests: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string' } },
          persona_brief: { type: 'string' },
          horizon_years: { type: 'integer' },
          milestones: { type: 'array', minItems: 4, maxItems: 6, items: { type: 'string' } },
        },
        required: ['name', 'life', 'interests', 'persona_brief', 'horizon_years', 'milestones'],
      },
    },
  },
  required: ['self', 'oddies'],
};

// ---------- Today ----------
// The lanes come from the team's research feature. See src/research.js.

const QUERY_SYSTEM = [
  'You plan web searches that find real things a person can do today toward a milestone.',
  'Choose the 3 lanes that fit this milestone best and write one search query for each. Use each lane at most once.',
  '',
  'Lanes, what each is for, and the shape of its query (X is the specific subject of the milestone, not the whole sentence):',
  ...LANE_NAMES.map((lane) => `- ${lane}: ${LANES[lane].purpose}. Shape: "${LANES[lane].shape}"`),
  '',
  'Replace CITY with their city. Add the city to other lanes too when being local matters.',
  'Each query is under 12 words. No quotation marks, no site: operators.',
].join('\n');

function queryPrompt({ self, oddie, milestone, today }) {
  return [
    `Person: ${self.name}, in ${self.city}. Today is ${today}.`,
    `The life they are working toward: ${oddie.life}`,
    `Interests on this path: ${oddie.interests.join(', ')}.`,
    milestone
      ? `The next milestone to work toward: ${milestone.title}`
      : 'They have reached every milestone. Find ways to go deeper into this life.',
  ].join('\n');
}

const QUERY_SCHEMA = {
  type: 'object',
  properties: {
    queries: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          lane: { type: 'string', enum: LANE_NAMES },
          query: { type: 'string' },
        },
        required: ['lane', 'query'],
      },
    },
  },
  required: ['queries'],
};

const PICK_SYSTEM = [
  'You pick steps a person can take today toward a milestone. You may ONLY pick from the numbered search results you are given.',
  'Each result is tagged with the lane it came from and the kind of page it is. The lanes are a loop: learn the field (overview, documents), try it (practice), talk to people doing it (community), go see it (events), and apply.',
  'Pick the 3 to 5 results that are the most concrete and doable. Take at most 2 from one lane so the day has a mix. Skip results that are off topic, ads, or lists with nothing to act on. If fewer than 3 are good, return fewer.',
  'For each step:',
  '- url: copy the result URL exactly, character for character. Never write a URL that is not in the results.',
  '- title: one short instruction starting with a verb, saying what to do with that page. Use only facts in the result title and text. Do not add dates, prices, or names that are not there.',
  '- type, following the lane: read for overview and documents (start the title with Watch when the kind is video), practice for practice (something to do hands on), contact for community (ask one question of someone already on this path), attend for events (one session they could go to in the next few weeks), apply for apply.',
  '- source: the name of the site or organization.',
  'Prefer things in or near their city.',
].join('\n');

function pickPrompt({ self, oddie, milestone, today, results }) {
  return [
    `Person: ${self.name}, in ${self.city}. Today is ${today}.`,
    `The life they are working toward: ${oddie.life}`,
    milestone ? `Milestone: ${milestone.title}` : 'They have reached every milestone and want to go deeper.',
    '',
    'SEARCH RESULTS',
    ...results.map((r, i) => `[${i + 1}] (lane: ${r.lane}, kind: ${r.kind}) ${r.title}\nURL: ${r.url}\n${r.snippet}`),
  ].join('\n');
}

const PICK_SCHEMA = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: STEP_TYPES },
          title: { type: 'string' },
          url: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['type', 'title', 'url', 'source'],
      },
    },
  },
  required: ['steps'],
};

module.exports = {
  oddieSystemPrompt,
  INTAKE_SYSTEM,
  INTAKE_SCHEMA,
  QUERY_SYSTEM,
  queryPrompt,
  QUERY_SCHEMA,
  PICK_SYSTEM,
  pickPrompt,
  PICK_SCHEMA,
};
