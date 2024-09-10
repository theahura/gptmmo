# GPTMMO Server Runtime

We have a lot of infrastructure that we want available in every server-side
binary. For example, each binary should have trivial access to S3, DocDB, etc...
We've struggled to know where to place common helpers for GPTMMO infrastructure
because they don't fit into `@gptmmo/libs.node.lib` as `lib` is designed to be independent
of GPTMMO-specific business logic. In response, we have this package which acts as
the common "runtime" for GPTMMO servers. Runtime meaning "collection of resources
enabling access to GPTMMO infrastructure".

## Package Structure

Each sub-folder in this package represents an external data source (aka
provider). They all contain a "provider.ts" file used to construct a client for
that provider and may have additional files which do things like fetch
credentials from AWS secrets.

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

To test the package:

```sh
npm test
```
