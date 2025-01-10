const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

app.get('/exchange-rate', async (req, res) => {
  try {
    const { month, date } = req.query;
    const url = `https://www.tcmb.gov.tr/kurlar/${month}/${date}.xml`;
    const response = await axios.get(url);
    res.send(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      res.status(404).send('Not Found');
    } else {
      res.status(500).send('Error fetching data');
    }
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});