#!/usr/bin/env node
'use strict';

/*
 * Build a themed (and optionally field-populated) label deliverable from the
 * canonical sources (master-label.svg + label-spec.json) plus a theme JSON
 * and, optionally, a field-map JSON.
 *
 * Usage:
 *   node scripts/build.js --theme <theme.json> [--fields <field-map.json>] --out <dir> [--zip]
 *
 * Omitting --fields builds the neutral, all-placeholder "master" deliverable
 * (theme applied, content untouched) — this is how master-label-preview.png,
 * master-label-editable.pdf, and master-label-print.pdf are produced.
 * Passing --fields builds one specific brand partner's finished label.
 *
 * Outputs, written into <dir>:
 *   label.svg         - portable, editable SVG (relative asset paths)
 *   label-preview.png - 300dpi raster preview
 *   label-print.pdf    - exact-physical-size vector print PDF
 *   assets/            - every local asset the label.svg references, copied in
 *   manifest.json      - build provenance: versions, inputs, applied fields, PDF verification
 *   <dir>.zip          - optional, if --zip is passed
 */

const fs = require('fs');
const path = require('path');

const { loadSvg, serialize } = require('./lib/xml');
const { applyTheme } = require('./lib/applyTheme');
const { applyFields, resolveForRender, copyReferencedImageAssets } = require('./lib/applyFields');
const { generatePng } = require('./lib/generatePng');
const { generatePdf } = require('./lib/generatePdf');
const { verifyPdf } = require('./lib/verifyPdf');
const { packageZip } = require('./lib/packageZip');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { zip: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--theme') args.theme = argv[++i];
    else if (a === '--fields') args.fields = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--zip') args.zip = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.theme) throw new Error('--theme <path> is required');
  if (!args.out) throw new Error('--out <dir> is required');
  return args;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function build({ theme: themePath, fields: fieldsPath, out, zip }) {
  const labelSpec = readJson(path.join(PACKAGE_ROOT, 'label-spec.json'));
  const theme = readJson(path.resolve(PACKAGE_ROOT, themePath));
  const fieldMap = fieldsPath ? readJson(path.resolve(PACKAGE_ROOT, fieldsPath)) : null;

  const distDir = path.resolve(PACKAGE_ROOT, out);
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Load canonical SVG and apply the theme (colors/fonts/logo/border).
  const doc = loadSvg(path.resolve(PACKAGE_ROOT, labelSpec.sourceFile));
  applyTheme(doc, labelSpec, theme);

  // 2. Optionally apply field-map values (brand/product/tracking content).
  //    Omitting --fields keeps the master template's neutral placeholders —
  //    this is the mode used to build the package's own master deliverables.
  let appliedFields = {};
  if (fieldMap) {
    ({ appliedFields } = await applyFields(doc, labelSpec, fieldMap, theme, {
      packageRoot: PACKAGE_ROOT,
      distDir
    }));
  }
  copyReferencedImageAssets(doc, PACKAGE_ROOT, distDir);

  const distSvgString = serialize(doc);
  const svgOutPath = path.join(distDir, 'label.svg');
  fs.writeFileSync(svgOutPath, distSvgString, 'utf8');

  // 3. Build a render-only variant (base64 data-URI images — see resolveForRender)
  //    and generate the PNG preview + exact-size print PDF from it.
  const renderSvgString = await resolveForRender(distSvgString, distDir);

  const pngPath = path.join(distDir, 'label-preview.png');
  const pdfPath = path.join(distDir, 'label-print.pdf');
  await generatePng(renderSvgString, pngPath, labelSpec);
  await generatePdf(renderSvgString, pdfPath, labelSpec);

  // 4. Verify the print PDF is exactly the physical size label-spec.json declares.
  const pdfVerification = await verifyPdf(pdfPath, labelSpec);

  // 5. Write a manifest documenting exactly what produced this build.
  const manifest = {
    templateId: labelSpec.templateId,
    templateVersion: labelSpec.templateVersion,
    builtAt: new Date().toISOString(),
    theme: { themeId: theme.themeId, source: themePath },
    fieldMap: { source: fieldsPath || null, appliedFields },
    outputs: {
      svg: path.relative(distDir, svgOutPath),
      png: path.relative(distDir, pngPath),
      pdf: path.relative(distDir, pdfPath)
    },
    pdfVerification
  };
  fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Built label into ${path.relative(PACKAGE_ROOT, distDir)}/`);
  console.log(`  svg:  ${manifest.outputs.svg}`);
  console.log(`  png:  ${manifest.outputs.png}`);
  console.log(`  pdf:  ${manifest.outputs.pdf}  (verified ${pdfVerification.actual.width}x${pdfVerification.actual.height}${pdfVerification.unit})`);

  // 6. Optionally zip the whole output directory for hand-off.
  if (zip) {
    const zipPath = `${distDir}.zip`;
    const result = await packageZip(distDir, zipPath);
    console.log(`  zip:  ${path.relative(PACKAGE_ROOT, result.path)} (${result.bytes} bytes)`);
  }
}

if (require.main === module) {
  build(parseArgs(process.argv.slice(2))).catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

module.exports = { build };
