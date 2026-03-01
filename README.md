# Image Text Translator

A simple web app where you can:
- Upload an image
- Extract text from the image using OCR
- Translate that text into a language you choose
- Read the translated result and download it as a `.txt` file

## Run locally

```bash
npm install
npm start
```

Then open: `http://localhost:3000`

## Notes

- OCR runs in the browser via `tesseract.js`.
- Translation runs through a backend endpoint powered by `@vitalets/google-translate-api`.
