import * as completion from '@/lib/completion';
import * as date from '@/lib/date';
import * as inquirer from '@inquirer/prompts';
import * as prompts from '@/prompts';
import * as status from '@gptmmo/status';
import * as format from '@/lib/format';
import type * as context from '@/context';
import type * as persistence from '@gptmmo/persistence';

const CONTEXT =
  'You are a text adventure simulator. You respond to what the player character wants to do. You must always maintain state from one message to the next. Coherence of the story is critical, and is what you will be evaluated on. It is ok to tell the player that some actions do not work as expected or fail outright if that keeps the story more coherent. Respond like a real DM might. Do not always agree with the user.';

const CONNECTED_ROOM_PROMPT =
  'There is a connected room with the following description: <DESCRIPTION>. The room is named: <NAME>. It is connected to the current room through: <CONNECTION>';

export type Session = Array<completion.Message>;

export const runSession = async (args: {
  serverContext: context.ServerContext;
}): Promise<status.Status> => {
  const { serverContext } = args;

  const messages: Session = [
    {
      role: 'user',
      content: CONTEXT + ' Start by creating a room for the player to begin.',
    },
  ];

  /// First, check to see if there is a starting room. If not, create one.
  /// Otherwise, load the room and age it based on when it was last updated.

  const maybeStartingRoom = status.errorOnNull(
    await serverContext.persistenceSession.Room.dataSource.findOneById('0'),
  );

  let currentRoom: persistence.Room;
  if (!status.isOk(maybeStartingRoom)) {
    const roomDescription = await completion.streamToLog(
      await prompts.createRoom({}),
    );
    currentRoom = {
      _id: '0',
      name: 'Starting Room',
      description: roomDescription,
      lastUpdated: new Date().getTime(),
      connections: {},
    };
    const maybeInserted =
      await serverContext.persistenceSession.Room.collection.insertOne(
        currentRoom,
      );
    if (!status.isOk(maybeInserted)) {
      return maybeInserted;
    }
    messages.push({ role: 'assistant', content: roomDescription });
  } else {
    const room = maybeStartingRoom.value;
    const timePassed = date.dateDifferenceToString(
      new Date(),
      new Date(room.lastUpdated),
    );
    const roomDescription = await completion.streamToLog(
      await prompts.ageRoom({ description: room.description, timePassed }),
    );
    currentRoom = {
      ...room,
      description: roomDescription,
      lastUpdated: new Date().getTime(),
    };
    const maybeUpdated =
      await serverContext.persistenceSession.Room.collection.insertOne(
        currentRoom,
      );
    if (!status.isOk(maybeUpdated)) {
      return maybeUpdated;
    }
    messages.push({ role: 'assistant', content: roomDescription });

    // Load any context that may be stored in nearby rooms.
    for (const [connection, roomId] of Object.entries(room.connections)) {
      const maybeConnectedRoom = status.errorOnNull(
        await serverContext.persistenceSession.Room.dataSource.findOneById(
          roomId,
        ),
      );
      if (!status.isOk(maybeConnectedRoom)) {
        return maybeConnectedRoom;
      }
      const connectedRoom = maybeConnectedRoom.value;
      messages.push({
        role: 'assistant',
        content: format.format({
          input: CONNECTED_ROOM_PROMPT,
          params: {
            '<DESCRIPTION>': connectedRoom.description,
            '<NAME>': connectedRoom.name,
            '<CONNECTION>': connection,
          },
        }),
      });
    }
  }

  while (true) {
    console.log('');

    /// Get feedback from the user and generate a response.

    const message = await inquirer.input({ message: 'What do you do next? ' });
    const completionStream = await completion.completePrompt({
      prompt: message,
      previousMessages: messages,
    });
    const response = await completion.streamToLog(completionStream);

    messages.push({ role: 'user', content: message });
    messages.push({ role: 'assistant', content: response });

    /// Process the LLM feedback, primarily doing things like storing or
    /// updating state or pulling in more context.

    // Output a change in the room description based on the previous
    // description and the result of the latest action.
    const updatedDescription = await completion.streamToString(
      await prompts.updateRoomFromAction({
        originalDescription: currentRoom.description,
        playerAction: message,
        update: response,
        session: messages,
      }),
    );
    currentRoom.description = updatedDescription;
    currentRoom.lastUpdated = new Date().getTime();
    await serverContext.persistenceSession.Room.collection.insertOne(
      currentRoom,
    );

    // Determine if the user changed rooms and whether it was a preexisting
    // room. If yes:
    //  - load the connected rooms into the context
    // If no:
    //  - create a new room, give it a name, and connect it to the current room
    const maybeDidRoomChange = status.fromValue(null);
    if (!status.isOk(maybeDidRoomChange)) {
      return maybeDidRoomChange;
    }
    const didRoomChange = maybeDidRoomChange.value;

    if (didRoomChange) {
    }
  }
};
