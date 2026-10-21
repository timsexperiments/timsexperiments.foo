import type { SerializationResultDetail } from '../../lib/playgrounds/contracts';
import { starterJson } from '../../lib/playgrounds/registry';

/** Run in the local Astro preview after the real component has mounted.
 * Uses cloned, real component markup and the registered custom element.
 * Cleans up its article and initially closed native dialog even on failure.
 */
export function verifySerializationBench(source: HTMLElement): string[] {
  const checks: string[] = [];
  const assert = (condition: boolean, label: string) => {
    if (!condition) throw new Error(label);
    checks.push(label);
  };
  const fixture = document.createElement('article');
  const closed = document.createElement('dialog');
  const clone = source.cloneNode(true);
  const second = source.cloneNode(true);
  if (!(clone instanceof HTMLElement) || !(second instanceof HTMLElement))
    throw new Error('Expected bench markup.');
  const button = (host: HTMLElement, selector: string): HTMLButtonElement => {
    const node = host.querySelector(selector);
    if (!(node instanceof HTMLButtonElement))
      throw new Error(`Missing button ${selector}`);
    return node;
  };
  const text = (selector: string) => clone.querySelector(selector)?.textContent;
  const click = (selector: string) => button(clone, selector).click();
  const editor = clone.querySelector('textarea');
  if (!(editor instanceof HTMLTextAreaElement))
    throw new Error('Missing editor.');
  const events: SerializationResultDetail[] = [];
  const onResult = (event: Event) => {
    if (event instanceof CustomEvent) events.push(event.detail);
  };
  clone.addEventListener('serialization-result', onResult);
  const current = () => events.at(-1);
  const draft = (value: string) => {
    editor.value = value;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  };
  try {
    fixture.append(clone, closed);
    closed.append(second);
    document.body.append(fixture);
    assert(
      !closed.open && !button(second, '[data-next]').disabled,
      'mounts inside an initially closed native dialog'
    );
    assert(
      clone.id !== second.id &&
        editor.id !== second.querySelector('textarea')?.id,
      'duplicate roots and editor descriptions have unique IDs'
    );
    click('[data-prediction="same"]');
    click('[data-change="add"]');
    click('[data-next]');
    assert(
      text('[data-json-count]') === '111' &&
        text('[data-protobuf-count]') === '72',
      'emoji run measures 111 / 72 real bytes'
    );
    const first = current();
    assert(
      !!first && Object.isFrozen(first) && Object.isFrozen(first.input.hobbies),
      'completed event is deeply frozen'
    );
    click('[data-mode]');
    draft('{unfinished');
    click('[data-mode]');
    assert(
      current() === first,
      'return to lesson republishes its still-valid frozen snapshot'
    );
    click('[data-mode]');
    assert(
      editor.value === '{unfinished' && current() === null,
      'sandbox keeps an unfinished draft without exposing an old result'
    );
    click('[data-mode]');
    const before = events.filter(Boolean).length;
    click('[data-step="change"]');
    click('[data-next]');
    const repeated = current();
    assert(
      !!first &&
        !!repeated &&
        repeated.runId > first.runId &&
        events.filter(Boolean).length === before + 1,
      'repeated runs publish one new result with an increasing run ID'
    );
    click('[data-step="change"]');
    click('[data-change="remove"]');
    assert(
      current() === null &&
        text('[data-json-hex]') === '' &&
        text('[data-json-count]') === '—',
      'editing invalidates the event, counts and collapsed byte views'
    );
    click('[data-next]');
    click('[data-next]');
    click('[data-next]');
    assert(
      text('[data-challenge-number]') === 'Challenge 2 / 3' &&
        current() === null,
      'next challenge clears the previous result'
    );
    click('[data-next]');
    click('[data-change="add"]');
    click('[data-next]');
    assert(
      text('[data-json-count]') === '120' &&
        text('[data-protobuf-count]') === '80',
      'skip prediction and hobby run measure 120 / 80'
    );
    click('[data-next]');
    click('[data-next]');
    click('[data-next]');
    click('[data-change="add"]');
    click('[data-next]');
    assert(
      text('[data-json-count]') === '43' &&
        text('[data-protobuf-count]') === '0' &&
        clone.querySelector<HTMLElement>('[data-protobuf-bar]')?.style.width ===
          '0%',
      'empty defaults measure 43 / 0 with a zero-width Protobuf bar'
    );
    click('[data-next]');
    assert(
      text('[data-decoded-age]') === '0' &&
        text('[data-decoded-name]') === '""',
      'return-trip view shows restored defaults'
    );
    const explorer = clone.querySelector('details[data-explore]');
    if (!(explorer instanceof HTMLDetailsElement))
      throw new Error('Missing explorer.');
    explorer.open = true;
    click('[data-next]');
    assert(
      !explorer.open &&
        text('[data-challenge-number]') === 'Challenge 1 / 3' &&
        current() === null,
      'replay starts a clean lesson'
    );
    click('[data-skip]');
    assert(
      !editor.closest('[data-sandbox]')?.hasAttribute('hidden'),
      'skip lesson opens the freeform sandbox directly'
    );
    click('[data-clear]');
    click('button[type="submit"]');
    assert(
      editor.value === '' &&
        editor.getAttribute('aria-invalid') === 'true' &&
        current() === null,
      'cleared editor reports invalid JSON and clears results'
    );
    draft('{"name":"x","age":2147483648,"email":"","hobbies":[]}');
    click('button[type="submit"]');
    assert(
      text('[data-error]')?.includes('integer') === true && current() === null,
      'out-of-range age reports a recoverable validation error'
    );
    click('[data-recipe="emoji"]');
    assert(
      editor.value.includes('2147483648'),
      'recipe preserves an invalid draft'
    );
    click('[data-reset]');
    click('button[type="submit"]');
    assert(
      editor.value === starterJson &&
        text('[data-json-count]') === '107' &&
        !editor.hasAttribute('aria-invalid'),
      'reset recovers from errors and measures the starter'
    );
    draft(
      JSON.stringify({
        name: '<img src=x onerror=alert(1)>',
        age: -1,
        email: '',
        hobbies: ['🐶', ''],
      })
    );
    click('button[type="submit"]');
    assert(
      !!current() && clone.querySelectorAll('img').length === 0,
      'HTML-looking strings stay data and negative int32 round-trips'
    );
    click('[data-recipe="defaults"]');
    click('button[type="submit"]');
    assert(
      text('[data-protobuf-count]') === '0',
      'sandbox default recipe measures zero bytes'
    );
    click('[data-mode]');
    click('[data-restart]');
    assert(
      current() === null &&
        text('[data-challenge-number]') === 'Challenge 1 / 3',
      'return and restart clear lesson state'
    );
    const siblingCount = second.querySelector('[data-json-count]')?.textContent;
    for (let index = 0; index < 3; index++) {
      clone.remove();
      fixture.prepend(clone);
      click('[data-step="measure"]');
      const count = events.filter(Boolean).length;
      click('[data-next]');
      assert(
        events.filter(Boolean).length === count + 1,
        `reconnect ${index + 1} has exactly one active submit listener`
      );
    }
    assert(
      second.querySelector('[data-json-count]')?.textContent === siblingCount,
      'instances keep independent records and results'
    );
    click('[data-mode]');
    draft('{keep this draft');
    clone.remove();
    fixture.prepend(clone);
    click('[data-mode]');
    assert(
      editor.value === '{keep this draft' &&
        current() === null &&
        text('[data-draft]') === 'Draft retained · run again' &&
        text('[data-status]') === '',
      'reconnect preserves the freeform draft and clears its result'
    );
    fixture.remove();
    assert(current() === null, 'disconnect publishes null');
    return checks;
  } finally {
    fixture.remove();
  }
}
