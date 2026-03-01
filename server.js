const express = require('express');
const path = require('path');
const { translate } = require('@vitalets/google-translate-api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/translate', async (req, res) => {
  const { text, from = 'auto', to } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Please provide text to translate.' });
  }

  if (!to || typeof to !== 'string') {
    return res.status(400).json({ error: 'Please select a target language.' });
  }

  try {
    const result = await translate(text, { from, to });
    return res.json({
      translatedText: result.text,
      detectedSourceLanguage: result.from?.language?.iso || from,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Translation failed. Please try again in a moment.',
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Image translator app is running on http://localhost:${PORT}`);
});
