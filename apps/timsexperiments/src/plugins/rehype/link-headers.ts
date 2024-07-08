import type { RehypePlugin } from '@astrojs/markdown-remark';
import type { Element } from 'hast';
import { visit } from 'unist-util-visit';

interface Options {}

export const plugin: RehypePlugin = (options: Options) => {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'element') {
        return;
      }

      if (!isHeader(node)) {
        return;
      }

      node.children = [
        {
          type: 'element',
          tagName: 'button',
          properties: {
            class: 'flex gap-2 items-top text-left',
            'data-heading-link': '',
          },
          children: [
            ...node.children,
            {
              type: 'element',
              tagName: 'svg',
              properties: {
                class: 'h-[.9em] w-[.9em] mt-1.5',
                xmlns: 'http://www.w3.org/2000/svg',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': '2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
              },
              children: [
                {
                  type: 'element',
                  tagName: 'path',
                  properties: {
                    d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
                  },
                  children: [],
                },
                {
                  type: 'element',
                  tagName: 'path',
                  properties: {
                    d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ];
      return;
    });
  };
};

const isHeader = (element: Element) =>
  element.tagName === 'h1' ||
  element.tagName === 'h2' ||
  element.tagName === 'h3' ||
  element.tagName === 'h4' ||
  element.tagName === 'h5' ||
  element.tagName === 'h6';

export default plugin;
