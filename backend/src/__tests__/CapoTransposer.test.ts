import { CapoTransposer } from '../lib/transposers/CapoTransposer';

const t = new CapoTransposer();

describe('CapoTransposer', () => {
  it('capo 2: A → G (song in A, player uses G shapes)', () => {
    expect(t.transpose('A', 2)).toBe('G');
  });

  it('capo 2: E → D', () => {
    expect(t.transpose('E', 2)).toBe('D');
  });

  it('capo 5: A → E', () => {
    expect(t.transpose('A', 5)).toBe('E');
  });

  it('capo 3: Bb → G', () => {
    expect(t.transpose('Bb', 3)).toBe('G');
  });

  it('capo 0 is a no-op', () => {
    expect(t.transpose('G', 0)).toBe('G');
  });

  it('capo 12 returns same chord (full octave)', () => {
    expect(t.transpose('C', 12)).toBe('C');
  });

  it('preserves chord quality: Am capo 2 → Gm', () => {
    expect(t.transpose('Am', 2)).toBe('Gm');
  });

  it('preserves maj7 quality: Cmaj7 capo 2 → Bbmaj7', () => {
    expect(t.transpose('Cmaj7', 2)).toBe('Bbmaj7');
  });

  it('preserves slash chord: G/B capo 2 → F/A', () => {
    expect(t.transpose('G/B', 2)).toBe('F/A');
  });

  it('preserves m7b5 quality: Cm7b5 capo 2 → Bbm7b5', () => {
    expect(t.transpose('Cm7b5', 2)).toBe('Bbm7b5');
  });

  it('capo 2 on D → C (common guitar key)', () => {
    expect(t.transpose('D', 2)).toBe('C');
  });

  it('capo 4 on F# → D', () => {
    expect(t.transpose('F#', 4)).toBe('D');
  });
});
