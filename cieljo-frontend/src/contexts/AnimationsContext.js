import { createContext, useContext } from 'react';

// Whether the game may animate now (see animationsAllowed in src/game/animations.js), provided by GameRoom.
// Outside a game room, animations are allowed.
export const AnimationsContext = createContext(true);

export const useAnimationsAllowed = () => useContext(AnimationsContext);
