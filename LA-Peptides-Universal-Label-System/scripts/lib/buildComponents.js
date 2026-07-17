'use strict';

// Joins layout.json (geometry + lock/placeholder/autofit metadata) with
// label-spec.json (field mapping + theme token targets + element roles) into
// one flat, per-component view. This is a DERIVED file — layout.json and
// label-spec.json remain the two sources of truth; nothing here is
// hand-maintained, so there is no drift risk. Regenerate with
// `npm run build:components` after any edit to either source file.
function buildComponents(labelSpec, layout) {
  const elementById = new Map(labelSpec.elements.map((e) => [e.id, e]));
  const fieldById = new Map(labelSpec.fields.map((f) => [f.elementId, f]));

  const themeTokensByElement = new Map();
  for (const target of labelSpec.themeTargets || []) {
    const list = themeTokensByElement.get(target.elementId) || [];
    list.push({ token: target.token, attr: target.attr });
    themeTokensByElement.set(target.elementId, list);
  }

  const fontTargets = labelSpec.fontTargets || {};
  const headingIds = new Set(fontTargets.headingFontElementIds || []);
  const subheadingIds = new Set(fontTargets.subheadingFontElementIds || []);

  const components = layout.regions.map((region) => {
    const element = elementById.get(region.id);
    const field = fieldById.get(region.id);

    let fontRole = null;
    if (headingIds.has(region.id)) fontRole = 'heading';
    else if (subheadingIds.has(region.id)) fontRole = 'subheading';

    return {
      id: region.id,
      type: region.type,
      layer: region.layer,
      role: element ? element.role : null,
      position: { xPct: region.x, yPct: region.y, widthPct: region.width, heightPct: region.height },
      textAnchor: region.textAnchor || null,
      alignment: region.alignment,
      baselineYPct: region.baselineYPct != null ? region.baselineYPct : null,
      locked: region.locked,
      defaultPlaceholder: region.defaultPlaceholder,
      autoFit: region.autoFit,
      field: field
        ? {
            fieldKey: field.fieldKey,
            required: !!field.required,
            maxLength: field.maxLength != null ? field.maxLength : null,
            applyAs: field.applyAs,
            description: field.description
          }
        : null,
      themeTokens: themeTokensByElement.get(region.id) || [],
      fontRole
    };
  });

  return {
    $schema: './schema/components.schema.json',
    generatedFrom: ['label-spec.json', 'layout.json'],
    templateVersion: labelSpec.templateVersion,
    note: 'Derived file — regenerate with `npm run build:components`. Do not hand-edit; edit label-spec.json / layout.json instead. Every visible object in master-label.svg is listed here as one addressable component with its full editable property set: geometry, lock state, default placeholder, alignment, auto-fit bounds, field-map key (if content-editable), and every theme token that restyles it.',
    components
  };
}

module.exports = { buildComponents };
