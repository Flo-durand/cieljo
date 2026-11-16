import { describe, expect, it } from 'vitest';
import { animationsAllowed } from './animations';

describe('animationsAllowed', () => {
  const visible = { pageVisible: true, catchingUp: false, reducedMotion: false };

  it('allows the animations in front of the player', () => {
    expect(animationsAllowed(visible)).toBe(true);
  });

  it('forbids them while the tab is hidden', () => {
    expect(animationsAllowed({ ...visible, pageVisible: false })).toBe(false);
  });

  it('forbids them while catching up after the tab is shown again', () => {
    expect(animationsAllowed({ ...visible, catchingUp: true })).toBe(false);
  });

  it('forbids them when the player prefers reduced motion', () => {
    expect(animationsAllowed({ ...visible, reducedMotion: true })).toBe(false);
  });
});
