const express = require('express');
require('express-async-errors');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const api = require('./routes/api');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', mode: 'SIMULATED', timestamp: new Date().toISOString() }));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
