'use strict';

// Adapts a brand-profile.json + product-profile.json pair (the authoring
// format — see RENDERING-SPEC.md) into the internal theme + field-map shape
// that applyTheme.js / applyFields.js already understand. This is the ONLY
// place that mapping lives — brand-profile.schema.json and
// product-profile.schema.json document the "-> element_id" mapping in prose;
// this file is where it's actually executed.

function composeTheme(brandProfile) {
  return {
    themeId: brandProfile.brandProfileId,
    name: brandProfile.name,
    colors: {
      background: brandProfile.colors.background,
      primary: brandProfile.colors.primary,
      secondary: brandProfile.colors.secondary,
      accent: brandProfile.colors.accent,
      darkAccent: brandProfile.colors.iconColor || brandProfile.colors.accent,
      border: brandProfile.colors.border
    },
    fonts: {
      heading: brandProfile.fonts.heading,
      subheading: brandProfile.fonts.subheading || brandProfile.fonts.body,
      body: brandProfile.fonts.body,
      mono: brandProfile.fonts.mono || brandProfile.fonts.body
    },
    logo: { primary: brandProfile.logo.primary },
    border: brandProfile.border || {},
    qrCaptionStyle: { text: (brandProfile.qrStyle && brandProfile.qrStyle.caption) || 'SCAN FOR COA' }
  };
}

function stripScheme(url) {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
}

function composeFieldMap(brandProfile, productProfile) {
  return {
    brand_logo: brandProfile.logo.primary,
    brand_logo_secondary: brandProfile.logo.secondary ?? null,
    brand_name: brandProfile.name,
    brand_subtitle: brandProfile.subtitle ?? null,
    brand_tagline: brandProfile.tagline ?? null,
    brand_decorative_graphic: brandProfile.decorativeGraphic ?? null,
    purity_icon: brandProfile.icons ? (brandProfile.icons.purity ?? null) : null,
    lab_icon: brandProfile.icons ? (brandProfile.icons.labTested ?? null) : null,
    country_icon: brandProfile.countryGraphic ?? null,

    product_name: productProfile.peptideName,
    product_descriptor: productProfile.descriptor ?? null,
    product_strength: productProfile.strength,
    product_concentration: productProfile.concentration ?? null,
    product_vial_size: productProfile.vialSize ?? null,
    purity_claim: productProfile.purityClaim ?? null,
    lab_claim: productProfile.labTestedClaim ?? null,

    coa_qr: productProfile.coaQrDestination,
    qr_caption: productProfile.qrCaption || (brandProfile.qrStyle && brandProfile.qrStyle.caption) || null,
    lot_number: productProfile.lot,
    ubd: productProfile.ubd,
    coa_url: productProfile.coaUrl || stripScheme(productProfile.coaQrDestination)
  };
}

module.exports = { composeTheme, composeFieldMap };
