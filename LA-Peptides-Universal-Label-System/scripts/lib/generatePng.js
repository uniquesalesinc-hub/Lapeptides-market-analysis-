'use strict';

const sharp = require('sharp');

// renderSvgString must already have every <image> href resolved to an absolute
// PNG path (see resolveForRender in applyFields.js).
async function generatePng(renderSvgString, outPath, labelSpec) {
  const density = labelSpec.outputs.png.targetDpi;
  await sharp(Buffer.from(renderSvgString), { density })
    .png()
    .toFile(outPath);
  return outPath;
}

module.exports = { generatePng };
