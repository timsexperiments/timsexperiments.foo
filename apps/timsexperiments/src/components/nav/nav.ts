function createNavIdSelector(id?: string) {
  if (!id) {
    return '[data-nav-id]';
  }
  return `[data-nav-id=${id}]`;
}

function getNavigators() {
  return Array.from(document.querySelectorAll(createNavIdSelector()));
}

function getNavigatorSection(navigator: Element) {
  const sectionId = navigator.getAttribute('data-nav-id');
  return document.querySelector(`#${sectionId}`)!;
}

function setUpNavigator(navigator: Element) {
  const section = getNavigatorSection(navigator);
  navigator.addEventListener('click', () => {
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  return navigator;
}

function sectionNavigator(section: Element) {
  const id = section.id;
  const navigatorSelector = createNavIdSelector(id);
  return document.querySelector(navigatorSelector)!;
}

const observer = new IntersectionObserver(
  (entries, _) => {
    let anyIntersecting = false;
    entries.forEach((entry) => {
      const navigator = sectionNavigator(entry.target);
      if (entry.isIntersecting && !anyIntersecting) {
        anyIntersecting = true;
        navigator.classList.add('active');
        console.log(
          'scrolling the navigator for',
          entry.target.id,
          'into view'
        );
        navigator.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        navigator.classList.remove('active');
      }
    });
  },
  { rootMargin: '-40% 0% -40% 0%', threshold: 0 }
);

getNavigators()
  .map(setUpNavigator)
  .map(getNavigatorSection)
  .forEach((element) => observer.observe(element));

export {};
