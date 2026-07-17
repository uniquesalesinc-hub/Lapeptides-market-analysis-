#!/usr/bin/env node
'use strict';

/*
 * Produces the package's own committed master deliverables at the package
 * root — master-label-preview.png, master-label-print.pdf,
 * master-label-editable.pdf — by running build.js with default-theme.json
 * and no field-map (so all content stays neutral placeholders), then copying
 * the generically-named build output to the exact requested filenames.
 *
 * Usage: node scripts/build-master.js
 */

const fs = require('fs');
const path = require('path');
const { build } = require('./build');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(PACKAGE_ROOT, '.build', 'master');

async function main() {
  await build({ theme: 'default-theme.json', fields: null, out: '.build/master', zip: false });

  fs.copyFileSync(path.join(STAGING_DIR, 'label-preview.png'), path.join(PACKAGE_ROOT, 'master-label-preview.png'));
  fs.copyFileSync(path.join(STAGING_DIR, 'label-print.pdf'), path.join(PACKAGE_ROOT, 'master-label-print.pdf'));
  fs.copyFileSync(path.join(STAGING_DIR, 'label-print.pdf'), path.join(PACKAGE_ROOT, 'master-label-editable.pdf'));

  console.log('Wrote master-label-preview.png, master-label-print.pdf, master-label-editable.pdf to package root.');
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
