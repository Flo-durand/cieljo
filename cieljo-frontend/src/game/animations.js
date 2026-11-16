// Whether the game may play its animations (the deal, the flying cards, the flips, the grids closing up).
// They only play in front of the player: the tab must be visible, the game must not be catching up with what
// happened while the tab was hidden (it then shows the final state at once), and the player must not have
// asked their system to reduce motion.
export function animationsAllowed({ pageVisible, catchingUp, reducedMotion }) {
  return pageVisible && !catchingUp && !reducedMotion;
}
