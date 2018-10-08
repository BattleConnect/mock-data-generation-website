const express = require('express');
const app = express();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}/`);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
}