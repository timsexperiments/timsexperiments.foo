/** Stable within this device's current voice list, never a remote/default fallback. */
export function selectRobotVoice(voices: SpeechSynthesisVoice[]) {
  const preferred = ['Samantha', 'Karen', 'Moira', 'Daniel', 'Alex'];
  const rank = (voice: SpeechSynthesisVoice) => {
    const index = preferred.findIndex((name) => voice.name === name);
    return index < 0 ? preferred.length : index;
  };
  const key = (voice: SpeechSynthesisVoice) =>
    `${voice.lang}\u0000${voice.name}\u0000${voice.voiceURI}`;
  return voices
    .filter(
      (voice) => voice.localService === true && /^en(?:-|$)/i.test(voice.lang)
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)
    )[0];
}

/** Native speech is optional. Never let an unset voice select a remote service. */
export function createRobotVoice(root: HTMLElement) {
  const toggle = root.querySelector('[data-voice-toggle]');
  const replay = root.querySelector('[data-voice-replay]');
  const stop = root.querySelector('[data-voice-stop]');
  const status = root.querySelector('[data-voice-status]');
  const synth = window.speechSynthesis;
  let enabled = false;
  let current = '';
  let generation = 0;
  let active: SpeechSynthesisUtterance | undefined;
  const dialog = root.closest('dialog');
  const available = () => selectRobotVoice(synth?.getVoices() ?? []);
  const visible = () => !document.hidden && (!dialog || dialog.open);
  const sync = () => {
    const voice = available();
    if (toggle instanceof HTMLButtonElement) {
      toggle.disabled = !voice;
      const label = toggle.querySelector('[data-voice-label]');
      if (label) label.textContent = enabled ? 'Mute' : 'Voice';
      else toggle.textContent = enabled ? 'Mute voice' : 'Enable voice';
      toggle.setAttribute(
        'aria-label',
        enabled ? 'Mute voice' : 'Enable voice'
      );
      toggle.setAttribute('title', enabled ? 'Mute voice' : 'Enable voice');
      toggle.hidden = !voice;
      root.dataset.voiceEnabled = String(enabled);
      const unavailable = root.querySelector<HTMLElement>(
        '[data-voice-unavailable]'
      );
      if (unavailable) unavailable.hidden = Boolean(voice);
      toggle.setAttribute('aria-pressed', String(enabled));
    }
    if (replay instanceof HTMLButtonElement)
      replay.disabled = !enabled || !voice || !current;
    if (stop instanceof HTMLButtonElement) stop.hidden = !active;
    if (status)
      status.textContent = !voice
        ? 'No local English voice available on this device.'
        : '';
  };
  const cancel = () => {
    generation += 1;
    const speaking = active;
    active = undefined;
    if (speaking) synth?.cancel();
    sync();
  };
  const play = () => {
    cancel();
    if (!enabled || !current || !visible() || !available()) return;
    const token = generation;
    const identity = current;
    const sentences = current.split(/(?<=[.!?])\s+/);
    const next = () => {
      if (
        token !== generation ||
        current !== identity ||
        !enabled ||
        !visible()
      )
        return;
      const text = sentences.shift();
      const voice = available();
      if (!text || !voice) {
        active = undefined;
        sync();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.94;
      utterance.pitch = 1.02;
      utterance.onend = () => {
        if (token !== generation) return;
        active = undefined;
        next();
      };
      const failed = () => {
        if (token !== generation) return;
        active = undefined;
        sync();
        if (status)
          status.textContent =
            'Voice could not play. Try Replay; subtitles remain available.';
      };
      utterance.onerror = failed;
      active = utterance;
      sync();
      try {
        synth.speak(utterance);
      } catch {
        // Optional native audio must never interrupt accepting a written reply.
        failed();
      }
    };
    next();
  };
  const toggleSound = () => {
    cancel();
    enabled = !enabled && Boolean(available());
    sync();
  };
  const hidden = () => {
    if (document.hidden) cancel();
  };
  const voicesChanged = () => {
    if (!available()) cancel();
    sync();
  };
  toggle?.addEventListener('click', toggleSound);
  replay?.addEventListener('click', play);
  stop?.addEventListener('click', cancel);
  synth?.addEventListener('voiceschanged', voicesChanged);
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('pagehide', cancel);
  sync();
  return {
    cancel,
    clear() {
      cancel();
      current = '';
      sync();
    },
    accept(text: string, speak = true) {
      cancel();
      current = text;
      sync();
      if (speak && enabled) play();
    },
    destroy() {
      cancel();
      toggle?.removeEventListener('click', toggleSound);
      replay?.removeEventListener('click', play);
      stop?.removeEventListener('click', cancel);
      synth?.removeEventListener('voiceschanged', voicesChanged);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', cancel);
    },
  };
}
