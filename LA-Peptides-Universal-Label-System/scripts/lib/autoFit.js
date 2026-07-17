'use strict';

const { byId } = require('./xml');

// avgCharWidthFactor is an approximation (bold condensed sans, ~0-0.1
// letter-spacing) — not real glyph metrics. See VALIDATION-RULES.md
// "Auto-fitting long peptide names" for what this does and does not cover.
function computeAutoFitFontSize({ text, baseFontSizePt, minFontSizePt, maxWidthPt, avgCharWidthFactor = 0.62 }) {
  const estimatedWidth = text.length * baseFontSizePt * avgCharWidthFactor;
  if (estimatedWidth <= maxWidthPt) return baseFontSizePt;
  const scaled = baseFontSizePt * (maxWidthPt / estimatedWidth);
  return Math.max(minFontSizePt, Math.round(scaled * 100) / 100);
}

// Mutates `doc` in place: for every layout.json region carrying an `autoFit`
// block that was actually set by appliedFields, shrinks its font-size
// attribute if the estimated rendered width of the new text would exceed the
// region's own width. layout.json (not this file) is the single source of
// truth for which fields autofit and their base/min font sizes — see
// layout.json -> regions[].autoFit. Fields left at the master's placeholder
// (not present in appliedFields) are untouched — the placeholder was already
// tuned to fit at the base size.
function applyAutoFit(doc, layout, appliedFields) {
  const results = [];
  for (const region of layout.regions) {
    if (!region.autoFit || !region.autoFit.enabled) continue;

    const text = appliedFields[region.id];
    if (text == null) continue;

    const { baseFontSizePt, minFontSizePt } = region.autoFit;
    const maxWidthPt = (region.width / 100) * layout.canvas.widthPt;
    const fontSize = computeAutoFitFontSize({ text, baseFontSizePt, minFontSizePt, maxWidthPt });

    if (fontSize !== baseFontSizePt) {
      const el = byId(doc, region.id);
      if (el) el.setAttribute('font-size', String(fontSize));
    }

    results.push({ elementId: region.id, text, baseFontSizePt, appliedFontSizePt: fontSize, maxWidthPt });
  }
  return results;
}

module.exports = { applyAutoFit, computeAutoFitFontSize };
