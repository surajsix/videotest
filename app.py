from __future__ import annotations

import io
import os
import textwrap
from uuid import uuid4

from flask import Flask, flash, render_template, request, send_file
from deep_translator import GoogleTranslator
from PIL import Image, ImageDraw, ImageFont
import pytesseract


app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key")

LANGUAGE_MAP = {
    "English": "en",
    "Spanish": "es",
    "French": "fr",
    "German": "de",
    "Italian": "it",
    "Portuguese": "pt",
    "Hindi": "hi",
    "Japanese": "ja",
    "Korean": "ko",
    "Arabic": "ar",
    "Chinese (Simplified)": "zh-CN",
}

RESULTS: dict[str, dict[str, bytes | str]] = {}


def extract_text_from_image(image_file) -> str:
    """Read text from an uploaded image using Tesseract OCR."""
    image = Image.open(image_file.stream).convert("RGB")
    text = pytesseract.image_to_string(image)
    return text.strip()


def translate_text(text: str, target_lang_code: str) -> str:
    """Translate text to the selected language."""
    return GoogleTranslator(source="auto", target=target_lang_code).translate(text)


def render_text_to_image(text: str) -> bytes:
    """Render translated text to a simple image so users can download it."""
    font = ImageFont.load_default()
    wrapped = "\n".join(textwrap.wrap(text, width=60)) or "(No text)"

    # Estimate image size based on text content
    lines = wrapped.split("\n")
    line_height = 18
    padding = 24
    width = 900
    height = max(220, padding * 2 + line_height * len(lines))

    canvas = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(canvas)
    draw.multiline_text((padding, padding), wrapped, fill="black", font=font, spacing=6)

    output = io.BytesIO()
    canvas.save(output, format="PNG")
    output.seek(0)
    return output.read()


@app.route("/", methods=["GET", "POST"])
def index():
    translated_text = None
    result_id = None

    if request.method == "POST":
        image_file = request.files.get("image")
        language_name = request.form.get("language")

        if not image_file or image_file.filename == "":
            flash("Please upload an image first.")
            return render_template("index.html", languages=LANGUAGE_MAP.keys())

        if language_name not in LANGUAGE_MAP:
            flash("Please choose a valid language.")
            return render_template("index.html", languages=LANGUAGE_MAP.keys())

        try:
            extracted_text = extract_text_from_image(image_file)
        except Exception as exc:
            flash(
                "Could not read text from the image. "
                "Make sure the image is clear and Tesseract OCR is installed. "
                f"Details: {exc}"
            )
            return render_template("index.html", languages=LANGUAGE_MAP.keys())

        if not extracted_text:
            flash("No readable text found in that image.")
            return render_template("index.html", languages=LANGUAGE_MAP.keys())

        target_code = LANGUAGE_MAP[language_name]
        try:
            translated_text = translate_text(extracted_text, target_code)
        except Exception as exc:
            flash(f"Translation failed: {exc}")
            return render_template("index.html", languages=LANGUAGE_MAP.keys())

        result_id = str(uuid4())
        RESULTS[result_id] = {
            "text": translated_text.encode("utf-8"),
            "image": render_text_to_image(translated_text),
            "language": language_name,
        }

    return render_template(
        "index.html",
        languages=LANGUAGE_MAP.keys(),
        translated_text=translated_text,
        result_id=result_id,
    )


@app.get("/download/<result_id>/text")
def download_text(result_id: str):
    payload = RESULTS.get(result_id)
    if not payload:
        flash("Result expired. Please upload again.")
        return render_template("index.html", languages=LANGUAGE_MAP.keys())

    return send_file(
        io.BytesIO(payload["text"]),
        as_attachment=True,
        download_name="translated_text.txt",
        mimetype="text/plain",
    )


@app.get("/download/<result_id>/image")
def download_image(result_id: str):
    payload = RESULTS.get(result_id)
    if not payload:
        flash("Result expired. Please upload again.")
        return render_template("index.html", languages=LANGUAGE_MAP.keys())

    return send_file(
        io.BytesIO(payload["image"]),
        as_attachment=True,
        download_name="translated_text.png",
        mimetype="image/png",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
