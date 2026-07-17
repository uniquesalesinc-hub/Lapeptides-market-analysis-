#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildComponents } = require('./lib/buildComponents');

const ROOT = path.join(__dirname, '..');
const labelSpec = JSON.parse(fs.readFileSync(path.join(ROOT, 'label-spec.json'), 'utf8'));
const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'layout.json'), 'utf8'));

const result = buildComponents(labelSpec, layout);
const outPath = path.join(ROOT, 'components.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(`Wrote components.json (${result.components.length} components)`);
