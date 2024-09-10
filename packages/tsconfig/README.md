# @gptmmo/tsconfig

This repo contains common tsconfigs used elsewhere in the monorepo.

## configs/base.json

This config defines language-level behavior and does not define anything which
impacts the emitted, transpiled code. Settings which impact the output of `tsc`
are often package-specific and should not be included in the base config which
is intended to enforce consistency regardless of deployment
environment.

## configs/utility.json

This config defines settings which are used for packages which export typescript
helpers rather than compiling to a deployment. For example, a package of utils
would prefer to use this config whereas a frontend deployment would not.
