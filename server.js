const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 你的 MiniMax API Key
const API_KEY = 'sk-cp-RAsaqP2lsUH0DRgFFuOOr0U8gs1vwqU7tapLF6OXZ-oceDctsRhPLHI0b5BstIbCe4CS_2Z9JWSKT3SitkOtYFGR0DbzJE_FqAvaE9zpTUFV0-xjfBxemwc';

// 百度语音识别配置
const BAIDU = {
  appid: '122506878',
  apikey: 'dxG85ZQvZ7nY3bLMCHURcMZd',
  secretkey: 'q955kcUcDALq8v6lNd5TEV0CX0AAGorx'
};

let tokenCache = { token: null, expires: 0 };

// 获取百度 access_token
async function getBaiduToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token;
  }

  try {
    const response = await axios.get(
      `https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(BAIDU.apikey)}&client_secret=${encodeURIComponent(BAIDU.secretkey)}`
    );

    if (response.data.access_token) {
      tokenCache.token = response.data.access_token;
      tokenCache.expires = Date.now() + (response.data.expires_in - 1000) * 1000;
      console.log("Got Baidu token:", tokenCache.token.substring(0, 10) + "...");
      return tokenCache.token;
    }

    console.error("Get token failed:", response.data);
  } catch (e) {
    console.error('Get token error:', e.message);
  }
  return null;
}

app.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'abab6.5s-chat' } = req.body;
    const response = await axios.post(
      'https://api.minimax.chat/v1/text/chatcompletion_v2',
      { model, messages },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 百度一句话语音识别
app.post('/voice', async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ error: 'No audio' });

    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');
    console.log("Audio:", audioBuffer.length, "bytes");

    const token = await getBaiduToken();
    if (!token) return res.status(500).json({ error: 'Failed to get token' });

    const response = await axios.post(
      `https://vop.baidu.com/server_api`,
      {
        format: 'wav',
        rate: 16000,
        channel: 1,
        cuid: 'bishe-cp-' + Math.random().toString(),
        token: token,
        speech: base64Data,
        len: audioBuffer.length
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("Baidu response:", JSON.stringify(response.data));
    const text = response.data.result.join(' ');
    res.json({ text });
  } catch (e) {
    console.error('Voice error:', e.message);
    if (e.response) console.log('Response:', e.response.data);
    res.status(500).json({ error: e.message, text: '' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
