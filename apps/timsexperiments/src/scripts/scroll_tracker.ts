export class ScrollTracker {
  private scroll: number = 0;

  constructor() {
    window.addEventListener('scroll', this.setPageScroll);
    window.addEventListener('resize', this.setPageScroll);
  }

  get currentScroll() {
    return this.scroll;
  }

  setPageScroll() {
    const htmlElement = document.documentElement;
    const percentScroll = htmlElement.scrollTop / htmlElement.clientHeight;
    this.scroll = percentScroll * 100;
    htmlElement.style.setProperty('--scroll', `${this.scroll}`);
  }
}

globalThis.scrollTracker = new ScrollTracker();
