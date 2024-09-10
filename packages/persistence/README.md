# Persistence

This package defines the data model of GPTMMO. It's structured as

- `src/types/` ~ Typescript definitions for all of our persisted data types.
- `src/schema/` ~ JSONSchema for all of our persisted data types.
- `src/client.ts` ~ Exposes a `persistence.Client` which can be used to interact
  with persisted data in typesafe ways.

## Development Workflow

To run incremental builds:

```sh
npm start
```

To build the package:

```sh
npm run build
```

To lint the package:

```sh
npm run lint
```

To auto-format the package:

```sh
npm run format
```
