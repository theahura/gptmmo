import * as completion from '@/lib/completion';

import type * as session from '@/session';

const CONTEXT =
  'You are a module in a text adventure simulator. You work with many other modules that each operate a specific portion of the text adventure simulation. The simulation is persistent over time, and many players exist in the same simulation. Your role in the wider system is to describe rooms. You should aim to respond dynamically to what the player is doing, while also retaining as much state as possible from one output to the next. Previous actions taken by the system are denoted with the prefix "ACTION[ACTION-NAME]: ". Previous actions taken by the user are denoted with the prefix "USER: ". The module prompt will be denoted with the prefix "PROMPT: ". Never output prefixes; those will be appended by the system.';

const PROMPT =
  'PROMPT: Please create a room for the player to explore. Please treat all previous messages, if there are any, as context for what the player has done so far. Only output a description of the room. Do not include any actions or choices for the player to make. Use a passive voice. Instead of saying "You see a door", say "There is a door." Rooms are placed in a voxel style volume. Every room is placed in a single unique x y z location. The y axis corresponds to north/south, the x axis corresponds to east/west, and the z axis corresponds to altitude. Assume that all rooms are the same "size" and that players can move between rooms in the x y z directions.';

export const createRoom = (args: { session?: session.Session }) => {
  const { session } = args;
  return completion.completePrompt({
    prompt: PROMPT,
    systemContext: CONTEXT,
    previousMessages: session,
  });
};
