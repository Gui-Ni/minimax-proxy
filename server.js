const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 你的 MiniMax API Key
const API_KEY = 'sk-cp-RAsaqP2lsUH0DRgFFuOOr0U8gs1vwqU7tapLF6OXZ-oceDctsRhPLHI0b5BstIbCe4CS_2Z9JWSKT3SitkOtYFGR0DbzJE_FqAvaE9zpTUFV0-xjfBxemwc';

// Deepgram API Key (免费版)
const DEEPGRAM_KEY = '672a640148208ea1211fcf94b86d0287d5c6a02c';

app.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'abab6.5s-chat' } = req.body;
    
    const response = await axios.post(
      'https://api.minimax.chat/v1/text/chatcompletion_v2',
      {
        model: model,
        messages: messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// 语音识别接口 - 使用 Deepgram (免费250分钟/月)
app.post('/voice', async (req, res) => {
  try {
    const { audio } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    // 将 base64 音频转换为 buffer
    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    console.log("Received audio, size:", audioBuffer.length);

    // 使用 Deepgram Nova-2 模型 (支持中文)
    const formData = new FormData();
    formData.append('audio', audioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' });
    formData.append('model', 'nova-2');
    formData.append('language', 'zh');
    formData.append('punctuate', 'true');
    formData.append('diarize', 'false');

    const response = await axios.post(
      'https://api.deepgram.com/v1/listen',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Token ${DEEPGRAM_KEY}`
        },
        timeout: 60000
      }
    );

    console.log("Deepgram response:", JSON.stringify(response.data));
    const text = response.data.results?.channels[0]?.alternatives[0]?.transcript || '';
    console.log("Transcribed text:", text);
    res.json({ text });
  } catch (error) {
    console.error('Voice Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ 
      error: error.message,
      text: ''
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
