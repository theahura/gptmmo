import * as completion from '@/lib/completion';
import * as inquirer from '@inquirer/prompts';
import * as prompts from '@/prompts';
import * as actions from '@/actions';
import * as status from '@gptmmo/status';
import * as persistence from '@gptmmo/persistence';

// import * as fs from 'fs';

import type * as context from '@/context';

export type Session = {
  state: {
    roomThatThePlayerIsIn: persistence.Room;
    inventoryCurrentlyCarriedByPlayer: { [key: string]: string };
  };
  messages: Array<completion.Message>;
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

  const session: Session = {
    state: {
      roomThatThePlayerIsIn: currentRoom,
      inventoryCurrentlyCarriedByPlayer: {},
    },
    messages: [
      {
        role: 'user',
        content: 'Start the play session now.',
      },
    ],
  };

  while (true) {
    const simulationResponse = await completion.streamToLog(
      await prompts.respondToPlayer({ session }),
    );
    session.messages.push({
      role: 'assistant',
      content: simulationResponse,
    });

    const playerAction = await inquirer.input({
      message: 'What do you do next? ',
    });
    session.messages.push({
      role: 'assistant',
      content: 'What do you do next?',
    });
    session.messages.push({ role: 'user', content: playerAction });

    // Update state.
  }
};
