const express = require('express');
const app = express();
var bodyParser = require('body-parser');
var path = require('path');
var firebase = require('firebase');

const PORT = process.env.PORT || 5000;

app.use(bodyParser());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/', (req, res) => {
  console.log(req.body);
  res.send(200);
  generateSensorData();
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}/`);
});


// Initialize Firebase
// TODO: Replace with your project's customized code snippet
var config = {
	apiKey: "AIzaSyBKNPd_5ZdZiOTKzm75KtOH8aGzNrtFECg",
	authDomain: "battle-connect.firebaseapp.com",
	databaseURL: "https://battle-connect.firebaseio.com/",
	projectId: "battle-connect",
};
firebase.initializeApp(config);
var database = firebase.database();

function generateSensorData() {
  database().ref('devices/' + 456).set({
    sensor_type: "vibration"
  });
}
