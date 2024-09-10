/**
 * AJV is a JSON schema validator. This file provides configuration helpers for
 * setting up AJV.
 *
 * Documentation: https://ajv.js.org/
 */

import * as collections from '@gptmmo/collections';
import * as validation from '@gptmmo/validation';
import * as ajvFormats from 'ajv-formats';
import * as ajvKeywords from 'ajv-keywords';

/**
 * AJV requires that a "compiler" instance is created from which all other
 * schema are processed. Here we create a singleton for the default compiler to
 * avoid reconstructing a compiler every time we need to process a schema.
 */
export const getAjvSingleton: collections.singleton.Getter<validation.Compiler> =
  collections.singleton.fromFactory(() => {
    const singleton = validation.createCompiler({ useDefaults: true });

    // Install common format validation for types such as (ISO string, duration,
    // URI, etc...).
    //
    // See https://ajv.js.org/packages/ajv-formats.html
    ajvFormats.default(singleton);

    // Install JS specific keywords such as (instanceof) to validate
    // non-serializable types.
    //
    // This is useful because packages like `mongodb` automatically convert ISO
    // Strings into `Date` objects. As a result, validating `mongodb` documents
    // requires that we can validate the `Date` object which is not part of the
    // JSON Spec.
    //
    // See https://ajv.js.org/packages/ajv-keywords.html
    ajvKeywords.default(singleton, ['instanceof']);

    return singleton;
  });
