/** Linear blend between two hex colours, t in 0..1. */
export const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * Math.min(Math.max(t, 0), 1)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

export const alpha = (hex: string, a: number): string => {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255}, ${(p >> 8) & 255}, ${p & 255}, ${a})`;
};
