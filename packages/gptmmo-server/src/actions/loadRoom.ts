import * as status from '@gptmmo/status';
import * as date from '@/lib/date';
import * as prompts from '@/prompts';
import * as completion from '@/lib/completion';
import type * as context from '@/context';
import type * as persistence from '@gptmmo/persistence';
import type * as session from '@/session';

/**
 * Attempt to load the room located at location x/y/z. If the room does not
 * exist, create it.
 */
export const loadRoom = async (args: {
  x: number;
  y: number;
  z: number;
  serverContext: context.ServerContext;
  session?: session.Session;
}): Promise<status.StatusOr<persistence.Room>> => {
  const { serverContext, x, y, z, session } = args;

  const maybeStartingRoom = status.errorOnNull(
    await serverContext.persistenceSession.Room.collection.findOne({
      x,
      y,
      z,
    }),
  );

  let room: persistence.Room;
  if (!status.isOk(maybeStartingRoom)) {
    const roomDescription = await completion.streamToString(
      await prompts.createRoom({ session }),
    );
    room = {
      _id: [x, y, z].join('-'),
      name: await completion.streamToString(
        await prompts.roomNameFromDescription({
          roomDescription,
        }),
      ),
      description: roomDescription,
      x,
      y,
      z,
      lastUpdated: new Date().getTime(),
    };

    const maybeInserted =
      await serverContext.persistenceSession.Room.collection.insertOne(room);
    if (!status.isOk(maybeInserted)) {
      return maybeInserted;
    }
  } else {
    room = maybeStartingRoom.value;
    const timePassed = date.dateDifferenceToString(
      new Date(),
      new Date(room.lastUpdated),
    );
    const roomDescription = await completion.streamToString(
      await prompts.ageRoom({
        description: room.description,
        timePassed,
        session,
      }),
    );
    room = {
      ...room,
      description: roomDescription,
      lastUpdated: new Date().getTime(),
    };

    const maybeUpdated =
      await serverContext.persistenceSession.Room.collection.updateOne(
        { _id: room._id },
        {
          $set: {
            description: roomDescription,
            lastUpdated: room.lastUpdated,
          },
        },
      );
    if (!status.isOk(maybeUpdated)) {
      return maybeUpdated;
    }
  }

  return status.fromValue(room);
};
