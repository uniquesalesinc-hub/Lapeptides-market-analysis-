'use strict';

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');
const { byId } = require('./xml');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function isUrl(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

// Applies field-map values to `doc` (a distributable, relative-path SVG DOM) per
// labelSpec.fields, copying any referenced local assets into distDir/assets/...
// Returns { appliedFields } for the build manifest.
async function applyFields(doc, labelSpec, fieldMap, theme, { packageRoot, distDir }) {
  const appliedFields = {};

  for (const field of labelSpec.fields) {
    let value = fieldMap[field.fieldKey];

    if (value == null && field.fieldKey === 'branding.logo.primary' && theme.logo) {
      value = theme.logo.primary;
    }
    if (value == null && field.fieldKey === 'branding.defaultClaim' && theme.defaultClaims && theme.defaultClaims[0]) {
      value = theme.defaultClaims[0];
    }

    if (value == null) {
      if (field.required) {
        throw new Error(`applyFields: missing required field "${field.fieldKey}"`);
      }
      continue; // leave the master template's placeholder value in place
    }

    if (field.maxLength && String(value).length > field.maxLength) {
      console.warn(`[applyFields] "${field.fieldKey}" exceeds maxLength ${field.maxLength} (${String(value).length} chars)`);
    }

    const el = byId(doc, field.elementId);
    if (!el) throw new Error(`applyFields: element id "${field.elementId}" not found for field "${field.fieldKey}"`);

    if (field.applyAs === 'text') {
      el.textContent = value;
      appliedFields[field.fieldKey] = value;
    } else if (field.applyAs === 'attr:href') {
      const relDest = await copyAssetIntoDist(value, packageRoot, distDir);
      for (const attr of field.attrs) el.setAttribute(attr, relDest);
      appliedFields[field.fieldKey] = relDest;
    } else if (field.applyAs === 'qr') {
      const relDest = path.posix.join('assets', 'qr', 'tracking-qr.png');
      const absDest = path.join(distDir, relDest);
      ensureDir(path.dirname(absDest));
      await QRCode.toFile(absDest, value, { margin: 1, width: 512, color: { dark: '#000000', light: '#FFFFFF' } });
      for (const attr of field.attrs) el.setAttribute(attr, relDest);
      appliedFields[field.fieldKey] = value; // record the encoded URL, not the generated file
    } else {
      throw new Error(`applyFields: unknown applyAs "${field.applyAs}"`);
    }
  }

  return { appliedFields };
}

async function copyAssetIntoDist(relValue, packageRoot, distDir) {
  if (isUrl(relValue)) return relValue; // remote asset — left as-is, not copied
  const srcAbs = path.resolve(packageRoot, relValue);
  const destAbs = path.join(distDir, relValue);
  ensureDir(path.dirname(destAbs));
  fs.copyFileSync(srcAbs, destAbs);
  return relValue.split(path.sep).join('/');
}

// Produces a second, render-only copy of the SVG string where every <image>
// href is inlined as a base64 data URI. This is required, not cosmetic:
// modern librsvg (used by sharp for PNG rasterization) refuses to resolve
// local-file <image> hrefs — file path or absolute path, buffer or file input,
// it makes no difference — as a resource-loading safety restriction, so any
// non-inlined local reference silently renders as blank. Data URIs sidestep
// that restriction entirely and are also what pdfkit/svg-to-pdfkit expect for
// embedded raster images. SVG-format images (e.g. a vector logo) are
// rasterized to PNG first, since neither renderer can embed nested SVG
// documents.
async function resolveForRender(distSvgString, distDir) {
  const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
  const doc = new DOMParser().parseFromString(distSvgString, 'image/svg+xml');

  const images = require('xpath').select("//*[local-name()='image']", doc);
  let counter = 0;
  for (const img of images) {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href');
    if (!href || isUrl(href)) continue;
    const absSrc = path.join(distDir, href);
    let pngBuffer;

    if (path.extname(absSrc).toLowerCase() === '.svg') {
      counter += 1;
      const widthAttr = img.getAttribute('width');
      const widthPx = widthAttr ? Math.max(64, Math.round(parseFloat(widthAttr) * 4)) : 512;
      pngBuffer = await sharp(absSrc, { density: 300 }).resize({ width: widthPx }).png().toBuffer();
    } else {
      pngBuffer = fs.readFileSync(absSrc);
    }

    const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    img.setAttribute('href', dataUri);
    img.setAttribute('xlink:href', dataUri);
  }

  return new XMLSerializer().serializeToString(doc);
}

module.exports = { applyFields, resolveForRender };
