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
    console.log('clicked', section.id);
    section.scrollIntoView({ behavior: 'smooth' });
  });
  return navigator;
}

function sectionNavigator(section: Element) {
  const id = section.id;
  const navigatorSelector = createNavIdSelector(id);
  return document.querySelector(navigatorSelector)!;
}

const observer = new IntersectionObserver(
  (entries, observer) => {
    console.log('AN OBSERVER EVENT HAPPENED...');
    let anyIntersecting = false;
    entries.forEach((entry) => {
      const navigator = sectionNavigator(entry.target);
      if (entry.isIntersecting && !anyIntersecting) {
        anyIntersecting = true;
        navigator.classList.add('active');
        console.log(entry.target.id, 'is in view');
      } else {
        navigator.classList.remove('active');
        console.log(entry.target.id, 'is out of view');
      }
      console.log();
    });
  },
  { rootMargin: '-40% 0% -40% 0%', threshold: 0 }
);

const sections = getNavigators()
  .map(setUpNavigator)
  .map(getNavigatorSection)
  .forEach((element) => observer.observe(element));

export {};
