import * as bulkModify from '@/set/bulkModify';

describe('bulkModify', () => {
  it('adds values when true.', () => {
    const set = new Set<string>();
    bulkModify.bulkModify(set, ['foo', true], ['bar', true]);
    expect(Array.from(set)).toStrictEqual(['foo', 'bar']);
  });

  it('removes values when false.', () => {
    const set = new Set<string>(['foo', 'bar', 'baz']);
    bulkModify.bulkModify(set, ['foo', false], ['baz', false]);
    expect(Array.from(set)).toStrictEqual(['bar']);
  });

  it('can add and remove values at the same time.', () => {
    const set = new Set<string>(['foo', 'bar']);
    bulkModify.bulkModify(set, ['foo', true], ['bar', false], ['baz', true]);
    expect(Array.from(set)).toStrictEqual(['foo', 'baz']);
  });
});
