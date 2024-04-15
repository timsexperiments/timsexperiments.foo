import type { RehypePlugin } from '@astrojs/markdown-remark';
import type { Element } from 'hast';
import { visit } from 'unist-util-visit';

interface Options {
  domain?: string;
  allBlank?: true;
}

export const plugin: RehypePlugin = (options?: Options) => {
  const { domain: siteDomain = '', allBlank = true } = options ?? {};

  return (tree) => {
    visit(tree, (node) => {
      if (node.type != 'element') {
        return;
      }

      const element = node as Element;

      if (!isAnchor(element)) {
        return;
      }

      const url = getUrl(element);

      if (isExternal(url, siteDomain) || allBlank) {
        element.properties!['target'] = '_blank';
      }
    });
  };
};

const isAnchor = (element: Element) =>
  element.tagName == 'a' && element.properties && 'href' in element.properties;

const getUrl = (element: Element) => {
  if (!element.properties) {
    return '';
  }

  const url = element.properties['href'];

  if (!url) {
    return '';
  }

  return url.toString();
};

const isExternal = (url: string, domain: string) => {
  return url.startsWith('http') && !url.includes(domain);
};

export default plugin;
