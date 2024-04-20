import type { RehypePlugin } from '@astrojs/markdown-remark';
import type { Element } from 'hast';
import { visit } from 'unist-util-visit';

interface Options {}

export const plugin: RehypePlugin = (options: Options) => {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type != 'element') {
        return;
      }

      const element = node as Element;

      if (!isPre(element)) {
        return;
      }

      if (element.properties['data-is-copy']) {
        delete element.properties['data-is-copy'];
        return;
      }

      const wrapper = wrapWithCodeDiv(element);
      wrapper.children.push({
        type: 'element',
        tagName: 'button',
        properties: {
          class:
            'absolute top-0 right-0 my-3 mx-4 md:my-5 md:mx-6 inline-flex items-center justify-center whitespace-nowrap rounded-md p-2 text-sm font-medium text-rhino-200 ring-offset-rhino-950 transition-colors hover:bg-rhino-800 hover:text-rhino-100 focus-visible:bg-rhino-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rhino-300 focus-visible:ring-offset-2 active:bg-rhino-50/20 disabled:pointer-events-none disabled:opacity-50',
          'data-copy-code-button': '',
          type: 'button',
        },
        children: [
          {
            type: 'element',
            tagName: 'svg',
            properties: {
              class: 'cursor-pointer h-4 w-4 rounded-sm',
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
                tagName: 'rect',
                properties: {
                  width: '14',
                  height: '14',
                  x: '8',
                  y: '8',
                  rx: '2',
                  ry: '2',
                },
                children: [],
              },
              {
                type: 'element',
                tagName: 'path',
                properties: {
                  d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
                },
                children: [],
              },
            ],
          },
          {
            type: 'element',
            tagName: 'span',
            properties: {
              class: 'sr-only',
            },
            children: [
              {
                type: 'text',
                value: 'Copy code to clipboard',
              },
            ],
          },
        ],
      });
    });
  };
};

const isPre = (element: Element) => element.tagName == 'pre';

const wrapWithCodeDiv = (element: Element) => {
  const copy: Element = {
    ...element,
  };

  copy.properties['data-is-copy'] = true;

  element.type = 'element';
  element.tagName = 'div';
  element.children = [copy];
  element.properties = {
    class: 'overflow-hidden relative my-6',
    'data-code-block': '',
  };
  delete element.position;
  delete element.content;
  delete element.data;

  return element;
};

export default plugin;
