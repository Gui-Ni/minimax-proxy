const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const API_KEY = 'sk-cp-RAsaqP2lsUH0DRgFFuOOr0U8gs1vwqU7tapLF6OXZ-oceDctsRhPLHI0b5BstIbCe4CS_2Z9JWSKT3SitkOtYFGR0DbzJE_FqAvaE9zpTUFV0-xjfBxemwc';

const ALIYUN = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
  appkey: process.env.ALIYUN_APP_KEY || 'ms9j1Kk6QTlp31JV'
};

let tokenCache = { token: null, expires: 0 };

async function getAliyunToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) return tokenCache.token;

  try {
    const params = new URLSearchParams();
    params.append('Action', 'CreateToken');
    params.append('Version', '2019-02-28');
    params.append('Format', 'JSON');
    params.append('AccessKeyId', ALIYUN.accessKeyId);
    params.append('SignatureMethod', 'HMAC-SHA1');
    params.append('Timestamp', new Date().toISOString());
    params.append('SignatureVersion', '1.0');
    params.append('SignatureNonce', Math.random().toString());

    const response = await axios.post(
      'https://nls-meta.cn-shanghai.aliyuncs.com/',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data.Token?.Id) {
      tokenCache.token = response.data.Token.Id;
      tokenCache.expires = Date.now() + 24 * 60 * 60 * 1000;
      console.log("Token OK:", tokenCache.token.substring(0, 8) + "...");
      return tokenCache.token;
    }
  } catch (e) {
    console.error('Token error:', e.message);
  }
  return null;
}

app.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'abab6.5s-chat' } = req.body;
    const response = await axios.post(
      'https://api.minimax.chat/v1/text/chatcompletion_v2',
      { model, messages },
      { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/voice', async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ error: 'No audio' });

    // 去掉 data URL 前缀
    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');
    console.log("Audio:", audioBuffer.length, "bytes");

    const token = await getAliyunToken();
    if (!token) return res.status(500).json({ error: 'No token' });

    // 关键：使用 application/octet-stream 作为 Content-Type
    const response = await axios.post(
      'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr',
      audioBuffer,
      {
        params: {
          appkey: ALIYUN.appkey,
          token: token,
          format: 'wav',  // 尝试 wav
          sample_rate: 16000,
          enable_itn: 'true'
        },
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-NLS-Token': token
        },
        timeout: 30000
      }
    );

    console.log("Aliyun:", JSON.stringify(response.data));
    res.json({ text: response.data?.result || '' });
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) console.log('Response:', e.response.data);
    res.status(500).json({ error: e.message, text: '' });
  }
});

app.listen(3000, () => console.log('OK'));
