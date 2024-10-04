import * as status from '@gptmmo/status';
import * as date from '@/lib/date';
import * as prompts from '@/prompts';
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
    const maybeRoomDescription = await prompts.createRoom({ session });
    if (!status.isOk(maybeRoomDescription)) {
      return maybeRoomDescription;
    }
    const roomDescription = maybeRoomDescription.value;

    const maybeRoomName = await prompts.roomNameFromDescription({
      roomDescription,
    });
    if (!status.isOk(maybeRoomName)) {
      return maybeRoomName;
    }
    const roomName = maybeRoomName.value;

    room = {
      _id: [x, y, z].join('-'),
      name: roomName,
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

    const maybeRoomDescription = await prompts.ageRoom({
      description: room.description,
      timePassed,
      session,
    });
    if (!status.isOk(maybeRoomDescription)) {
      return maybeRoomDescription;
    }
    const roomDescription = maybeRoomDescription.value;

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
