import type * as primaryKeys from '@/types/primaryKeys';

export type Room = {
  _id: primaryKeys.Room;
  name: string;
  description: string;
  lastUpdated: number;
  x: number;
  y: number;
  z: number;
};
