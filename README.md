# Image Text Translator

A small Flask app where you can:

1. Upload an image that contains text.
2. Select the language you want.
3. Read the translated text on screen.
4. Download the translation as `.txt` or as an image (`.png`).

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> Note: OCR requires **Tesseract** installed on your system.
> Ubuntu/Debian example:
>
> ```bash
> sudo apt-get update && sudo apt-get install -y tesseract-ocr
> ```

## Run

```bash
python app.py
```

Open: `http://localhost:5000`
