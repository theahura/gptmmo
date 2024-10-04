import * as completion from '@/lib/completion';
import * as inquirer from '@inquirer/prompts';
import * as prompts from '@/prompts';
import * as actions from '@/actions';
import * as status from '@gptmmo/status';

import * as fs from 'fs';

import type * as context from '@/context';

export type Session = Array<completion.Message>;

const ACTIONS = {
  LOAD_ROOM:
    'Used when the player is entering a new location from the current room. When this occurs, the system will need to either load a preexisting room from persistence, or create a new room depending on whether the room already exists. Does not output anything to the player.',
  UPDATE_ROOM:
    'Used when the player action only updates the current room. When this occurs, the system will generate a new description for the current room that takes into account the most recent players actions. This should only be done whenever there are any actions that result in permanent changes to the current room, such that the room description would need to be updated. Does not output anything to the player. Should never be used after LOAD_ROOM.',
  OUTPUT_TO_PLAYER:
    'Used when the system needs to output text to the player. The output text will be based on the most recent player action as well as any additional steps that the simulation has taken since the last action.',
  PROMPT_PLAYER:
    'Used when there are no additional actions that the simulation should take. The player will be prompted for their next action. Should always be used after OUTPUT_TO_PLAYER.',
};

export const runSession = async (args: {
  serverContext: context.ServerContext;
}): Promise<status.Status> => {
  const { serverContext } = args;

  /// Get the starting room if it exists, otherwise create it from scratch.
  /// Note: at some point, starting room gen should probably go into a init
  /// binary.

  let maybeCurrentRoom = await actions.loadRoom({
    x: 0,
    y: 0,
    z: 0,
    serverContext,
  });
  if (!status.isOk(maybeCurrentRoom)) {
    return maybeCurrentRoom;
  }
  let currentRoom = maybeCurrentRoom.value;

  /// Start the session loop.

  const session: Session = [
    {
      role: 'user',
      content: 'Start the play session now.',
    },
    {
      role: 'assistant',
      content: 'ACTION[LOAD_ROOM]: ' + currentRoom.description,
    },
  ];

  while (true) {
    // Output to a debug log.
    fs.appendFileSync(
      './session.log',
      JSON.stringify(session[session.length - 1]) + '\n',
    );

    const maybeNextStep = await prompts.actionSwitch({
      session,
      actions: ACTIONS,
    });
    if (!status.isOk(maybeNextStep)) {
      return maybeNextStep;
    }
    const nextStep = maybeNextStep.value;

    fs.appendFileSync('./session.log', 'ActionSwitch: ' + nextStep + '\n');

    switch (nextStep) {
      case 'LOAD_ROOM': {
        // Figure out the location of the room to load.
        const maybeLocation = await prompts.updateLocationFromSession({
          x: currentRoom.x,
          y: currentRoom.y,
          z: currentRoom.z,
          session,
        });
        if (!status.isOk(maybeLocation)) {
          return maybeLocation;
        }
        const { x, y, z } = maybeLocation.value;

        // Load the room.
        const maybeCurrentRoom = await actions.loadRoom({
          x,
          y,
          z,
          serverContext,
        });
        if (!status.isOk(maybeCurrentRoom)) {
          return maybeCurrentRoom;
        }
        currentRoom = maybeCurrentRoom.value;

        session.push({
          role: 'assistant',
          content: 'ACTION[LOAD_ROOM]: ' + currentRoom.description,
        });
        break;
      }
      case 'UPDATE_ROOM': {
        const updatedRoomDescription = await completion.streamToString(
          await prompts.updateRoomFromSession({
            originalDescription: currentRoom.description,
          }),
        );
        currentRoom = {
          ...currentRoom,
          description: updatedRoomDescription,
          lastUpdated: new Date().getTime(),
        };
        await serverContext.persistenceSession.Room.collection.insertOne(
          currentRoom,
        );
        session.push({
          role: 'assistant',
          content: 'ACTION[UPDATE_ROOM]: ' + updatedRoomDescription,
        });
        break;
      }
      case 'OUTPUT_TO_PLAYER': {
        const simulationResponse = await completion.streamToLog(
          await prompts.respondToPlayer({ session }),
        );
        session.push({
          role: 'assistant',
          content: 'ACTION[OUTPUT_TO_PLAYER]: ' + simulationResponse,
        });
        break;
      }
      case 'PROMPT_PLAYER': {
        const playerAction = await inquirer.input({
          message: 'What do you do next? ',
        });
        session.push({
          role: 'assistant',
          content: 'ACTION[PROMPT_PLAYER]: ' + 'What do you do next?',
        });
        session.push({ role: 'user', content: 'USER: ' + playerAction });
        break;
      }
    }
  }
};
