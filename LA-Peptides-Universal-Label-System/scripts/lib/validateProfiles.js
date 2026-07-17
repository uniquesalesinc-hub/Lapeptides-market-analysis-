'use strict';

const path = require('path');

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const ACCEPTABLE_LOGO_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg'];
const UBD_PATTERN = /^\d{2}\/\d{4}$/;
const AUTOFIT_FIELD_IDS = new Set(['brand_name', 'product_name', 'brand_tagline']);

function maxLengthFor(labelSpec, fieldKey) {
  const field = labelSpec.fields.find((f) => f.fieldKey === fieldKey);
  return field ? field.maxLength : undefined;
}

function isSymbolRef(value) {
  return typeof value === 'string' && value.startsWith('#');
}

function isUrl(value) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function checkLogoFormat(value, label, errors) {
  if (value == null || isSymbolRef(value) || isUrl(value)) return; // symbol refs and remote URLs aren't local files to extension-check
  const ext = path.extname(value).toLowerCase();
  if (!ACCEPTABLE_LOGO_EXTENSIONS.includes(ext)) {
    errors.push(`${label}: "${value}" has an unrecognized extension "${ext || '(none)'}" — acceptable formats are ${ACCEPTABLE_LOGO_EXTENSIONS.join(', ')}.`);
  }
}

function checkHexColor(value, label, errors) {
  if (value != null && !HEX_COLOR.test(value)) {
    errors.push(`${label}: "${value}" is not a 6-digit hex color (expected format "#RRGGBB").`);
  }
}

function checkMaxLength(value, fieldKey, label, labelSpec, warnings) {
  if (value == null || AUTOFIT_FIELD_IDS.has(fieldKey)) return; // autofit fields shrink instead of overflowing
  const maxLength = maxLengthFor(labelSpec, fieldKey);
  if (maxLength != null && String(value).length > maxLength) {
    warnings.push(`${label}: "${value}" is ${String(value).length} chars, exceeding the tested-safe ${maxLength}-char budget for this field's fixed-width box. It may visually overflow — see VALIDATION-RULES.md.`);
  }
}

function validateBrandProfile(brandProfile, labelSpec) {
  const errors = [];
  const warnings = [];

  for (const req of ['brandProfileId', 'name', 'logo', 'fonts', 'colors']) {
    if (brandProfile[req] == null) errors.push(`brand-profile: missing required top-level field "${req}".`);
  }
  if (errors.length) return { errors, warnings };

  if (!brandProfile.logo.primary) errors.push('brand-profile: logo.primary is required.');
  checkLogoFormat(brandProfile.logo.primary, 'brand-profile.logo.primary', errors);
  checkLogoFormat(brandProfile.logo.secondary, 'brand-profile.logo.secondary', errors);
  checkLogoFormat(brandProfile.decorativeGraphic, 'brand-profile.decorativeGraphic', errors);
  checkLogoFormat(brandProfile.countryGraphic, 'brand-profile.countryGraphic', errors);
  if (brandProfile.icons) {
    checkLogoFormat(brandProfile.icons.purity, 'brand-profile.icons.purity', errors);
    checkLogoFormat(brandProfile.icons.labTested, 'brand-profile.icons.labTested', errors);
  }

  for (const req of ['heading', 'body']) {
    if (!brandProfile.fonts[req]) errors.push(`brand-profile: fonts.${req} is required.`);
  }

  for (const req of ['background', 'primary', 'secondary', 'accent', 'border']) {
    checkHexColor(brandProfile.colors[req], `brand-profile.colors.${req}`, errors);
    if (brandProfile.colors[req] == null) errors.push(`brand-profile: colors.${req} is required.`);
  }
  checkHexColor(brandProfile.colors.iconColor, 'brand-profile.colors.iconColor', errors);

  checkMaxLength(brandProfile.subtitle, 'brand_subtitle', 'brand-profile.subtitle', labelSpec, warnings);
  checkMaxLength(brandProfile.tagline, 'brand_tagline', 'brand-profile.tagline', labelSpec, warnings);
  if (brandProfile.qrStyle) checkMaxLength(brandProfile.qrStyle.caption, 'qr_caption', 'brand-profile.qrStyle.caption', labelSpec, warnings);

  return { errors, warnings };
}

function validateProductProfile(productProfile, labelSpec) {
  const errors = [];
  const warnings = [];

  for (const req of ['productProfileId', 'peptideName', 'strength', 'coaQrDestination', 'lot', 'ubd']) {
    if (productProfile[req] == null) errors.push(`product-profile: missing required field "${req}".`);
  }
  if (errors.length) return { errors, warnings };

  if (productProfile.ubd && !UBD_PATTERN.test(productProfile.ubd)) {
    errors.push(`product-profile.ubd: "${productProfile.ubd}" does not match the required MM/YYYY format.`);
  }

  try {
    // eslint-disable-next-line no-new
    new URL(productProfile.coaQrDestination);
  } catch {
    errors.push(`product-profile.coaQrDestination: "${productProfile.coaQrDestination}" is not a valid absolute URL — the QR encoder requires one.`);
  }

  checkMaxLength(productProfile.descriptor, 'product_descriptor', 'product-profile.descriptor', labelSpec, warnings);
  checkMaxLength(productProfile.strength, 'product_strength', 'product-profile.strength', labelSpec, warnings);
  checkMaxLength(productProfile.concentration, 'product_concentration', 'product-profile.concentration', labelSpec, warnings);
  checkMaxLength(productProfile.vialSize, 'product_vial_size', 'product-profile.vialSize', labelSpec, warnings);
  checkMaxLength(productProfile.purityClaim, 'purity_claim', 'product-profile.purityClaim', labelSpec, warnings);
  checkMaxLength(productProfile.labTestedClaim, 'lab_claim', 'product-profile.labTestedClaim', labelSpec, warnings);
  checkMaxLength(productProfile.lot, 'lot_number', 'product-profile.lot', labelSpec, warnings);
  checkMaxLength(productProfile.coaUrl, 'coa_url', 'product-profile.coaUrl', labelSpec, warnings);
  checkMaxLength(productProfile.qrCaption, 'qr_caption', 'product-profile.qrCaption', labelSpec, warnings);

  return { errors, warnings };
}

function validateProfiles(brandProfile, productProfile, labelSpec) {
  const brand = validateBrandProfile(brandProfile, labelSpec);
  const product = validateProductProfile(productProfile, labelSpec);
  return {
    errors: [...brand.errors, ...product.errors],
    warnings: [...brand.warnings, ...product.warnings]
  };
}

module.exports = { validateBrandProfile, validateProductProfile, validateProfiles };
