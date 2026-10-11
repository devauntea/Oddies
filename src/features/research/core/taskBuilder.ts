import type { Level, Resource, ResearchTask, TaskKind } from '../types';
import { hashString } from './ids';

export interface TaskBuilderInput {
  topic: string;
  level: Level;
  resources: Resource[];
}

const PRACTICE_MINUTES: Record<Level, number> = { beginner: 20, intermediate: 30, advanced: 45 };

function taskId(topic: string, kind: TaskKind, anchor: string): string {
  return `t_${hashString(`${topic.toLowerCase()}|${kind}|${anchor}`)}`;
}

function make(
  topic: string,
  kind: TaskKind,
  fields: Omit<ResearchTask, 'id' | 'kind'>,
): ResearchTask {
  return { id: taskId(topic, kind, fields.resourceId ?? 'generic'), kind, ...fields };
}

/**
 * Turns research results into a small, doable plan for today, following the Odyssey Plan
 * prototyping loop. Pure and deterministic: the same input always yields the same tasks
 * (and the same ids, so completion state survives a re-fetch).
 *
 * Every kind is always present; when no matching resource was found, a generic task is used.
 */
export function buildTasks({ topic, level, resources }: TaskBuilderInput): ResearchTask[] {
  const find = (predicate: (r: Resource) => boolean) => resources.find(predicate);

  const study =
    find((r) => r.kind === 'document') ??
    find((r) => r.lane === 'overview' && r.kind === 'article') ??
    find((r) => r.kind === 'video');
  const practice = find((r) => r.lane === 'practice');
  const community = find((r) => r.lane === 'community');
  const event = find((r) => r.lane === 'events');

  const tasks: ResearchTask[] = [];

  tasks.push(
    study
      ? make(topic, 'learn', {
          title: `${study.kind === 'video' ? 'Watch' : 'Read'} "${study.title}"`,
          detail: `Note three ideas from ${study.source} you want to try.`,
          estimatedMinutes: study.kind === 'document' ? 25 : 15,
          resourceId: study.id,
        })
      : make(topic, 'learn', {
          title: `Learn the basics of ${topic}`,
          detail: 'Find one beginner-friendly explainer and note three ideas you want to try.',
          estimatedMinutes: 15,
        }),
  );

  tasks.push(
    practice
      ? make(topic, 'practice', {
          title: `Try: ${practice.title}`,
          detail: 'Follow along hands-on and note what felt fun and what felt frustrating.',
          estimatedMinutes: PRACTICE_MINUTES[level],
          resourceId: practice.id,
        })
      : make(topic, 'practice', {
          title: `Spend ${PRACTICE_MINUTES[level]} minutes doing ${topic}`,
          detail: 'Keep it small and hands-on. Doing beats reading about it.',
          estimatedMinutes: PRACTICE_MINUTES[level],
        }),
  );

  tasks.push(
    community
      ? make(topic, 'conversation', {
          title: `Ask one question on ${community.source}`,
          detail: `Prototype conversation: find someone already living this path and ask what a typical week of ${topic} looks like for them.`,
          estimatedMinutes: 15,
          resourceId: community.id,
        })
      : make(topic, 'conversation', {
          title: `Talk to someone who does ${topic}`,
          detail: 'Prototype conversation: message one person and ask how they got started.',
          estimatedMinutes: 15,
        }),
  );

  tasks.push(
    event
      ? make(topic, 'experience', {
          title: `Check out: ${event.title}`,
          detail:
            'Prototype experience: pick one session, class or event you could actually attend in the next few weeks.',
          estimatedMinutes: 20,
          resourceId: event.id,
        })
      : make(topic, 'experience', {
          title: `Find a ${topic} event near you`,
          detail: 'Prototype experience: look for a class, meetup or show in the next few weeks.',
          estimatedMinutes: 20,
        }),
  );

  tasks.push(
    make(topic, 'reflect', {
      title: `Reflect on today's ${topic} time`,
      detail:
        'Good Time Journal: rate your energy and engagement from 1-5, and write one sentence about what surprised you.',
      estimatedMinutes: 5,
    }),
  );

  return tasks;
}
