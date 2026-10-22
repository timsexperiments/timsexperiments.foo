import { describe, expect, test } from 'bun:test';
import { labRouteHash, parseLabRoute, type LabRoute } from './lab-route';

const slugs = new Set(['json-vs-protobuf', 'guides/agent orchestration']);
describe('shareable lab destinations', () => {
  const routes: LabRoute[] = [
    { kind: 'home' },
    { kind: 'room' },
    ...(
      ['recipes', 'workbench', 'robot', 'contact'] satisfies Array<
        'recipes' | 'workbench' | 'robot' | 'contact'
      >
    ).map((station): LabRoute => ({ kind: 'station', station })),
    { kind: 'article', slug: 'json-vs-protobuf' },
    { kind: 'article', slug: 'guides/agent orchestration' },
  ];
  for (const route of routes)
    test(`restores ${JSON.stringify(route)}`, () => {
      expect(parseLabRoute(labRouteHash(route), slugs)).toEqual(route);
    });
  test('only published article slugs can open the reader', () => {
    for (const hash of [
      '#lab/article/unpublished',
      '#lab/article/%',
      '#lab/article/%3Cscript%3E',
      '#lab/article/../../secret',
    ])
      expect(parseLabRoute(hash, slugs)).toBeNull();
  });
  test('leaves ordinary page anchors and unknown destinations alone', () => {
    expect(parseLabRoute('#lab-directory', slugs)).toBeNull();
    expect(parseLabRoute('#lab/unknown', slugs)).toBeNull();
  });
  test('chat links contain no conversation or question payload', () => {
    expect(labRouteHash({ kind: 'station', station: 'robot' })).toBe(
      '#lab/chat'
    );
  });
});
