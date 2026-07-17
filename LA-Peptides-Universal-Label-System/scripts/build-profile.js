#!/usr/bin/env node
'use strict';

/*
 * Build a finished label from a brand-profile.json + product-profile.json
 * pair — the recommended authoring format (see RENDERING-SPEC.md). Validates
 * both profiles (scripts/lib/validateProfiles.js), composes them into the
 * internal theme + field-map shape (scripts/lib/composeProfiles.js), and
 * builds via scripts/build.js's buildLabel() core — identical output to an
 * equivalent --theme/--fields build.js invocation.
 *
 * Usage:
 *   node scripts/build-profile.js --brand <brand-profile.json> --product <product-profile.json> --out <dir> [--zip] [--strict]
 *
 * --strict fails the build on validation warnings, not just errors. Errors
 * (missing required fields, malformed colors/URLs/dates, bad logo formats)
 * always fail the build regardless of --strict.
 */

const fs = require('fs');
const path = require('path');

const { buildLabel } = require('./build');
const { composeTheme, composeFieldMap } = require('./lib/composeProfiles');
const { validateProfiles } = require('./lib/validateProfiles');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { zip: false, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--brand') args.brand = argv[++i];
    else if (a === '--product') args.product = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--zip') args.zip = true;
    else if (a === '--strict') args.strict = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.brand) throw new Error('--brand <brand-profile.json path> is required');
  if (!args.product) throw new Error('--product <product-profile.json path> is required');
  if (!args.out) throw new Error('--out <dir> is required');
  return args;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function buildFromProfiles({ brand: brandPath, product: productPath, out, zip, strict }) {
  const labelSpec = readJson(path.join(PACKAGE_ROOT, 'label-spec.json'));
  const brandProfile = readJson(path.resolve(PACKAGE_ROOT, brandPath));
  const productProfile = readJson(path.resolve(PACKAGE_ROOT, productPath));

  const { errors, warnings } = validateProfiles(brandProfile, productProfile, labelSpec);

  for (const w of warnings) console.warn(`[validate] WARNING: ${w}`);
  for (const e of errors) console.error(`[validate] ERROR: ${e}`);

  if (errors.length) {
    throw new Error(`Validation failed with ${errors.length} error(s) — see above. Build aborted.`);
  }
  if (strict && warnings.length) {
    throw new Error(`--strict: validation produced ${warnings.length} warning(s) — see above. Build aborted.`);
  }

  const theme = composeTheme(brandProfile);
  const fieldMap = composeFieldMap(brandProfile, productProfile);

  return buildLabel({
    theme,
    fieldMap,
    out,
    zip,
    provenance: {
      themeSource: `(composed from ${brandPath})`,
      fieldsSource: `(composed from ${brandPath} + ${productPath})`,
      brandProfileSource: brandPath,
      productProfileSource: productPath
    }
  });
}

if (require.main === module) {
  buildFromProfiles(parseArgs(process.argv.slice(2))).catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

module.exports = { buildFromProfiles };
