'use strict';
const path = require('path');
const { GlobalFonts } = require('@napi-rs/canvas');
const dir = path.join(__dirname, '..', 'fonts');
const fonts = {
  Bungee: 'Bungee-Regular.ttf',
  'Bungee Shade': 'BungeeShade-Regular.ttf',
  'Bungee Inline': 'BungeeInline-Regular.ttf',
  VT323: 'VT323-Regular.ttf',
  Anton: 'Anton-Regular.ttf',
  'Permanent Marker': 'PermanentMarker-Regular.ttf',
};
for (const [name, file] of Object.entries(fonts)) GlobalFonts.registerFromPath(path.join(dir, file), name);
module.exports = { fonts };
