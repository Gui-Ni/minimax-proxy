const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// 你的 MiniMax API Key
const API_KEY = 'sk-cp-RAsaqP2lsUH0DRgFFuOOr0U8gs1vwqU7tapLF6OXZ-oceDctsRhPLHI0b5BstIbCe4CS_2Z9JWSKT3SitkOtYFGR0DbzJE_FqAvaE9zpTUFV0-xjfBxemwc';

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
