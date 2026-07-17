#!/usr/bin/env node
'use strict';

/*
 * Regression test suite for the whole package — `npm test`.
 *
 * Two kinds of checks:
 *   1. Schema validation: every canonical/derived JSON file, every brand-profile
 *      and product-profile instance (brand-profiles/, product-profiles/,
 *      examples/*), validated against its schema/*.schema.json with ajv.
 *   2. Build regression: every documented build path (master, legacy theme,
 *      brand+product profile, the long-name auto-fit case, all 3 example
 *      brands) actually runs end to end, including the exact-size PDF
 *      dimension check already performed by scripts/lib/verifyPdf.js.
 *
 * Exits non-zero on any failure so this can run in CI. No network access,
 * no external services — everything it needs is inside this package.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const ROOT = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
addFormats(ajv);
const compiledValidators = new Map(); // schema path -> compiled validate fn (avoid re-registering the same $id)
let failures = 0;
let passed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  ok  ${label}`);
    passed++;
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${err.message}`);
    failures++;
  }
}

async function checkAsync(label, fn) {
  try {
    await fn();
    console.log(`  ok  ${label}`);
    passed++;
  } catch (err) {
    console.error(`FAIL  ${label}\n      ${err.message}`);
    failures++;
  }
}

function validateAgainstSchema(schemaPath, instancePath) {
  let validateFn = compiledValidators.get(schemaPath);
  if (!validateFn) {
    const schema = readJson(path.join(ROOT, schemaPath));
    validateFn = ajv.compile(schema);
    compiledValidators.set(schemaPath, validateFn);
  }
  const instance = readJson(path.join(ROOT, instancePath));
  const valid = validateFn(instance);
  if (!valid) {
    throw new Error(`${instancePath} failed schema/${path.basename(schemaPath)}: ${JSON.stringify(validateFn.errors)}`);
  }
}

console.log('== Schema validation ==');

check('label-spec.json against schema/label-spec.schema.json', () =>
  validateAgainstSchema('schema/label-spec.schema.json', 'label-spec.json'));
check('layout.json against schema/layout.schema.json', () =>
  validateAgainstSchema('schema/layout.schema.json', 'layout.json'));
check('manifest.json against schema/manifest.schema.json', () =>
  validateAgainstSchema('schema/manifest.schema.json', 'manifest.json'));
check('components.json against schema/components.schema.json', () =>
  validateAgainstSchema('schema/components.schema.json', 'components.json'));
check('default-theme.json against schema/theme.schema.json', () =>
  validateAgainstSchema('schema/theme.schema.json', 'default-theme.json'));
check('example-brand-theme.json against schema/theme.schema.json', () =>
  validateAgainstSchema('schema/theme.schema.json', 'example-brand-theme.json'));

for (const f of fs.readdirSync(path.join(ROOT, 'brand-profiles'))) {
  if (f.endsWith('.json')) {
    check(`brand-profiles/${f} against schema/brand-profile.schema.json`, () =>
      validateAgainstSchema('schema/brand-profile.schema.json', `brand-profiles/${f}`));
  }
}
for (const f of fs.readdirSync(path.join(ROOT, 'product-profiles'))) {
  if (f.endsWith('.json')) {
    check(`product-profiles/${f} against schema/product-profile.schema.json`, () =>
      validateAgainstSchema('schema/product-profile.schema.json', `product-profiles/${f}`));
  }
}
for (const dir of fs.readdirSync(path.join(ROOT, 'examples'))) {
  const brandFile = `examples/${dir}/brand.json`;
  const productFile = `examples/${dir}/product.json`;
  if (fs.existsSync(path.join(ROOT, brandFile))) {
    check(`${brandFile} against schema/brand-profile.schema.json`, () =>
      validateAgainstSchema('schema/brand-profile.schema.json', brandFile));
  }
  if (fs.existsSync(path.join(ROOT, productFile))) {
    check(`${productFile} against schema/product-profile.schema.json`, () =>
      validateAgainstSchema('schema/product-profile.schema.json', productFile));
  }
}

console.log('\n== Cross-file id consistency ==');

check('layout/label-spec/manifest/components ids all match', () => {
  const spec = readJson(path.join(ROOT, 'label-spec.json'));
  const layout = readJson(path.join(ROOT, 'layout.json'));
  const manifest = readJson(path.join(ROOT, 'manifest.json'));
  const components = readJson(path.join(ROOT, 'components.json'));

  const specIds = new Set(spec.elements.map((e) => e.id));
  const layoutIds = new Set(layout.regions.map((r) => r.id));
  const manifestIds = new Set(manifest.editableRegionIds);
  const componentIds = new Set(components.components.map((c) => c.id));

  const setsEqual = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  if (!setsEqual(specIds, layoutIds)) throw new Error('label-spec.json elements != layout.json regions');
  if (!setsEqual(specIds, componentIds)) throw new Error('label-spec.json elements != components.json components');
  for (const id of manifestIds) {
    if (!specIds.has(id)) throw new Error(`manifest.json editableRegionIds has unknown id: ${id}`);
  }
});

console.log('\n== Build regression ==');

async function main() {
  const { build } = require('./build');
  const { buildFromProfiles } = require('./build-profile');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'label-verify-'));

  await checkAsync('master build (default-theme.json, no fields)', () =>
    build({ theme: 'default-theme.json', out: path.join(tmp, 'master') }));

  await checkAsync('legacy theme build (example-brand-theme.json)', () =>
    build({ theme: 'example-brand-theme.json', out: path.join(tmp, 'legacy-theme') }));

  await checkAsync('brand+product profile build (example-partner + example)', () =>
    buildFromProfiles({
      brand: 'brand-profiles/example-partner.brand-profile.json',
      product: 'product-profiles/example.product-profile.json',
      out: path.join(tmp, 'profile-example')
    }));

  await checkAsync('auto-fit build (example-partner + example-long-name)', () =>
    buildFromProfiles({
      brand: 'brand-profiles/example-partner.brand-profile.json',
      product: 'product-profiles/example-long-name.product-profile.json',
      out: path.join(tmp, 'profile-long-name')
    }));

  for (const dir of fs.readdirSync(path.join(ROOT, 'examples'))) {
    const brandFile = `examples/${dir}/brand.json`;
    const productFile = `examples/${dir}/product.json`;
    if (!fs.existsSync(path.join(ROOT, brandFile))) continue;
    await checkAsync(`example brand build (${dir})`, async () => {
      const result = await buildFromProfiles({ brand: brandFile, product: productFile, out: path.join(tmp, dir) });
      const committedPreview = path.join(ROOT, 'examples', dir, 'preview.png');
      if (fs.existsSync(committedPreview)) {
        const fresh = fs.readFileSync(path.join(tmp, dir, 'label-preview.png'));
        const committed = fs.readFileSync(committedPreview);
        if (!fresh.equals(committed)) {
          throw new Error(`committed examples/${dir}/preview.png is stale — rebuild and re-commit it`);
        }
      }
      return result;
    });
  }

  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(`\n${passed} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
