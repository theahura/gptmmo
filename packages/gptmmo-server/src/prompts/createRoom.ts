import * as completion from '@/lib/completion';

import type * as session from '@/session';

const CONTEXT =
  'You are a text adventure simulator. You simulate a basic dnd-style dungeon. There is no fixed story or end to the dungeon. As the simulator or dungeon master, you respond to what the player character wants to do by outputting additional text that describes the updated situation. You should aim to respond dynamically to what the player is doing, while also retaining as much state as possible from one output to the next.';

const PROMPT =
  'Please create a room for the player to explore. Please treat all previous messages, if there are any, as context for what the player has done so far. Only output a description of the room. Do not include any actions or choices for the player to make. Use a passive voice. Instead of saying "You see a door," say "There is a door.""';

export function createRoom(args: { session?: session.Session }) {
  const { session } = args;
  return completion.completePrompt({
    prompt: PROMPT,
    systemContext: CONTEXT,
    previousMessages: session,
  });
}
