import { describe, expect, it } from 'bun:test';
import {
  byteChanges,
  changeLessonRecord,
  createLesson,
  predictionOutcome,
  transitionLesson,
} from './lesson';
import type { ChallengeId, Prediction } from './lesson';
import { evaluateSerialization } from './serialization';
import { starterJson, starterPerson } from './registry';

const baseline = evaluateSerialization(starterJson);
describe('ordered serialization lesson', () => {
  it('allows a skipped prediction and direct inspection without inventing a result', () => {
    let lesson = createLesson();
    lesson = transitionLesson(lesson, { kind: 'navigate', step: 'change' });
    expect(lesson.prediction).toBeNull();
    lesson = transitionLesson(lesson, { kind: 'navigate', step: 'check' });
    expect(lesson.readout.kind).toBe('draft');
    expect(lesson.person).toEqual(starterPerson);
  });
  it('keeps a measured snapshot while going back, then invalidates it on another edit', () => {
    let lesson = transitionLesson(createLesson(), {
      kind: 'predict',
      prediction: 'same',
    });
    expect(lesson.step).toBe('change');
    lesson = transitionLesson(lesson, {
      kind: 'edit',
      person: changeLessonRecord(lesson, 'add'),
    });
    const result = evaluateSerialization(JSON.stringify(lesson.person), 4);
    lesson = transitionLesson(lesson, { kind: 'measure', result });
    expect(lesson.step).toBe('measure');
    lesson = transitionLesson(lesson, { kind: 'navigate', step: 'change' });
    expect(lesson.readout).toEqual({ kind: 'measured', result });
    lesson = transitionLesson(lesson, {
      kind: 'edit',
      person: changeLessonRecord(lesson, 'remove'),
    });
    expect(lesson.readout.kind).toBe('draft');
    expect(lesson.person).toEqual(starterPerson);
    expect(result.input.name).toBe('Pixel 🐶🐶');
    expect(Object.isFrozen(result)).toBe(true);
  });
  it('restarts the current challenge and replays cleanly after the third', () => {
    let lesson = transitionLesson(createLesson(), { kind: 'next' });
    expect(lesson.challenge).toBe('hobbies');
    lesson = transitionLesson(lesson, { kind: 'predict', prediction: 'json' });
    lesson = transitionLesson(lesson, {
      kind: 'edit',
      person: changeLessonRecord(lesson, 'add'),
    });
    lesson = transitionLesson(lesson, { kind: 'restart' });
    expect(lesson).toEqual(createLesson('hobbies'));
    lesson = transitionLesson(lesson, { kind: 'next' });
    expect(lesson.challenge).toBe('defaults');
    lesson = transitionLesson(lesson, { kind: 'next' });
    expect(lesson).toEqual(createLesson());
  });
  const fixtures: {
    challenge: ChallengeId;
    bytes: number[];
    changes: { json: number; protobuf: number };
    outcome: Prediction;
  }[] = [
    {
      challenge: 'emoji',
      bytes: [111, 72],
      changes: { json: 4, protobuf: 4 },
      outcome: 'same',
    },
    {
      challenge: 'hobbies',
      bytes: [120, 80],
      changes: { json: 13, protobuf: 12 },
      outcome: 'json',
    },
    {
      challenge: 'defaults',
      bytes: [43, 0],
      changes: { json: -64, protobuf: -68 },
      outcome: 'protobuf',
    },
  ];
  it.each(fixtures)(
    'measures the actual $challenge record and both round trips',
    ({ challenge, bytes, changes, outcome }) => {
      const start = createLesson(challenge);
      const changed = changeLessonRecord(start, 'add');
      const result = evaluateSerialization(JSON.stringify(changed));
      expect([result.json.byteLength, result.protobuf.byteLength]).toEqual(
        bytes
      );
      expect(byteChanges(baseline, result)).toEqual(changes);
      expect(predictionOutcome(challenge, changes)).toBe(outcome);
      expect(result.checks.every((check) => check.status === 'pass')).toBe(
        true
      );
      expect(result.json.decoded).toEqual(changed);
      expect(result.protobuf.decoded).toEqual(changed);
      expect(
        changeLessonRecord({ ...start, person: changed }, 'remove')
      ).toEqual(starterPerson);
    }
  );
  it('compares the current record even when the planned change is skipped or undone', () => {
    expect(predictionOutcome('emoji', byteChanges(baseline, baseline))).toBe(
      'same'
    );
    expect(predictionOutcome('defaults', byteChanges(baseline, baseline))).toBe(
      'same'
    );
  });
});
