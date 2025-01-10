const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/exchange-rate', async (req, res) => {
  try {
    const { month, date } = req.query;
    const url = `https://www.tcmb.gov.tr/kurlar/${month}/${date}.xml`;
    
    const response = await axios.get(url, {
      headers: {
        'Accept': '*/*',
        'Referer': 'https://www.tcmb.gov.tr/kurlar/kurlar_tr.html',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });
    
    res.set('Content-Type', 'application/xml');
    res.send(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).send('Not Found');
    } else {
      console.error('Error fetching exchange rate:', error);
      res.status(500).send('Error fetching exchange rate');
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});