import * as completion from '@/lib/completion';
import * as format from '@/lib/format';

import type * as session from '@/session';

const CONTEXT =
  'You are a text adventure simulator. You respond to what the player character wants to do. You must always maintain state from one message to the next. Coherence of the story is critical, and is what you will be evaluated on. It is ok to tell the player that some actions do not work as expected or fail outright if that keeps the story more coherent. Respond like a real DM might. Do not always agree with the user.';

const PROMPT =
  'You will be given a description of a room, a player action, and a simulation response. Given these three inputs, construct a new description of the room. It is ok to have the room description be mostly or entirely the same, especially if the player is simply leaving the current room to move to a new one. Please treat all previous messages, if there are any, as context for what the player has done so far. Only output a description of the room. Do not include any actions or choices for the player to make. Use a passive voice. Instead of saying "You see a door," say "There is a door.""';

export function updateRoomFromAction(args: {
  originalDescription: string;
  playerAction: string;
  update: string;
  session?: session.Session;
}) {
  const { originalDescription, playerAction, update, session } = args;

  const prompt = format.format({
    input: PROMPT,
    params: {
      '<DESCRIPTION>': originalDescription,
      '<ACTION>': playerAction,
      '<UPDATE>': update,
    },
  });

  return completion.completePrompt({
    prompt,
    systemContext: CONTEXT,
    previousMessages: session,
  });
}
