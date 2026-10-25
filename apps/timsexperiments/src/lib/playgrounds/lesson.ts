import type { Person, SerializationResult } from './contracts';
import { starterPerson } from './registry';

export type LessonStep = 'predict' | 'change' | 'measure' | 'check';
export type Prediction = 'json' | 'protobuf' | 'same';
export type ChallengeId = 'emoji' | 'hobbies' | 'defaults';
export type LessonState = Readonly<{
  challenge: ChallengeId;
  step: LessonStep;
  prediction: Prediction | null;
  person: Person;
  readout:
    | { kind: 'draft' }
    | { kind: 'measured'; result: SerializationResult };
}>;
export type LessonAction =
  | { kind: 'navigate'; step: LessonStep }
  | { kind: 'predict'; prediction: Prediction }
  | { kind: 'edit'; person: Person }
  | { kind: 'measure'; result: SerializationResult }
  | { kind: 'restart' }
  | { kind: 'next' };

export const lessonChallenges = {
  emoji: {
    number: 1,
    title: 'One more emoji',
    question: 'Add 🐶. Which gains more bytes?',
    instruction: 'Add an emoji to the name, then measure the change.',
    explanation: 'Each 🐶 occupies four UTF-8 bytes in both formats.',
  },
  hobbies: {
    number: 2,
    title: 'Grow the list',
    question: 'Add a hobby. Which format grows more?',
    instruction: 'Add a hobby. Try a few, then compare the bytes.',
    explanation:
      'JSON adds quotes and a comma per hobby. Protobuf adds a field tag and length.',
  },
  defaults: {
    number: 3,
    title: 'An empty record',
    question: 'Clear the values. Which format loses more bytes?',
    instruction: 'Clear the values, then see what each format still sends.',
    explanation:
      'Proto3 omits empty values and restores them when decoding. JSON still sends the four field names.',
  },
} satisfies Record<
  ChallengeId,
  {
    number: number;
    title: string;
    question: string;
    instruction: string;
    explanation: string;
  }
>;

export function createLesson(challenge: ChallengeId = 'emoji'): LessonState {
  return {
    challenge,
    step: 'predict',
    prediction: null,
    person: starterPerson,
    readout: { kind: 'draft' },
  };
}

export function transitionLesson(
  state: LessonState,
  action: LessonAction
): LessonState {
  switch (action.kind) {
    case 'navigate':
      return { ...state, step: action.step };
    case 'predict':
      return { ...state, prediction: action.prediction, step: 'change' };
    case 'edit':
      return { ...state, person: action.person, readout: { kind: 'draft' } };
    case 'measure':
      return {
        ...state,
        step: 'measure',
        readout: { kind: 'measured', result: action.result },
      };
    case 'restart':
      return createLesson(state.challenge);
    case 'next':
      return createLesson(
        state.challenge === 'emoji'
          ? 'hobbies'
          : state.challenge === 'hobbies'
            ? 'defaults'
            : 'emoji'
      );
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function changeLessonRecord(
  state: LessonState,
  change: 'add' | 'remove' | 'restore'
): Person {
  if (change === 'restore') return starterPerson;
  switch (state.challenge) {
    case 'emoji':
      return {
        ...state.person,
        name: change === 'add' ? `${state.person.name}🐶` : starterPerson.name,
      };
    case 'hobbies':
      return {
        ...state.person,
        hobbies:
          change === 'add'
            ? [...state.person.hobbies, 'stargazing']
            : state.person.hobbies.slice(0, -1),
      };
    case 'defaults':
      return change === 'add'
        ? { name: '', age: 0, email: '', hobbies: [] }
        : starterPerson;
    default: {
      const exhaustive: never = state.challenge;
      return exhaustive;
    }
  }
}

export function byteChanges(
  baseline: SerializationResult,
  result: SerializationResult
) {
  return {
    json: result.json.byteLength - baseline.json.byteLength,
    protobuf: result.protobuf.byteLength - baseline.protobuf.byteLength,
  };
}

/** The empty-record challenge compares bytes removed; the others compare growth. */
export function predictionOutcome(
  challenge: ChallengeId,
  changes: ReturnType<typeof byteChanges>
): Prediction {
  const json = challenge === 'defaults' ? -changes.json : changes.json;
  const protobuf =
    challenge === 'defaults' ? -changes.protobuf : changes.protobuf;
  return json === protobuf ? 'same' : json > protobuf ? 'json' : 'protobuf';
}
