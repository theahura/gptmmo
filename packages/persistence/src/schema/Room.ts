import type * as roomTypes from '@/types/Room';
import type * as validation from '@gptmmo/validation';

export const ROOM: validation.Schema<roomTypes.Room> = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    lastUpdated: {
      type: 'number',
    },
    x: { 
      type: 'number',
    },
    y: { 
      type: 'number',
    },
    z: { 
      type: 'number',
    },
  },
  required: ['_id', 'name', 'description', 'lastUpdated', 'x', 'y', 'z'],
  additionalProperties: false,
};
