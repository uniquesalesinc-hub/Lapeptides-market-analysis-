'use strict';

const fs = require('fs');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const xpath = require('xpath');

function loadSvg(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
  return doc;
}

function serialize(doc) {
  return new XMLSerializer().serializeToString(doc);
}

function byId(doc, id) {
  const nodes = xpath.select(`//*[@id='${id}']`, doc);
  return nodes && nodes.length ? nodes[0] : null;
}

module.exports = { loadSvg, serialize, byId };
