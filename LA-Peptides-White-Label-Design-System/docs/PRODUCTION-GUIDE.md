# Production Guide (Non-Technical)

This guide is for anyone preparing or approving a label for print or a brand handoff — no coding required.

## What's in this package

Think of it as a label "recipe" split into three parts you can mix and match:

1. **The shape** (`src/master-label.svg`) — the layout: where the logo, product name, lot number, and QR code sit. You should not need to touch this.
2. **The look** (a file in `themes/`) — brand colors, fonts, and the logo. This is what changes for a new brand partner.
3. **The details** (a file in `field-maps/`) — the actual product name, strength, lot number, use-by date, and QR link. This is what changes for a new batch or product.

A finished, ready-to-print label is always "shape + look + details" combined — that's what the build produces in a `dist/<name>/` folder.

## Reviewing a finished label

Open `dist/<name>/label-preview.png` — a full-resolution image of exactly what will print. Check:

- [ ] Brand name and logo are correct
- [ ] Product name and strength are correct and legible
- [ ] Lot number and use-by date (UBD) are correct
- [ ] The QR code caption says what you expect (default: "SCAN FOR COA")
- [ ] The legal/regulatory claim line at the bottom is correct for this product
- [ ] Nothing is cut off, overlapping, or spilling past the printed border

Then open `dist/<name>/label-print.pdf` in Adobe Acrobat (or Preview) and confirm:

- [ ] Page size reads exactly **3.5 × 1.5 inches** (Acrobat: File → Properties → Description → Page Size)
- [ ] Text and the QR code are sharp at 100% zoom, not blurry

## Sending this to someone else

The whole `dist/<name>/` folder — or the `dist/<name>.zip` if one was built — is self-contained. It has no links to anyone's private computer or cloud drive, so it's safe to:

- Email as an attachment
- Upload to Google Drive / Dropbox and share the folder
- Send to a print vendor or contractor
- Hand off to a brand partner for their own review

They do **not** need this project's code to look at it — the PNG and PDF are plain image/document files anyone can open. They only need the code (Node.js + this folder) if they want to *change* something and rebuild.

## Requesting a change

Tell whoever maintains this package which of the two inputs needs to change:

- "The **colors/logo/font** are wrong for this brand" → a theme change
- "The **product name/lot/date/QR link** is wrong" → a field-map change

That distinction is the fastest way to get the right fix without back-and-forth.

## Version history

Check `CHANGELOG.md` at the root of this package before reprinting an old batch — it lists what changed between versions and whether it affects previously printed labels.
