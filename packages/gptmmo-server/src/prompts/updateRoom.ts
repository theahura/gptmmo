import * as completion from '@/completion';
import * as format from '@/format';

const CONTEXT =
  'You are a text adventure simulator. You simulate a basic dnd-style dungeon. There is no fixed story or end to the dungeon. As the simulator or dungeon master, you respond to what the player character wants to do by outputting additional text that describes the updated situation. You should aim to respond dynamically to what the player is doing, while also retaining as much state as possible from one output to the next.';

const PROMPT =
  'Please treat all previous messages, if there are any, as context for what the player has done so far. The player has previously been in a room with the following description: <DESCRIPTION>. The following amount of time has passed: <TIME>. In that time, the following major events have occurred: <EVENTS>. Given the above, please update the description of the room. Note that events or time passing may have changed the room in some way, or may have left it exactly the same.';

export function updateRoom(args: {
  description: string;
  timePassed: string;
  events?: Array<string>;
  session?: completion.Session;
}) {
  const { description, timePassed, events, session } = args;

  const prompt = format.format({
    input: PROMPT,
    params: {
      '<DESCRIPTION>': description,
      '<TIME>': timePassed,
      '<EVENTS>': events ? events.join(', ') : 'none',
    },
  });

  return completion.completePrompt({
    prompt,
    systemContext: CONTEXT,
    previousMessages: session,
  });
}
