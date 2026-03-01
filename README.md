# Image Text Translator

A web app where you can:
- Upload an image
- Extract text from the image using OCR
- Translate that text into a language you choose
- Read and edit extracted text, then re-translate
- Download the translated result as a `.txt` file
- Download a generated translated image as `.png`

## Run locally

```bash
npm install
npm start
```

Then open: `http://localhost:3000`

## Notes

- OCR runs in the browser via `tesseract.js`.
- Translation runs through a backend endpoint powered by `@vitalets/google-translate-api`.
- The translated image download combines the original image and translated text in one export.
