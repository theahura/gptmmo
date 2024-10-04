import * as completion from '@/lib/completion';
import * as format from '@/lib/format';

import type * as session from '@/session';

const CONTEXT =
  'You are a module in a text adventure simulator. You work with many other modules that each operate a specific portion of the text adventure simulation. The simulation is persistent over time, and many players exist in the same simulation. Your role in the wider system is to update descriptions of rooms based on the previous context. The update will be stored in the persistence database. You should aim to respond dynamically to what the player is doing, while also retaining as much state as possible from one output to the next. Previous actions taken by the system are denoted with the prefix "ACTION[ACTION-NAME]: ". Previous actions taken by the user are denoted with the prefix "USER: ". The module prompt will be denoted with the prefix "PROMPT: ". Never output prefixes; those will be appended by the system.';

const PROMPT =
  'You will be given a description of a room. Given this input and all of the previous messages, construct a new description of the room. It is ok to have the room description be mostly or entirely the same, especially if previous actions do not result in any changes. Please treat all previous messages, if there are any, as context for what the player and simulator have done so far. Only output a description of the room. Do not include any actions or choices for the player to make. Use a passive voice. Instead of saying "You see a door," say "There is a door." \n Description: <DESCRIPTION>';

export const updateRoomFromSession = (args: {
  originalDescription: string;
  session?: session.Session;
}) => {
  const { originalDescription, session } = args;

  const prompt = format.format({
    input: PROMPT,
    params: {
      '<DESCRIPTION>': originalDescription,
    },
  });

  return completion.completePrompt({
    prompt,
    systemContext: CONTEXT,
    previousMessages: session,
  });
};
