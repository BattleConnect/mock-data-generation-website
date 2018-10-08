const express = require('express');
const app = express();
var path = require('path');

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}/`);
});