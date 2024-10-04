import * as completion from '@/lib/completion';
import * as validation from '@gptmmo/validation';
import * as format from '@/lib/format';
import * as status from '@gptmmo/status';

import type * as session from '@/session';

const CONTEXT =
  'You are a module in a larger text adventure simulator. You are part of the subsystem that manages the spatial geography of the simulator. The simulator manages a series of rooms. Rooms are placed in a voxel style volume. Every room is placed in a single unique x y z location. Assume that all rooms are the same "size" and that players can move between rooms in the x y z directions. The y axis corresponds to north/south, the x axis corresponds to east/west, and the z axis corresponds to altitude. Only output your response in JSON. Previous actions taken by the system are denoted with the prefix "ACTION[ACTION-NAME]: ". Previous actions taken by the user are denoted with the prefix "USER: ". The module prompt will be denoted with the prefix "PROMPT: ".';

const PROMPT =
  'PROMPT: The system is attempting to load a new room. Given the current x y z location, as well as the context of all of the messages before, what is the x y z location of the room that should be loaded? Note that the starting room is located at x: 0, y: 0, z: 0. Assume that z: 0 is equivalent to ground level. The output location should generally only be one unit away from the current location along each axis, but can be more than one unit away for multiple axes. For example, if the player is moving up a staircase facing the north wall of the starting room, the new room should be located at x: 0, y: 1, z: 1. There are rare cases where the new location may be farther away -- for example, if the player jumped out a window, the z should be set to 0. \n Current x: <X> \n Current y: <Y> \n Current z: <Z>';

const compiler = validation.createCompiler();

export type Location = {
  x: number;
  y: number;
  z: number;
};

const schema: validation.Schema<Location> = {
  type: 'object',
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
    z: { type: 'number' },
  },
  required: ['x', 'y', 'z'],
};

const validator = compiler.compile<Location>(schema);

export const updateLocationFromSession = async (args: {
  x: number;
  y: number;
  z: number;
  session: session.Session;
}): Promise<status.StatusOr<Location>> => {
  const { session, x, y, z } = args;

  const prompt = format.format({
    input: PROMPT,
    params: {
      '<X>': x.toString(),
      '<Y>': y.toString(),
      '<Z>': z.toString(),
    },
  });

  const maybeUntypedLocation = await completion.completePromptJSON({
    prompt,
    schema,
    systemContext: CONTEXT,
    previousMessages: session,
  });

  if (!status.isOk(maybeUntypedLocation)) {
    return maybeUntypedLocation;
  }
  const untypedLocation = maybeUntypedLocation.value;
  return validation.validate(validator, untypedLocation);
};
