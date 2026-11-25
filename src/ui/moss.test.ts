import { describe, expect, it } from 'vitest';
import { drawMoss, MOSS_BASE } from './moss';

// WCAG relative luminance and contrast ratio.
const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const X_BLUE = luminance(0x1d, 0x4e, 0xd8);
const O_RED = luminance(0xbe, 0x12, 0x3c);

describe('drawMoss', () => {
  const size = 64;
  const pixels = drawMoss(size);

  it('draws the same pattern every time', () => {
    expect(drawMoss(size)).toEqual(pixels);
  });

  it('has a pattern, not one flat colour', () => {
    const lums = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4) lums.add(pixels[i] + pixels[i + 1] + pixels[i + 2]);
    expect(lums.size).toBeGreaterThan(20);
  });

  it('never goes darker than the base lime, so X and O keep at least 3 to 1 contrast on every pixel', () => {
    const base = luminance(...MOSS_BASE);
    for (let i = 0; i < pixels.length; i += 4) {
      const l = luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
      expect(l).toBeGreaterThanOrEqual(base);
      expect(contrast(l, X_BLUE)).toBeGreaterThanOrEqual(3);
      expect(contrast(l, O_RED)).toBeGreaterThanOrEqual(3);
    }
  });
});
