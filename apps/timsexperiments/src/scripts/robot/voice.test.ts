import { afterEach, beforeEach, expect, test } from 'bun:test';
import { browserEnvironment, click, robotDom } from './lifecycle-test-helpers';
import { createRobotVoice, selectRobotVoice } from './voice';

let env: ReturnType<typeof browserEnvironment>;
let dom: ReturnType<typeof robotDom>;
let controller: ReturnType<typeof createRobotVoice>;
class Utterance {
  static all: Utterance[] = [];
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly text: string) {
    Utterance.all.push(this);
  }
}
const local = {
  voiceURI: 'local',
  name: 'Local test voice',
  lang: 'en-US',
  localService: true,
  default: false,
};
const remote = {
  ...local,
  voiceURI: 'remote',
  name: 'Remote default',
  localService: false,
  default: true,
};
class Synthesis extends EventTarget {
  voices = [remote, local];
  spoken: Utterance[] = [];
  cancels = 0;
  getVoices() {
    return this.voices;
  }
  speak(value: Utterance) {
    this.spoken.push(value);
  }
  cancel() {
    this.cancels += 1;
  }
}
let synth: Synthesis;
beforeEach(() => {
  env = browserEnvironment();
  dom = robotDom();
  synth = new Synthesis();
  Reflect.set(window, 'speechSynthesis', synth);
  env.install('SpeechSynthesisUtterance', Utterance);
  Utterance.all = [];
  controller = createRobotVoice(dom.root);
});
afterEach(() => {
  controller.destroy();
  env.cleanup();
});
test('starts muted, enabling does not read old replies, replay selects an explicit local English voice', () => {
  controller.accept('Current reply.');
  expect(synth.spoken).toHaveLength(0);
  click(dom.voiceToggle);
  expect(synth.spoken).toHaveLength(0);
  click(dom.voiceReplay);
  expect(synth.spoken[0]?.voice).toBe(local);
  expect(synth.spoken[0]?.text).toBe('Current reply.');
  expect(synth.spoken[0]?.rate).toBe(0.94);
  expect(synth.spoken[0]?.pitch).toBe(1.02);
});
test('voice preference is deterministic across enumeration orders and stays local English only', () => {
  const preferred = { ...local, name: 'Samantha' };
  const other = { ...local, name: 'Other', voiceURI: 'other' };
  const nonEnglish = { ...preferred, lang: 'fr-FR' };
  expect(selectRobotVoice([remote, other, preferred, nonEnglish])).toBe(
    preferred
  );
  expect(selectRobotVoice([nonEnglish, preferred, other, remote])).toBe(
    preferred
  );
  expect(selectRobotVoice([remote, nonEnglish])).toBeUndefined();
  expect(selectRobotVoice([other, local])).toBe(
    selectRobotVoice([local, other])
  );
});
test('replacement, stop, mute and Clear invalidate queued sentence callbacks', () => {
  click(dom.voiceToggle);
  controller.accept('First 2.3 million accounts. Second sentence.');
  const stale = synth.spoken[0]?.onend;
  controller.accept('Replacement.');
  stale?.();
  expect(synth.spoken.map((item) => item.text)).toEqual([
    'First 2.3 million accounts.',
    'Replacement.',
  ]);
  const replaced = synth.spoken[1]?.onend;
  click(dom.voiceStop);
  replaced?.();
  expect(dom.voiceStop.hidden).toBe(true);
  click(dom.voiceReplay);
  expect(synth.spoken.at(-1)?.text).toBe('Replacement.');
  click(dom.voiceToggle);
  controller.accept('Muted answer.');
  expect(synth.spoken).toHaveLength(3);
  controller.clear();
  click(dom.voiceReplay);
  expect(synth.spoken).toHaveLength(3);
});
test('closing, backgrounding and pagehide cannot advance or replay stale speech', () => {
  click(dom.voiceToggle);
  controller.accept('First. Second.');
  const stale = synth.spoken[0]?.onend;
  dom.dialog.open = false;
  stale?.();
  expect(synth.spoken).toHaveLength(1);
  dom.dialog.open = true;
  Reflect.set(document, 'hidden', true);
  document.dispatchEvent(new Event('visibilitychange'));
  click(dom.voiceReplay);
  expect(synth.spoken).toHaveLength(1);
  Reflect.set(document, 'hidden', false);
  click(dom.voiceReplay);
  env.page('pagehide', true);
  synth.spoken.at(-1)?.onend?.();
  expect(synth.spoken).toHaveLength(2);
});
test('voice list changes never fall back to a remote or unset default', () => {
  synth.voices = [remote];
  synth.dispatchEvent(new Event('voiceschanged'));
  expect(dom.voiceToggle.disabled).toBe(true);
  expect(dom.voiceStatus.textContent).toContain('No local English voice');
  click(dom.voiceToggle);
  controller.accept('No remote speech.');
  click(dom.voiceReplay);
  expect(synth.spoken).toHaveLength(0);
  synth.voices = [local];
  synth.dispatchEvent(new Event('voiceschanged'));
  expect(dom.voiceToggle.disabled).toBe(false);
  click(dom.voiceToggle);
  click(dom.voiceReplay);
  expect(synth.spoken[0]?.voice).toBe(local);
});
test('a native speech failure leaves written replies and replay available', () => {
  synth.speak = () => {
    throw new Error('Native service unavailable');
  };
  click(dom.voiceToggle);
  expect(() => controller.accept('Written reply.')).not.toThrow();
  expect(dom.voiceStatus.textContent).toContain('Voice could not play');
  expect(dom.voiceReplay.disabled).toBe(false);
});
