import * as roomTypes from '@/types/Room';

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
    connections: {
      type: 'object',
      required: [],
      additionalProperties: {
        type: 'string',
      },
    },
  },
  required: ['_id', 'name', 'description', 'lastUpdated', 'connections'],
  additionalProperties: false,
};
