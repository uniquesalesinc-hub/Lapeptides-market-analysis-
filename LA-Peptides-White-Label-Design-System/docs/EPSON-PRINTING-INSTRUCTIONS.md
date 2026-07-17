# Epson Printing Instructions

For printing `label-print.pdf` directly on an Epson label/inkjet printer (e.g. Epson ColorWorks C3500/C7500 series or a desktop Epson inkjet with label media).

## Before you print

- Confirm the PDF page size reads exactly **3.5 × 1.5 in** — open it in Acrobat, File → Properties → Description → Page Size. If it doesn't match, do not print; rebuild instead (see `docs/QUICK-START.md`) — do not use "Fit to page/Shrink oversized pages" to force a mismatch, since that will scale the label off the die-cut/label stock.
- Load label media matching the label size (or the pre-cut roll your Epson driver is configured for).

## Print dialog settings

1. **Printer**: select your Epson label printer.
2. **Page Size / Media Size**: match your label stock (e.g. "3.5 x 1.5 in" or the closest die-cut preset your driver lists). Do not select a generic "Letter"/"A4" page and rely on scaling.
3. **Scale**: set to **100% / Actual Size**. Never "Fit to Printable Area" — this package's PDF is already generated at exact size, so scaling would make it wrong.
4. **Color Management**: let the Epson driver manage color ("Printer Manages Colors") unless your print vendor has given you a specific ICC profile for the media — this template authors in sRGB (see `spec/label-spec.json` → `colorProfile`) and expects the printer/driver to do the RGB→device conversion for inkjet label printers. If you are sending this PDF to an offset/flexo print vendor instead of printing on an Epson directly, ask them whether they want a CMYK-converted file — that conversion is intentionally **not** baked into the canonical files so it can be done correctly for whatever press profile they use.
5. **Media Type**: match your actual label stock (matte, glossy, synthetic, etc.) in the driver — this affects ink volume, not layout.
6. **Copies**: set as needed. There is no bleed handling required for a single die-cut/kiss-cut label sheet; if you are printing to a continuous roll with a cutter, refer to your printer's roll-feed documentation for cut-line alignment.

## After printing

- Compare one printed label against `label-preview.png` on-screen at 100% — check color, sharpness of small text (as small as 4.3pt), and that the QR code scans correctly with a phone camera.
- If the QR code doesn't scan: check the printer's DPI setting is high enough (300dpi minimum recommended for the QR module size in this template) and that "toner/ink saving" or draft modes are off.
- If colors look washed out or oversaturated: adjust density/ink settings in the Epson driver rather than editing the theme's color values — the theme values are meant to be display-accurate sRGB, and printer-specific compensation belongs in the driver/profile, not the source file.

## Reprinting later

`dist/<name>/manifest.json` records the exact template version, theme, and field values used to build a given label. Keep it alongside any printed batch so a reprint months later can be reproduced exactly — rebuild from the same `theme` + `field-map` files noted there rather than re-deriving values by eye from an old printed sample.
