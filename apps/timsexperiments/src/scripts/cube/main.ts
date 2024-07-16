import * as actions from './actions';

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
});

worker.addEventListener('message', (event) => {
  const { action } = event.data;
  if (action === actions.UNHIDE) {
    const { selector } = event.data;
    const element = document.querySelector(selector);
    element.classList.remove('opacity-0');
    element.classList.add('opacity-100');
  } else if (action === actions.HIDE) {
    const { selector } = event.data;
    const element = document.querySelector(selector);
    element.classList.remove('opacity-100');
    element.classList.add('opacity-0');
  } else if (action === actions.ADD_CLASSES) {
    const { selector, classes } = event.data;
    const element = document.querySelector(selector);
    element.classList.add(...classes);
  } else if (action === actions.REMOVE_CLASSES) {
    const { selector, classes } = event.data;
    const element = document.querySelector(selector);
    element.classList.remove(...classes);
  } else if (action === actions.HIDE_PLACEHOLDER) {
    hidePlaceholder();
  }
});

window.addEventListener('load', () => {
  setTimeout(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const canvas = document.querySelector<HTMLCanvasElement>('canvas#cube')!;
    const offscreenCanvas = canvas.transferControlToOffscreen();

    const sizes = {
      width: window.innerWidth / 1.5,
      height: window.innerHeight,
      get aspect() {
        return this.height !== 0 ? this.width / this.height : 0;
      },
    };
    canvas.style.width = sizes.width + 'px';
    canvas.style.height = sizes.height + 'px';

    worker.postMessage(
      {
        canvas: offscreenCanvas,
        isDark,
        sizes,
        action: actions.INIT,
        devicePixelRatio: window.devicePixelRatio,
      },
      [offscreenCanvas]
    );

    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth / 1.5;
      sizes.height = window.innerHeight;
      canvas.style.width = sizes.width + 'px';
      canvas.style.height = sizes.height + 'px';

      worker.postMessage({ sizes, action: actions.RESIZE });
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          const isDark = document.documentElement.classList.contains('dark');
          worker.postMessage({ isDark, action: actions.UPDATE_THEME });
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Forwarding events to the worker
    window.addEventListener('mousedown', (event) => {
      worker.postMessage({
        action: actions.DISPATCH_EVENT,
        boundingRect: canvas.getBoundingClientRect(),
        eventData: { clientX: event.clientX, clientY: event.clientY },
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        type: 'mousedown',
      });
    });

    window.addEventListener('mousemove', (event) => {
      worker.postMessage({
        action: actions.DISPATCH_EVENT,
        boundingRect: canvas.getBoundingClientRect(),
        eventData: { clientX: event.clientX, clientY: event.clientY },
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        type: 'mousemove',
      });
    });

    window.addEventListener('mouseup', () => {
      worker.postMessage({
        action: actions.DISPATCH_EVENT,
        boundingRect: canvas.getBoundingClientRect(),
        eventData: {},
        type: 'mouseup',
      });
    });

    window.addEventListener('keyup', (event) => {
      worker.postMessage({
        action: actions.DISPATCH_EVENT,
        eventData: { key: event.key },
        type: 'keydown',
      });
    });
  }, 100);
});

function hidePlaceholder() {
  const cubePlaceholder =
    document.querySelector<HTMLDivElement>('#cube-placeholder')!;

  cubePlaceholder.parentElement?.removeChild(cubePlaceholder);
}
