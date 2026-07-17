'use strict';

const { byId } = require('./xml');

// Mutates `doc` in place, applying every entry in labelSpec.themeTargets from `theme`.
function applyTheme(doc, labelSpec, theme) {
  for (const target of labelSpec.themeTargets) {
    const tokenValue = getToken(theme, target.token);
    if (tokenValue == null) continue;
    const el = byId(doc, target.elementId);
    if (!el) {
      throw new Error(`applyTheme: element id "${target.elementId}" not found for token "${target.token}"`);
    }
    el.setAttribute(target.attr, tokenValue);
  }

  applyFonts(doc, labelSpec, theme);

  return doc;
}

function getToken(theme, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), theme);
}

function applyFonts(doc, labelSpec, theme) {
  const target = labelSpec.fontTargets;
  if (!target) return;
  const styleEl = byId(doc, target.styleElementId);
  if (!styleEl || !theme.fonts) return;

  let css = styleEl.textContent;
  css = css.replace(
    /(#master-label\s+text\s*\{\s*font-family:\s*)([^;]+)(;)/,
    `$1${theme.fonts.bodyFont}$3`
  );
  css = css.replace(
    /(#master-label\s+\.mono\s*\{\s*font-family:\s*)([^;]+)(;)/,
    `$1${theme.fonts.monoFont}$3`
  );
  styleEl.textContent = css;

  // Brand/product headings read the bolder brand font directly.
  for (const id of (target.brandFontElementIds || [])) {
    const el = byId(doc, id);
    if (el) el.setAttribute('font-family', theme.fonts.brandFont);
  }
}

module.exports = { applyTheme, getToken };
