import { describe, it, expect } from 'vitest';
import { moveSection } from '../section-order';

describe('moveSection', () => {
  it('swaps an item with its previous neighbor when moving up', () => {
    expect(moveSection(['a', 'b', 'c'], 1, 'up')).toEqual(['b', 'a', 'c']);
  });

  it('swaps an item with its next neighbor when moving down', () => {
    expect(moveSection(['a', 'b', 'c'], 1, 'down')).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op when moving the first item up', () => {
    expect(moveSection(['a', 'b', 'c'], 0, 'up')).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op when moving the last item down', () => {
    expect(moveSection(['a', 'b', 'c'], 2, 'down')).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op for an out-of-range negative index', () => {
    expect(moveSection(['a', 'b', 'c'], -1, 'down')).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op for an out-of-range index beyond the list', () => {
    expect(moveSection(['a', 'b', 'c'], 5, 'up')).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    const result = moveSection(input, 1, 'up');
    expect(input).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(input);
  });

  it('is always a no-op for a single-element list', () => {
    expect(moveSection(['a'], 0, 'up')).toEqual(['a']);
    expect(moveSection(['a'], 0, 'down')).toEqual(['a']);
  });

  it('moves the first item down to the middle', () => {
    expect(moveSection(['a', 'b', 'c'], 0, 'down')).toEqual(['b', 'a', 'c']);
  });

  it('moves the last item up to the middle', () => {
    expect(moveSection(['a', 'b', 'c'], 2, 'up')).toEqual(['a', 'c', 'b']);
  });
});
