import type {
  Person,
  SerializationResultDetail,
} from '../../lib/playgrounds/contracts';
import { starterJson, starterPerson } from '../../lib/playgrounds/registry';
import {
  evaluateSerialization,
  InputError,
  parsePerson,
} from '../../lib/playgrounds/serialization';
import {
  byteChanges,
  changeLessonRecord,
  createLesson,
  lessonChallenges,
  predictionOutcome,
  transitionLesson,
} from '../../lib/playgrounds/lesson';
import type { LessonAction, LessonStep } from '../../lib/playgrounds/lesson';

let instanceSequence = 0;
const stepOrder: readonly LessonStep[] = [
  'predict',
  'change',
  'measure',
  'check',
];
const baseline = evaluateSerialization(starterJson);
const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

/** Local, synchronous and safe to mount inside a closed native dialog.
 * The parent owns dialog focus. Frozen completed results bubble from the host;
 * null invalidates a result on edits, mode changes, reset and disconnect.
 */
export function initializeSerializationBench(host: HTMLElement): () => void {
  const find = (selector: string): HTMLElement => {
    const element = host.querySelector(selector);
    if (!(element instanceof HTMLElement))
      throw new Error(`Serialization bench is missing ${selector}.`);
    return element;
  };
  const editor = find('textarea');
  const form = find('form');
  if (
    !(editor instanceof HTMLTextAreaElement) ||
    !(form instanceof HTMLFormElement)
  )
    throw new Error('Invalid serialization editor.');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const error = find('[data-error]');
  const status = find('[data-status]');
  const editorId = `serialization-person-editor-${++instanceSequence}`;
  if (host.id && document.getElementById(host.id) !== host)
    host.id = `${host.id}-${instanceSequence}`;
  editor.id = editorId;
  error.id = `${editorId}-error`;
  find('.editor-help').id = `${editorId}-help`;
  editor.setAttribute('aria-describedby', `${editorId}-help ${error.id}`);
  let lesson = createLesson();
  let mode: 'lesson' | 'sandbox' = 'lesson';
  let sandboxResult: SerializationResultDetail = null;
  let sandboxStarted = editor.value !== starterJson;
  let runId = 0;
  let animations: Animation[] = [];
  const publish = (detail: SerializationResultDetail) =>
    host.dispatchEvent(
      new CustomEvent<SerializationResultDetail>('serialization-result', {
        detail,
        bubbles: true,
      })
    );
  const text = (selector: string, value: string) => {
    find(selector).textContent = value;
  };
  const visible = (selector: string, show: boolean) => {
    find(selector).hidden = !show;
  };
  const disable = (selector: string, disabled: boolean) => {
    const button = find(selector);
    if (button instanceof HTMLButtonElement) button.disabled = disabled;
  };
  const cancelAnimation = () => {
    animations.forEach((animation) => animation.cancel());
    animations = [];
  };
  const result = (): SerializationResultDetail =>
    mode === 'sandbox'
      ? sandboxResult
      : lesson.readout.kind === 'measured'
        ? lesson.readout.result
        : null;
  const clearError = () => {
    error.hidden = true;
    error.textContent = '';
    editor.removeAttribute('aria-invalid');
  };
  const renderPerson = (person: Person, prefix: 'person' | 'decoded') => {
    text(`[data-${prefix}-name]`, JSON.stringify(person.name));
    text(`[data-${prefix}-age]`, String(person.age));
    text(`[data-${prefix}-email]`, JSON.stringify(person.email));
    text(`[data-${prefix}-hobbies]`, JSON.stringify(person.hobbies));
  };
  const renderReadout = (current: SerializationResultDetail) => {
    text('[data-json-count]', current ? String(current.json.byteLength) : '—');
    text(
      '[data-protobuf-count]',
      current ? String(current.protobuf.byteLength) : '—'
    );
    const max = current
      ? Math.max(current.json.byteLength, current.protobuf.byteLength)
      : 0;
    find('[data-json-bar]').style.width =
      `${current && max ? (current.json.byteLength / max) * 100 : 0}%`;
    find('[data-protobuf-bar]').style.width =
      `${current && max ? (current.protobuf.byteLength / max) * 100 : 0}%`;
    text('[data-comparison]', 'Run to measure the encoded bytes.');
    text('[data-feedback]', '');
    text('[data-explanation]', '');
    text('[data-json-delta]', '');
    text('[data-protobuf-delta]', '');
    text(
      '[data-check-summary]',
      'Run a comparison to check the decoded values.'
    );
    find('[data-checks]').replaceChildren();
    visible('[data-decoded-record]', current !== null);
    visible('[data-explore]', current !== null);
    // Clear collapsed byte views as well; stale bytes must never survive an edit.
    for (const selector of [
      '[data-json-hex]',
      '[data-protobuf-hex]',
      '[data-json-text]',
      '[data-json-decoded]',
      '[data-protobuf-decoded]',
    ])
      text(selector, '');
    if (!current) return;
    const difference = current.json.byteLength - current.protobuf.byteLength;
    text(
      '[data-comparison]',
      difference === 0
        ? 'Both encodings have the same byte count.'
        : `${difference > 0 ? 'Protobuf' : 'JSON'} uses ${Math.abs(difference)} fewer bytes for this record.`
    );
    if (mode === 'lesson') {
      const changes = byteChanges(baseline, current);
      text(
        '[data-json-delta]',
        `${signed(changes.json)} bytes from the ${baseline.json.byteLength} B start`
      );
      text(
        '[data-protobuf-delta]',
        `${signed(changes.protobuf)} bytes from the ${baseline.protobuf.byteLength} B start`
      );
      const outcome = predictionOutcome(lesson.challenge, changes);
      const outcomeText =
        outcome === 'same'
          ? 'Both changed by the same byte count.'
          : `${outcome === 'json' ? 'JSON' : 'Protobuf'} ${lesson.challenge === 'defaults' ? 'lost' : 'gained'} more bytes.`;
      text(
        '[data-feedback]',
        `${lesson.prediction ? (lesson.prediction === outcome ? 'Your prediction matched. ' : 'A different result from your prediction. ') : ''}${outcomeText}`
      );
      text(
        '[data-explanation]',
        lessonChallenges[lesson.challenge].explanation
      );
    }
    const passed = current.checks.filter(
      (check) => check.status === 'pass'
    ).length;
    text(
      '[data-check-summary]',
      `${passed} / ${current.checks.length} checks passed`
    );
    find('[data-checks]').replaceChildren(
      ...current.checks.map((check) => {
        const row = document.createElement('li');
        const badge = document.createElement('span');
        badge.className = check.status === 'pass' ? 'check-pass' : 'check-fail';
        badge.textContent = check.status.toUpperCase();
        row.append(badge, document.createTextNode(check.detail));
        return row;
      })
    );
    renderPerson(current.protobuf.decoded, 'decoded');
    text('[data-json-hex]', current.json.hex);
    text(
      '[data-protobuf-hex]',
      current.protobuf.hex ||
        'No bytes. All singular fields are default-valued and hobbies is empty.'
    );
    text('[data-json-text]', current.json.text);
    text('[data-json-decoded]', JSON.stringify(current.json.decoded, null, 2));
    text(
      '[data-protobuf-decoded]',
      JSON.stringify(current.protobuf.decoded, null, 2)
    );
  };
  const render = () => {
    const guided = mode === 'lesson';
    const challenge = lessonChallenges[lesson.challenge];
    const current = result();
    visible('[data-lesson]', guided);
    visible('[data-sandbox]', !guided);
    visible('[data-lesson-footer]', guided);
    text('[data-mode]', guided ? 'Sandbox ↗' : 'Return to lesson');
    host.querySelectorAll<HTMLElement>('[data-stage]').forEach((stage) => {
      stage.hidden = !guided || stage.dataset.stage !== lesson.step;
    });
    host
      .querySelectorAll<HTMLButtonElement>('[data-step]')
      .forEach((button) => {
        if (button.dataset.step === lesson.step)
          button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    host
      .querySelectorAll<HTMLButtonElement>('[data-prediction]')
      .forEach((button) =>
        button.setAttribute(
          'aria-pressed',
          String(button.dataset.prediction === lesson.prediction)
        )
      );
    text('[data-challenge-number]', `Challenge ${challenge.number} / 3`);
    text('[data-challenge-title]', challenge.title);
    text('[data-question]', challenge.question);
    text('[data-instruction]', challenge.instruction);
    renderPerson(lesson.person, 'person');
    const unchanged =
      JSON.stringify(lesson.person) === JSON.stringify(starterPerson);
    text(
      '[data-edit-note]',
      unchanged ? 'Starting record' : 'Record changed. Run to measure it.'
    );
    text(
      '[data-change="add"]',
      lesson.challenge === 'emoji'
        ? 'Add 🐶'
        : lesson.challenge === 'hobbies'
          ? 'Add stargazing'
          : 'Clear all values'
    );
    text(
      '[data-change="remove"]',
      lesson.challenge === 'emoji'
        ? 'Undo emoji'
        : lesson.challenge === 'hobbies'
          ? 'Remove last hobby'
          : 'Restore values'
    );
    disable(
      '[data-change="remove"]',
      lesson.challenge === 'hobbies'
        ? lesson.person.hobbies.length <= starterPerson.hobbies.length
        : unchanged
    );
    disable(
      '[data-change="add"]',
      lesson.challenge === 'hobbies'
        ? lesson.person.hobbies.length >= 11
        : lesson.challenge === 'emoji'
          ? lesson.person.name.length >= starterPerson.name.length + 16
          : !unchanged
    );
    visible(
      '[data-results]',
      !guided || lesson.step === 'measure' || lesson.step === 'check'
    );
    visible('[data-measure]', !guided || lesson.step === 'measure');
    visible('[data-verification]', !guided || lesson.step === 'check');
    visible('[data-back]', lesson.step !== 'predict');
    text(
      '[data-next]',
      lesson.step === 'predict'
        ? 'Skip prediction →'
        : lesson.step === 'change' || !current
          ? 'Run comparison →'
          : lesson.step === 'measure'
            ? 'Check the return trip →'
            : lesson.challenge === 'defaults'
              ? 'Replay lesson →'
              : 'Next challenge →'
    );
    text(
      '[data-context]',
      guided
        ? 'Runs locally in your browser'
        : 'Whitespace does not affect byte counts'
    );
    renderReadout(current);
  };
  const focusStage = () => {
    const target =
      mode === 'sandbox'
        ? editor
        : find(
            lesson.step === 'predict' || lesson.step === 'change'
              ? `[data-stage="${lesson.step}"] h3`
              : lesson.step === 'measure'
                ? '[data-measure] h3'
                : '[data-verification] h3'
          );
    if (target !== editor) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    // Focus moves only after explicit navigation, never during a completed run.
    target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  };
  const collapseInspectors = () => {
    host
      .querySelectorAll<HTMLDetailsElement>(
        '[data-explore], .inspectors details'
      )
      .forEach((details) => {
        details.open = false;
      });
  };
  const act = (action: LessonAction) => {
    if (action.kind === 'restart' || action.kind === 'next')
      collapseInspectors();
    lesson = transitionLesson(lesson, action);
    render();
  };
  const invalidate = () => {
    cancelAnimation();
    clearError();
    sandboxResult = null;
    status.textContent = '';
    publish(null);
  };
  const showError = (cause: unknown) => {
    invalidate();
    error.textContent =
      cause instanceof InputError
        ? cause.message
        : 'The comparison could not finish. Reset the record and try again.';
    error.hidden = false;
    editor.setAttribute('aria-invalid', 'true');
    text('[data-draft]', 'Check your input');
    renderReadout(null);
    editor.focus();
  };
  const run = () => {
    try {
      const current = evaluateSerialization(
        mode === 'sandbox' ? editor.value : JSON.stringify(lesson.person),
        ++runId
      );
      invalidate();
      if (mode === 'sandbox') {
        sandboxResult = current;
        render();
      } else act({ kind: 'measure', result: current });
      text('[data-draft]', 'Current result');
      const passed = current.checks.filter(
        (check) => check.status === 'pass'
      ).length;
      status.textContent = `Comparison ${current.runId} complete. JSON ${current.json.byteLength} bytes. Protobuf ${current.protobuf.byteLength} bytes. ${passed} of ${current.checks.length} checks passed.`;
      // Counts are available immediately. Motion only reveals the measured lengths.
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animations = [find('[data-json-bar]'), find('[data-protobuf-bar]')].map(
          (bar) =>
            bar.animate(
              [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
              { duration: 450, easing: 'ease-out' }
            )
        );
      }
      publish(current);
    } catch (cause: unknown) {
      showError(cause);
    }
  };
  const switchMode = () => {
    invalidate();
    if (mode === 'lesson') {
      if (!sandboxStarted) {
        editor.value = JSON.stringify(lesson.person, null, 2);
        sandboxStarted = true;
      }
      mode = 'sandbox';
    } else mode = 'lesson';
    render();
    publish(result());
    focusStage();
  };
  find('[data-mode]').addEventListener('click', switchMode, options);
  find('[data-skip]').addEventListener('click', switchMode, options);
  find('[data-restart]').addEventListener(
    'click',
    () => {
      invalidate();
      act({ kind: 'restart' });
      focusStage();
    },
    options
  );
  host.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        const step = button.dataset.step;
        if (
          step === 'predict' ||
          step === 'change' ||
          step === 'measure' ||
          step === 'check'
        ) {
          act({ kind: 'navigate', step });
          focusStage();
        }
      },
      options
    )
  );
  host
    .querySelectorAll<HTMLButtonElement>('[data-prediction]')
    .forEach((button) =>
      button.addEventListener(
        'click',
        () => {
          const prediction = button.dataset.prediction;
          if (
            prediction === 'json' ||
            prediction === 'protobuf' ||
            prediction === 'same'
          ) {
            act({ kind: 'predict', prediction });
            focusStage();
          }
        },
        options
      )
    );
  host.querySelectorAll<HTMLButtonElement>('[data-change]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        const change = button.dataset.change;
        if (change !== 'add' && change !== 'remove') return;
        invalidate();
        act({ kind: 'edit', person: changeLessonRecord(lesson, change) });
        status.textContent = 'Record changed. Run comparison to measure it.';
      },
      options
    )
  );
  find('[data-back]').addEventListener(
    'click',
    () => {
      const index = stepOrder.indexOf(lesson.step);
      act({
        kind: 'navigate',
        step: stepOrder[Math.max(0, index - 1)] ?? 'predict',
      });
      focusStage();
    },
    options
  );
  find('[data-next]').addEventListener(
    'click',
    () => {
      if (lesson.step === 'predict') {
        act({ kind: 'navigate', step: 'change' });
        focusStage();
      } else if (lesson.step === 'change' || !result()) run();
      else if (lesson.step === 'measure') {
        act({ kind: 'navigate', step: 'check' });
        focusStage();
      } else {
        invalidate();
        act({ kind: 'next' });
        focusStage();
      }
    },
    options
  );
  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      run();
    },
    options
  );
  editor.addEventListener(
    'input',
    () => {
      invalidate();
      renderReadout(null);
      text('[data-draft]', 'Draft changed · run again');
    },
    options
  );
  const replaceDraft = (value: string, note: string) => {
    invalidate();
    editor.value = value;
    renderReadout(null);
    text('[data-draft]', note);
    text('[data-recipe-note]', 'Recipes change your current valid record.');
  };
  find('[data-clear]').addEventListener(
    'click',
    () => {
      replaceDraft('', 'Editor cleared');
      editor.focus();
    },
    options
  );
  find('[data-reset]').addEventListener(
    'click',
    () => {
      replaceDraft(starterJson, 'Starter restored · ready to run');
    },
    options
  );
  host.querySelectorAll<HTMLButtonElement>('[data-recipe]').forEach((button) =>
    button.addEventListener(
      'click',
      () => {
        try {
          const person = parsePerson(editor.value);
          let next: Person;
          switch (button.dataset.recipe) {
            case 'emoji':
              next = { ...person, name: `${person.name}🐶` };
              break;
            case 'hobbies':
              next = {
                ...person,
                hobbies: [
                  ...person.hobbies,
                  ...Array.from({ length: 8 }, () => 'stargazing'),
                ],
              };
              break;
            case 'defaults':
              next = { name: '', age: 0, email: '', hobbies: [] };
              break;
            default:
              return;
          }
          const json = JSON.stringify(next, null, 2);
          parsePerson(json);
          replaceDraft(json, 'Recipe applied · run to compare');
        } catch (cause: unknown) {
          showError(cause);
        }
      },
      options
    )
  );
  host.querySelectorAll('button').forEach((button) => {
    button.disabled = false;
  });
  clearError();
  collapseInspectors();
  status.textContent = '';
  text(
    '[data-draft]',
    editor.value === starterJson ? 'Ready to run' : 'Draft retained · run again'
  );
  text('[data-recipe-note]', 'Recipes change your current valid record.');
  render();
  publish(null);
  return () => {
    controller.abort();
    cancelAnimation();
    publish(null);
  };
}

class SerializationBenchElement extends HTMLElement {
  private dispose: (() => void) | undefined;
  connectedCallback(): void {
    if (!this.dispose) this.dispose = initializeSerializationBench(this);
  }
  disconnectedCallback(): void {
    this.dispose?.();
    this.dispose = undefined;
  }
}
if (!customElements.get('serialization-bench'))
  customElements.define('serialization-bench', SerializationBenchElement);
