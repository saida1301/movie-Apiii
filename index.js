const express = require('express');
const mysql = require('mysql');
const axios = require('axios');
const { default: router } = require('./src/api/routes/review.router');

const app = express();

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'my_movies_db'
});

connection.connect();

app.get('/', router);

app.get('/', router);

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
