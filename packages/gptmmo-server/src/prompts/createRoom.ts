import * as completion from '@/completion';

const CONTEXT =
  'You are a text adventure simulator. You simulate a basic dnd-style dungeon. There is no fixed story or end to the dungeon. As the simulator or dungeon master, you respond to what the player character wants to do by outputting additional text that describes the updated situation. You should aim to respond dynamically to what the player is doing, while also retaining as much state as possible from one output to the next.';

const PROMPT =
  'Please create a room for the player to explore. Please treat all previous messages, if there are any, as context for what the player has done so far.';

export function createRoom(args: { session?: completion.Session }) {
  const { session } = args;
  return completion.completePrompt({
    prompt: PROMPT,
    systemContext: CONTEXT,
    previousMessages: session,
  });
}
