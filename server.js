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

    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');
    console.log("Audio:", audioBuffer.length, "bytes");

    // 使用正确的请求头格式
    const response = await axios.post(
      'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr',
      audioBuffer,
      {
        params: {
          appkey: ALIYUN.appkey,
          format: 'pcm',
          sample_rate: 16000,
          enable_itn: 'true'
        },
        headers: {
          'Content-Type': 'audio/pcm;rate=16000',
          'X-NLS-AccessKeyId': ALIYUN.accessKeyId,
          'X-NLS-Project': 'default',
          'X-NLS-Language': 'zh',
          'X-NLS-Sample-Rate': '16000'
        },
        timeout: 30000
      }
    );

    console.log("Aliyun OK:", JSON.stringify(response.data));
    res.json({ text: response.data?.result || '' });
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) console.log('Response:', e.response.data);
    res.status(500).json({ error: e.message, text: '' });
  }
});

app.listen(3000, () => console.log('OK'));
