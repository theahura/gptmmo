/**
 * This is a rollup plugin which generates a `package.json` file for a bundle so
 * that the package.json#dependencies contain only the dependencies used by that
 * bundle and the exact versions used. This is important so that if we include a
 * large library and we tree-shake most of it out, we don't still install a
 * large amount of unused dependencies.
 *
 * Example Usage:
 *
 * ```js
 * // rollup.config.js
 *
 * module.exports = {
 *   input: 'src/index.ts',
 *   output: {
 *     file: 'dist/server.cjs',
 *     format: 'cjs',
 *   },
 *   plugins: [
 *     generatePackageJson(),
 *   ]
 * ```
 *
 * Note that this package is heavily inspired by
 * https://www.npmjs.com/package/rollup-plugin-generate-package-json
 */

import * as fs from 'fs';
import * as nodeModule from 'module';
import * as path from 'path';

import * as dependencyUtil from '@/dependencies';
import * as logging from '@/logging';

import type * as rollup from 'rollup';

// A list of all natively available modules (e.g. `http` and `os`).
const NATIVE_MODULES: Set<string> = new Set(nodeModule.builtinModules);

export type GeneratePackageJsonArgs = {
  basePackageJson?: { [key: string]: any };
};

/**
 * Similar to other rollup packages, we export a function which can construct
 * the plugin definition given args to specialize it.
 *
 * @param args Named arguments. See properties for details.
 * @param args.basePackageJson An object representing a package.json that is
 *   used as a base for the package.json files produced by this plugin.
 *
 * @returns A rollup plugin.
 *
 *   ts-prune-ignore-next
 */
export default (args: GeneratePackageJsonArgs): rollup.Plugin => {
  const argsWithDefaults: Required<GeneratePackageJsonArgs> = {
    basePackageJson: {},
    ...args,
  };

  const { basePackageJson } = argsWithDefaults;

  // Throughout the build process, we collect known dependencies from
  // `package.json` files here.
  let knownDependencies: dependencyUtil.PackageJsonDependencies = {};

  return {
    name: '@gptmmo/rollup-plugin-generate-package-json',

    // Called on each rollup.rollup build. This is the recommended hook to use
    // when you need access to the options passed to `rollup.rollup()`. We use
    // this hook to identify all entrypoints for the bundle being built, and
    // from those identify which `package.json` files are responsible for the
    // bundle. We extract the dependencies from those files.
    //
    // Put succinctly, here we extract the first-level dependencies of your
    // bundle.
    //
    // See https://rollupjs.org/plugin-development/#buildstart
    buildStart(options) {
      const entrypoints = getBundleEntrypoints(options);
      const packageJsonPaths = new Set(
        entrypoints
          .map((entrypoint) => getPackageJsonFromAncestors(entrypoint))
          .filter(
            (packageJsonPath: string | null): packageJsonPath is string =>
              packageJsonPath != null,
          ),
      );

      for (const packageJsonPath of packageJsonPaths) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath).toString(),
        );
        if (packageJson.dependencies) {
          knownDependencies = dependencyUtil.merge(
            knownDependencies,
            packageJson.dependencies,
          );
        }
      }
    },

    // This hook is called each time a module has been fully parsed by Rollup.
    // This means it's the perfect place to run middleware after parsing a
    // module to record which dependencies are required by that module.
    //
    // Put succinctly, here we extract the nth-level dependencies of your
    // bundle.
    //
    // Note that this method is the largest difference with the package which
    // inspired this plugin: https://www.npmjs.com/package/rollup-plugin-generate-package-json
    //
    // See https://rollupjs.org/plugin-development/#moduleparsed
    moduleParsed(module) {
      // We are assuming here that `module.id` is an absolute file path of the
      // module's entrypoint. This isn't supported by documentation anywhere,
      // but we've observed it to be true.
      const packageJsonPath = getPackageJsonFromAncestors(module.id);
      if (packageJsonPath == null) {
        return;
      }

      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath).toString(),
      );
      if (packageJson.dependencies) {
        knownDependencies = dependencyUtil.merge(
          knownDependencies,
          packageJson.dependencies,
        );
      }
    },

    // Called at the end of bundle.generate() or immediately before the files
    // are written in bundle.write(). This hook can be used to respond to
    // generation of a bundle having finished. So this is the best place to
    // coalesce all of our dependencies and generate a package.json for the
    // bundle.
    //
    // See https://rollupjs.org/plugin-development/#generatebundle
    generateBundle(options, bundle) {
      // Determine which modules are actually used by the bundle by inspecting
      // the AST.

      const usedModules = new Set<string>();
      for (const asset of Object.values(bundle)) {
        if (asset.type === 'chunk') {
          for (const importPath of asset.imports) {
            // All imports should be external dependencies *except* imports to
            // other chunks in this bundle. We filter out those dependencies
            // here by checking if the import path is the name of a chunk
            // (e.g. `'./mychunk.js`).
            if (bundle[importPath]?.type === 'chunk') {
              continue;
            }

            usedModules.add(
              dependencyUtil.getModuleNameFromImportPath(importPath),
            );
          }
        }
      }

      // Identify the versions used for each used module.

      const usedDependencies: dependencyUtil.PackageJsonDependencies = {};
      for (const moduleName of usedModules) {
        if (NATIVE_MODULES.has(moduleName.replace(/^node:/, ''))) {
          // Skipping the dependency, as it is a native Node module.
          continue;
        }

        if (!(moduleName in knownDependencies)) {
          logging.warn(
            `Skipping dependency ${moduleName}, which is included by the ` +
              'bundle but is not included in a package.json',
          );
          continue;
        }

        usedDependencies[moduleName] = knownDependencies[moduleName];
      }

      // Write the used dependencies to the output directory as a new
      // `package.json`.

      const outputDirectory = getOutputDirectory(options);
      fs.writeFileSync(
        path.resolve(outputDirectory, 'package.json'),
        JSON.stringify(
          {
            ...basePackageJson,
            dependencies: dependencyUtil.merge(
              usedDependencies,
              basePackageJson.dependencies ?? {},
            ),
          },
          null,
          2,
        ),
      );

      // Clear the known dependencies so that they're recomputed for the next
      // generation flow.

      knownDependencies = {};
    },
  };
};

/**
 * Extract all bundle entrypoints for a rollup context.
 *
 * @param options The rollup input options.
 *
 * @returns An array of all entrypoint paths as absolute paths.
 */
const getBundleEntrypoints = (
  options: rollup.NormalizedInputOptions,
): Array<string> => {
  const relativeEntrypoints = Array.isArray(options.input)
    ? options.input
    : Object.values(options.input);
  return relativeEntrypoints.map((entrypoint) =>
    path.resolve(process.cwd(), entrypoint),
  );
};

/**
 * Given a path, walks the ancestors of that path looking for a `package.json`
 * file in any ancestral directories. Returns the first one it finds or null if
 * none are found.
 *
 * @param currentPath A file or directory path.
 *
 * @returns The package.json absolute path if found.
 */
const getPackageJsonFromAncestors = (currentPath: string): string | null => {
  const maybePackageJsonPath = path.resolve(currentPath, 'package.json');
  if (fs.existsSync(maybePackageJsonPath)) {
    return maybePackageJsonPath;
  }

  // We've hit root if we can no longer find a parent path that's different from
  // the current path.
  const parent = path.resolve(currentPath, '..');
  if (parent === currentPath) {
    return null;
  }

  return getPackageJsonFromAncestors(parent);
};

/**
 * Determine the output directory for a rollup context.
 *
 * @param options The rollup output options.
 *
 * @throws An error if the output directory cannot be determined.
 *
 * @returns A string directory.
 */
const getOutputDirectory = (
  options: rollup.NormalizedOutputOptions,
): string => {
  if (options.file) {
    return path.dirname(options.file);
  }

  if (options.dir) {
    return options.dir;
  }

  throw 'Unable to determine output directory.';
};
