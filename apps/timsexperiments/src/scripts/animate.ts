const ANIMATE_IN_VIEWPORT_SELECTOR = '.animate-in-viewport';

function setupAnimateStartInViewport() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const target = entry.target as HTMLElement;
      const animation = target.dataset.animation;
      if (animation) {
        target.classList.toggle(animation, entry.isIntersecting);
      } else {
        console.warn(
          `Expected a "data-animation" property on ${target} but found none. ` +
            'To set up start in viewport, the element should have a ' +
            '"data-animation" property which specifies the animation to ' +
            'start when the element enters the viewport.'
        );
      }
    });
  }, {});

  const startInViewportEls = document.querySelectorAll<HTMLElement>(
    ANIMATE_IN_VIEWPORT_SELECTOR
  );
  startInViewportEls.forEach((el) => observer.observe(el));
}

setupAnimateStartInViewport();
