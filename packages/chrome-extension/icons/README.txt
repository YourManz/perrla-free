Icon placeholder directory
==========================

Chrome Manifest V3 requires icon files to be raster images (PNG).
For production, generate icon-16.png, icon-48.png, and icon-128.png
from the SVG bookmark logo used in popup.html.

Quick way (requires Inkscape or ImageMagick):

  inkscape --export-type=png --export-width=128 --export-filename=icon-128.png logo.svg
  inkscape --export-type=png --export-width=48  --export-filename=icon-48.png  logo.svg
  inkscape --export-type=png --export-width=16  --export-filename=icon-16.png  logo.svg

Or via ImageMagick (if you have rsvg-convert installed):
  rsvg-convert -w 128 -h 128 logo.svg > icon-128.png

Until real icons are added, Chrome will use the default puzzle-piece icon
for the browser action button. The extension loads and works fine without them.
