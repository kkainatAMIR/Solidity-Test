require('dotenv').config();
const express = require('express');
const cors = require('cors');
const tokenRoutes = require('./routes/token');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', tokenRoutes);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
