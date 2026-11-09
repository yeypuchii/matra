---
'matra': minor
---

`loadFonts()` loads TTF, OTF, TTC and WOFF2 bytes into a font stack. It gives a clear error for WOFF 1, for bytes that are not a font, and for a TTC index that is not in the collection.
