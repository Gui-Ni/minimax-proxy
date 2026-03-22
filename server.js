const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 你的 MiniMax API Key
const API_KEY = 'sk-cp-RAsaqP2lsUH0DRgFFuOOr0U8gs1vwqU7tapLF6OXZ-oceDctsRhPLHI0b5BstIbCe4CS_2Z9JWSKT3SitkOtYFGR0DbzJE_FqAvaE9zpTUFV0-xjfBxemwc';

// 阿里云语音识别配置
const ALIYUN = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
  appkey: process.env.ALIYUN_APP_KEY || 'ms9j1Kk6QTlp31JV'
};

let tokenCache = { token: null, expires: 0 };

// 获取阿里云 token
async function getAliyunToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token;
  }

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
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    if (response.data.Token?.Id) {
      tokenCache.token = response.data.Token.Id;
      tokenCache.expires = Date.now() + 24 * 60 * 60 * 1000;
      console.log("Got Aliyun token:", tokenCache.token);
      return tokenCache.token;
    }
    throw new Error('Failed to get token');
  } catch (error) {
    console.error('Get token error:', error.message);
    throw error;
  }
}

app.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'abab6.5s-chat' } = req.body;
    
    const response = await axios.post(
      'https://api.minimax.chat/v1/text/chatcompletion_v2',
      { model: model, messages: messages },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Chat Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 阿里云录音文件识别（非实时）
app.post('/voice', async (req, res) => {
  try {
    const { audio } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    console.log("Received audio, size:", audioBuffer.length);

    // 获取 token
    const token = await getAliyunToken();

    // 使用录音文件识别 API
    const response = await axios.post(
      'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr',
      audioBuffer,
      {
        params: {
          appkey: ALIYUN.appkey,
          token: token,
          format: 'webm',
          sample_rate: 16000,
          enable_itn: 'true'
        },
        headers: {
          'Content-Type': 'audio/webm;codecs=opus',
          'X-NLS-Token': token
        },
        timeout: 30000
      }
    );

    console.log("Aliyun response:", JSON.stringify(response.data));
    const text = response.data?.result || '';
    res.json({ text });
  } catch (error) {
    console.error('Voice Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    res.status(500).json({ error: error.message, text: '' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
