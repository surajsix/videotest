const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const ocrLanguage = document.getElementById('ocrLanguage');
const targetLanguage = document.getElementById('targetLanguage');
const runBtn = document.getElementById('runBtn');
const translateEditedBtn = document.getElementById('translateEditedBtn');
const statusEl = document.getElementById('status');
const extractedText = document.getElementById('extractedText');
const translatedText = document.getElementById('translatedText');
const downloadTextBtn = document.getElementById('downloadTextBtn');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const translatedCanvas = document.getElementById('translatedCanvas');

let selectedFile = null;
let imageElement = null;

function setIdleState() {
  downloadTextBtn.disabled = true;
  downloadImageBtn.disabled = true;
  translateEditedBtn.disabled = true;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = '';

  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y);
      line = `${words[i]} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line.trim(), x, y);
}

function drawTranslatedCanvas(translated) {
  if (!imageElement) {
    return;
  }

  const ctx = translatedCanvas.getContext('2d');
  const canvasWidth = 1200;
  const canvasHeight = 800;
  translatedCanvas.width = canvasWidth;
  translatedCanvas.height = canvasHeight;

  ctx.fillStyle = '#f6f8ff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const leftW = 520;
  const pad = 30;
  const imageAreaH = canvasHeight - pad * 2;

  const ratio = Math.min(leftW / imageElement.naturalWidth, imageAreaH / imageElement.naturalHeight);
  const drawW = imageElement.naturalWidth * ratio;
  const drawH = imageElement.naturalHeight * ratio;
  const imgX = pad + (leftW - drawW) / 2;
  const imgY = pad + (imageAreaH - drawH) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(pad, pad, leftW, imageAreaH);
  ctx.strokeStyle = '#d7e0f5';
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, leftW, imageAreaH);
  ctx.drawImage(imageElement, imgX, imgY, drawW, drawH);

  const textX = leftW + pad * 2;
  const textY = pad;
  const textW = canvasWidth - textX - pad;
  const textH = imageAreaH;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(textX, textY, textW, textH);
  ctx.strokeStyle = '#d7e0f5';
  ctx.strokeRect(textX, textY, textW, textH);

  ctx.fillStyle = '#1f2c4f';
  ctx.font = 'bold 28px Inter, Arial, sans-serif';
  ctx.fillText('Translated text', textX + 20, textY + 40);

  ctx.fillStyle = '#2d3b61';
  ctx.font = '22px Inter, Arial, sans-serif';
  wrapText(ctx, translated, textX + 20, textY + 85, textW - 40, 34);
}

async function translateRawText(rawText) {
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
  drawTranslatedCanvas(payload.translatedText);
  downloadTextBtn.disabled = false;
  downloadImageBtn.disabled = false;
  translateEditedBtn.disabled = false;

  statusEl.textContent = `Done! Source language detected: ${payload.detectedSourceLanguage}`;
}

imageInput.addEventListener('change', async () => {
  selectedFile = imageInput.files?.[0] || null;
  extractedText.value = '';
  translatedText.value = '';
  setIdleState();

  if (!selectedFile) {
    preview.hidden = true;
    preview.src = '';
    imageElement = null;
    return;
  }

  const objectUrl = URL.createObjectURL(selectedFile);
  preview.src = objectUrl;
  preview.hidden = false;

  imageElement = new Image();
  await new Promise((resolve) => {
    imageElement.onload = resolve;
    imageElement.src = objectUrl;
  });

  statusEl.textContent = 'Image loaded. Click “Extract & Translate”.';
});

runBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    statusEl.textContent = 'Please upload an image first.';
    return;
  }

  runBtn.disabled = true;
  setIdleState();
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
    await translateRawText(rawText);
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  } finally {
    runBtn.disabled = false;
  }
});

translateEditedBtn.addEventListener('click', async () => {
  const rawText = extractedText.value.trim();

  if (!rawText) {
    statusEl.textContent = 'Please add some extracted text first.';
    return;
  }

  translateEditedBtn.disabled = true;
  downloadTextBtn.disabled = true;
  downloadImageBtn.disabled = true;
  statusEl.textContent = 'Re-translating edited text...';

  try {
    await translateRawText(rawText);
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  }
});

downloadTextBtn.addEventListener('click', () => {
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

downloadImageBtn.addEventListener('click', () => {
  if (!translatedText.value) {
    return;
  }

  const link = document.createElement('a');
  link.href = translatedCanvas.toDataURL('image/png');
  link.download = `translated-image-${targetLanguage.value}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
});

setIdleState();
