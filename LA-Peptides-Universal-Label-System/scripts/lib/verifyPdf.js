'use strict';

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

const TOLERANCE_PT = 0.5;

// Reads the generated PDF back and asserts its page box matches
// label-spec.json's outputs.pdf size, in points, within TOLERANCE_PT.
async function verifyPdf(pdfPath, labelSpec) {
  const bytes = fs.readFileSync(pdfPath);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPage(0);
  const { width, height } = page.getSize();

  const expected = labelSpec.outputs.pdf;
  const widthOk = Math.abs(width - expected.width) <= TOLERANCE_PT;
  const heightOk = Math.abs(height - expected.height) <= TOLERANCE_PT;

  const result = {
    ok: widthOk && heightOk,
    actual: { width, height },
    expected: { width: expected.width, height: expected.height },
    unit: expected.unit
  };

  if (!result.ok) {
    throw new Error(
      `verifyPdf: page size mismatch. expected ${expected.width}x${expected.height}${expected.unit}, got ${width}x${height}${expected.unit}`
    );
  }

  return result;
}

module.exports = { verifyPdf };
