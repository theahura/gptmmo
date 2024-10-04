# GPTMMO

Welcome to the GPTMMO monorepo!

## Getting Started

Install the following:

[nvm's installation instructions]: https://github.com/nvm-sh/nvm#installing-and-updating
[Docker](https://docs.docker.com/engine/install/) -- install the server, not desktop.
[tfswitch](https://tfswitch.warrensbox.com/Installation/)
[mongosh](https://www.mongodb.com/docs/mongodb-shell/install/)

Second, you can install the rest of our dependencies using `npm`:

```sh
nvm use
npm run initialize
```

NOTE: all future commands assume you have run `nvm use` at least once during
your current bash session. It is possible to run `nvm use` automatically for
any directory that has a `.nvmrc`. Take a look at the [nvm README](https://github.com/nvm-sh/nvm#deeper-shell-integration)
-- it is a very easy copy paste, and we highly recommend you do this.

Afterwards you should verify that everything installed correctly by building the
project. This has the added benefit of populating our build caches which is
necessary for running incremental builds. It is also a necessary step to
ensure that packages that depend on other packages work correctly.

```sh
npm run build
```

## Building

You can build/test/lint the entire mono repo by executing `npm` scripts at root,
however, you will frequently need to only operate in a single package at a time.
You can `cd` into any package of your choosing and they all support a number of
npm scripts to aid developing that specific package. For most packages this is
either:

```sh
npm start

# or

npm run build
```

## Code Quality

Each package as well as the root package support the commands `lint` and
`format`. For former will check for style conformance, the latter will
auto-format your code to comply with the linter. Please auto-format all code
before committing.

```
npm run format
```

## Adding Packages

To add a new package make a new folder in `packages/`. After that you can do
what you want! Typically you'll need:

```
my-package/
  package.json
  README.md
  eslint.config.js
  prettier.config.js
```

## Adding Dependencies

Unfortunately the lerna package syntax often conflicts with npm package syntax
making `npm install` break for many packages. Instead prefer to manually add
packages to `your-package/package.json` and run `npm run refresh` at root to
inspect and install all new monorepo dependencies. You may also need to add
the external dependency to the rollup config.

Note: if you add dependencies on other packages, you need to be sure
that you do one of the following things whenever you run the package:

- use `npx lerna run start --scope=@gptmmo/${PACKAGE}}` at root to ensure that
  lerna properly builds all of the associated dependencies
- use `npm run build` in any of the dependency packages (especially those that
  have changes), and then use `npm run start` in your root package.
