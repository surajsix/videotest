const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const ocrLanguage = document.getElementById('ocrLanguage');
const targetLanguage = document.getElementById('targetLanguage');
const runBtn = document.getElementById('runBtn');
const statusEl = document.getElementById('status');
const extractedText = document.getElementById('extractedText');
const translatedText = document.getElementById('translatedText');
const downloadBtn = document.getElementById('downloadBtn');

let selectedFile = null;

imageInput.addEventListener('change', () => {
  selectedFile = imageInput.files?.[0] || null;
  extractedText.value = '';
  translatedText.value = '';
  downloadBtn.disabled = true;

  if (!selectedFile) {
    preview.hidden = true;
    preview.src = '';
    return;
  }

  preview.src = URL.createObjectURL(selectedFile);
  preview.hidden = false;
  statusEl.textContent = 'Image loaded. Click “Extract & Translate”.';
});

runBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    statusEl.textContent = 'Please upload an image first.';
    return;
  }

  runBtn.disabled = true;
  downloadBtn.disabled = true;
  extractedText.value = '';
  translatedText.value = '';

  try {
    statusEl.textContent = 'Extracting text from image...';
    const ocrResult = await Tesseract.recognize(selectedFile, ocrLanguage.value, {
      logger: (msg) => {
        if (msg.status === 'recognizing text') {
          const progress = Math.round((msg.progress || 0) * 100);
          statusEl.textContent = `OCR in progress: ${progress}%`;
        }
      },
    });

    const rawText = ocrResult.data.text.trim();

    if (!rawText) {
      statusEl.textContent = 'No readable text found in the image.';
      return;
    }

    extractedText.value = rawText;
    statusEl.textContent = 'Translating extracted text...';

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: rawText,
        from: 'auto',
        to: targetLanguage.value,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Translation failed.');
    }

    translatedText.value = payload.translatedText;
    statusEl.textContent = `Done! Source language detected: ${payload.detectedSourceLanguage}`;
    downloadBtn.disabled = false;
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  } finally {
    runBtn.disabled = false;
  }
});

downloadBtn.addEventListener('click', () => {
  if (!translatedText.value) {
    return;
  }

  const blob = new Blob([translatedText.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `translated-text-${targetLanguage.value}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});
