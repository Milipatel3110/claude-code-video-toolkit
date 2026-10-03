/**
 * OddlyEpic Meter presets.
 *
 * Each preset is a concept-specific escalation scale: a name, a cold→hot colour
 * pair, five default rank labels (#5 → #1) and a default end question.
 * Any of these can be overridden per video in ranking.json.
 */
import type { MeterInput, MeterType } from './types';

export interface MeterPreset {
  name: string;
  colors: [string, string];
  /** Index 0 = lowest rank shown (#5), last = #1. */
  labels: string[];
  question: string;
}

export const METERS: Record<Exclude<MeterType, 'custom'>, MeterPreset> = {
  chaos: {
    name: 'CHAOS',
    colors: ['#C8FF2E', '#FF3B1F'],
    labels: ['QUESTIONABLE', 'UH OH', 'COMMITTED', 'NO GOING BACK', 'ABSOLUTE CHAOS'],
    question: 'Which one wins? 1–5?',
  },
  luck: {
    name: 'LUCK',
    colors: ['#7CF5C8', '#FFD23F'],
    labels: ['FORTUNATE', 'SUSPICIOUS', 'HOW?', 'ONE IN A MILLION', 'UNIVERSE GLITCH'],
    question: 'Luckiest one? 1–5?',
  },
  skill: {
    name: 'SKILL',
    colors: ['#5CE1FF', '#B36BFF'],
    labels: ['SOLID', 'CLEAN', 'ELITE', 'UNREAL', 'NOT HUMAN'],
    question: 'Who’s actually the best? 1–5?',
  },
  fail: {
    name: 'FAIL',
    colors: ['#FFB13B', '#FF2E63'],
    labels: ['MINOR SETBACK', 'BAD CALL', 'OH NO', 'TOTAL COLLAPSE', 'LEGENDARY'],
    question: 'Which one hurt your soul most? 1–5?',
  },
  plotTwist: {
    name: 'PLOT TWIST',
    colors: ['#9DFFB0', '#FF4FD8'],
    labels: ['HUH', 'WAIT', 'DIDN’T SEE IT', 'REWRITE IT', 'NOBODY GUESSED'],
    question: 'Which twist got you? 1–5?',
  },
  satisfying: {
    name: 'SATISFYING',
    colors: ['#8AF3FF', '#3DFFA2'],
    labels: ['NICE', 'CLEAN', 'CRISP', 'PERFECT', 'BRAIN RESET'],
    question: 'Most satisfying? 1–5?',
  },
  timing: {
    name: 'TIMING',
    colors: ['#FFE45C', '#FF6A1A'],
    labels: ['GOOD TIMING', 'CLOSE CALL', 'SPLIT SECOND', 'FRAME PERFECT', 'TIME STOPPED'],
    question: 'Best timing? 1–5?',
  },
  confidence: {
    name: 'CONFIDENCE',
    colors: ['#FFC6A8', '#FF2E2E'],
    labels: ['BOLD', 'FEARLESS', 'DELUSIONAL', 'UNSHAKEABLE', 'MAIN CHARACTER'],
    question: 'Most confident? 1–5?',
  },
  dogDrama: {
    name: 'DOG DRAMA',
    colors: ['#FFD9A0', '#FF5C8A'],
    labels: ['MILD SASS', 'OFFENDED', 'BETRAYED', 'FULL OPERA', 'OSCAR WORTHY'],
    question: 'Most dramatic dog? 1–5?',
  },
};

export interface ResolvedMeter extends MeterPreset {
  type: MeterType;
}

export const resolveMeter = (input: MeterInput): ResolvedMeter => {
  if (input.type === 'custom') {
    return {
      type: 'custom',
      name: (input.name ?? 'ODDLY EPIC').toUpperCase(),
      colors: input.colors ?? ['#C8FF2E', '#FF3B1F'],
      labels: [],
      question: 'Which one wins?',
    };
  }
  const preset = METERS[input.type];
  if (!preset) throw new Error(`Unknown meter type "${input.type}". Use one of: ${Object.keys(METERS).join(', ')}, custom`);
  return {
    ...preset,
    type: input.type,
    name: (input.name ?? preset.name).toUpperCase(),
    colors: input.colors ?? preset.colors,
  };
};

/** Default label for a rank given how many entries the ranking has. */
export const presetLabel = (meter: ResolvedMeter, indexFromLowest: number, count: number): string => {
  if (!meter.labels.length) return '';
  // Map onto the 5-step preset so Top 3 / Top 7 still escalate sensibly.
  const i = count <= 1 ? meter.labels.length - 1 : Math.round((indexFromLowest / (count - 1)) * (meter.labels.length - 1));
  return meter.labels[i];
};
