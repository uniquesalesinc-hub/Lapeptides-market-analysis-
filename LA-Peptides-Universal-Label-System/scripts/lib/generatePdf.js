'use strict';

const fs = require('fs');
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');

// Generates an exact-physical-size, vector print PDF from renderSvgString
// (absolute image paths — see resolveForRender). labelSpec.outputs.pdf gives
// the page size in points, matching label-spec.json's coordinateSystem 1:1.
function generatePdf(renderSvgString, outPath, labelSpec) {
  return new Promise((resolve, reject) => {
    const { width, height } = labelSpec.outputs.pdf;
    const doc = new PDFDocument({ size: [width, height], margin: 0, autoFirstPage: true });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    try {
      SVGtoPDF(doc, renderSvgString, 0, 0, { width, height, preserveAspectRatio: 'xMidYMid meet' });
    } catch (err) {
      reject(err);
      return;
    }

    doc.end();
    stream.on('finish', () => resolve(outPath));
    stream.on('error', reject);
  });
}

module.exports = { generatePdf };
