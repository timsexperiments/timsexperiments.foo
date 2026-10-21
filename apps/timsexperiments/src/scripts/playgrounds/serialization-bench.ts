import type { SerializationResultDetail } from "../../lib/playgrounds/contracts";
import { starterJson } from "../../lib/playgrounds/registry";
import { evaluateSerialization, InputError, parsePerson } from "../../lib/playgrounds/serialization";

let editorSequence = 0;

/** No layout measurements, globals or workers: safe to connect inside a closed dialog.
 * The owning page handles dialog focus. Listen on the element for
 * `serialization-result` (CustomEvent<SerializationResultDetail>, bubbles).
 * A completed snapshot is deeply frozen. null clears a result after edits/reset.
 */
export function initializeSerializationBench(host: HTMLElement): () => void {
  const find = (selector: string): HTMLElement => {
    const element = host.querySelector(selector);
    if (!(element instanceof HTMLElement)) throw new Error(`Serialization bench is missing ${selector}.`);
    return element;
  };
  const editor = find("textarea");
  const form = find("form");
  if (!(editor instanceof HTMLTextAreaElement) || !(form instanceof HTMLFormElement)) throw new Error("Invalid serialization editor.");
  const error = find("[data-error]");
  const status = find("[data-status]");
  const draft = find("[data-draft]");
  const jsonCount = find("[data-json-count]");
  const protoCount = find("[data-protobuf-count]");
  const jsonBar = find("[data-json-bar]");
  const protoBar = find("[data-protobuf-bar]");
  const comparison = find("[data-comparison]");
  const summary = find("[data-check-summary]");
  const checks = find("[data-checks]");
  const inspectors = find("[data-inspectors]");
  const resetConfirm = find("[data-reset-confirm]");
  const resetButton = find("[data-reset]");
  const recipeNote = find("[data-recipe-note]");
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let runId = 0;
  // Associate instance-local descriptions without assuming a unique page-level id.
  const editorId = `serialization-person-editor-${++editorSequence}`;
  editor.id = editorId;
  error.id = `${editorId}-error`;
  const help = find(".editor-help");
  help.id = `${editorId}-help`;
  editor.setAttribute("aria-describedby", `${help.id} ${error.id}`);

  const publish = (detail: SerializationResultDetail) => {
    host.dispatchEvent(new CustomEvent<SerializationResultDetail>("serialization-result", { detail, bubbles: true }));
  };
  const hideConfirmation = () => { resetConfirm.hidden = true; };
  const clear = () => {
    jsonCount.textContent = protoCount.textContent = "—";
    jsonBar.style.width = protoBar.style.width = "0%";
    comparison.textContent = "Run to measure the encoded bytes.";
    summary.textContent = "Awaiting a run";
    checks.replaceChildren();
    const note = document.createElement("li");
    note.textContent = "Encode, decode, then compare every supported value.";
    checks.append(note);
    inspectors.hidden = true;
    inspectors.querySelectorAll("pre").forEach((pre) => { pre.textContent = ""; });
    error.hidden = true;
    error.textContent = "";
    editor.removeAttribute("aria-invalid");
    status.textContent = "";
    publish(null);
  };
  const showError = (cause: unknown) => {
    clear();
    const text = cause instanceof InputError ? cause.message : "The comparison could not finish. Reset the record and try again.";
    error.textContent = text;
    error.hidden = false;
    editor.setAttribute("aria-invalid", "true");
    draft.textContent = "Check your input";
    editor.focus();
    // Input failures remain next to the editor. Only completed runs use the live region.
  };

  editor.addEventListener("input", () => {
    hideConfirmation();
    clear();
    draft.textContent = "Draft changed · run again";
    recipeNote.textContent = "Predict the change, then run again to test it.";
  }, options);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    hideConfirmation();
    try {
      const result = evaluateSerialization(editor.value, ++runId);
      clear();
      jsonCount.textContent = String(result.json.byteLength);
      protoCount.textContent = String(result.protobuf.byteLength);
      const max = Math.max(result.json.byteLength, result.protobuf.byteLength);
      jsonBar.style.width = `${max === 0 ? 0 : result.json.byteLength / max * 100}%`;
      protoBar.style.width = `${max === 0 ? 0 : result.protobuf.byteLength / max * 100}%`;
      const difference = result.json.byteLength - result.protobuf.byteLength;
      comparison.textContent = difference === 0 ? "Both encodings have the same byte count." :
        `${difference > 0 ? "Protobuf" : "JSON"} uses ${Math.abs(difference)} fewer bytes for this record.`;
      const passed = result.checks.filter((check) => check.status === "pass").length;
      summary.textContent = `${passed} / ${result.checks.length} checks passed`;
      checks.replaceChildren(...result.checks.map((check) => {
        const row = document.createElement("li");
        const badge = document.createElement("span");
        badge.className = check.status === "pass" ? "check-pass" : "check-fail";
        badge.textContent = check.status.toUpperCase();
        row.append(badge, document.createTextNode(check.detail));
        return row;
      }));
      find("[data-json-hex]").textContent = result.json.hex;
      find("[data-protobuf-hex]").textContent = result.protobuf.hex || "No bytes. All singular fields are default-valued and hobbies is empty.";
      find("[data-json-text]").textContent = result.json.text;
      find("[data-json-decoded]").textContent = JSON.stringify(result.json.decoded, null, 2);
      find("[data-protobuf-decoded]").textContent = JSON.stringify(result.protobuf.decoded, null, 2);
      inspectors.hidden = false;
      draft.textContent = "Current result";
      status.textContent = `Comparison complete. JSON ${result.json.byteLength} bytes. Protobuf ${result.protobuf.byteLength} bytes. ${passed} of ${result.checks.length} checks passed.`;
      publish(result);
    } catch (cause: unknown) { showError(cause); }
  }, options);

  const reset = () => {
    editor.value = starterJson;
    clear();
    hideConfirmation();
    draft.textContent = "Starter restored · ready to run";
    recipeNote.textContent = "Predict first. An emoji takes multiple UTF-8 bytes in both formats.";
    resetButton.focus();
  };
  resetButton.addEventListener("click", () => {
    if (editor.value !== starterJson) {
      resetConfirm.hidden = false;
      find("[data-confirm-reset]").focus();
    } else reset();
  }, options);
  find("[data-confirm-reset]").addEventListener("click", reset, options);
  find("[data-cancel-reset]").addEventListener("click", () => { hideConfirmation(); resetButton.focus(); }, options);

  host.querySelectorAll("[data-recipe]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      try {
        // Validate first; recipes never silently discard an invalid draft.
        const person = parsePerson(editor.value);
        let next = person;
        let explanation = "";
        switch (button.dataset.recipe) {
          case "emoji":
            next = { ...person, name: `${person.name}🐶` };
            explanation = "One 🐶 is four UTF-8 bytes in both formats. Protobuf's length prefix can also grow at 128 bytes.";
            break;
          case "hobbies":
            next = { ...person, hobbies: [...person.hobbies, ...Array.from({ length: 8 }, () => "stargazing")] };
            explanation = "Each hobby repeats Protobuf's tag and length. JSON repeats quotes and separators; its field name appears once.";
            break;
          case "defaults":
            next = { name: "", age: 0, email: "", hobbies: [] };
            explanation = "Predict zero Protobuf bytes. Proto3 restores omitted defaults when decoding; JSON still carries its field names.";
            break;
          default: return;
        }
        const json = JSON.stringify(next, null, 2);
        parsePerson(json);
        editor.value = json;
        clear();
        hideConfirmation();
        draft.textContent = "Recipe applied · run to compare";
        recipeNote.textContent = explanation;
      } catch (cause: unknown) { showError(cause); }
    }, options);
  });
  host.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  // A reconnect starts a clean readout while preserving the draft.
  clear();
  return () => { controller.abort(); publish(null); };
}

class SerializationBenchElement extends HTMLElement {
  private dispose: (() => void) | undefined;

  connectedCallback(): void {
    if (this.dispose) return;
    this.dispose = initializeSerializationBench(this);
  }

  disconnectedCallback(): void {
    this.dispose?.();
    this.dispose = undefined;
  }
}

if (!customElements.get("serialization-bench")) customElements.define("serialization-bench", SerializationBenchElement);
