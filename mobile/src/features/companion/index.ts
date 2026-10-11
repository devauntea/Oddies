/**
 * Public API of the daily companion: the present self pops up on the home screen once a day with
 * an affirmation or a small piece of advice. Import from `@/features/companion`.
 */
export { DailyCompanion, type DailyCompanionProps } from './DailyCompanion';
export { dayKey, messageForDay, nextMessage, shouldPopUp } from './core/daily';
export { MESSAGES, type CompanionMessage, type MessageKind } from './core/messages';
