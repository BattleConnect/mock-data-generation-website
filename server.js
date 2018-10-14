const express = require('express');
const app = express();
var bodyParser = require('body-parser');
var path = require('path');
var firebase = require('firebase/app');
require('firebase/firestore');

const PORT = process.env.PORT || 5000;

app.use(bodyParser());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/generate-sensor-data', (req, res) => {
  res.send(200);
  var minLat = parseFloat(req.body.minLat);
  var minLong = parseFloat(req.body.minLong);
  var maxLat = parseFloat(req.body.maxLat);
  var maxLong = parseFloat(req.body.maxLong);
  var numVibration = parseInt(req.body.numVibration);
  var numAsset = parseInt(req.body.numAsset);
  var numHeartRate = parseInt(req.body.numHeartRate);
  var numMoisture = parseInt(req.body.numMoisture);
  var numTemp = parseInt(req.body.numTemp);
  var duration = parseInt(req.body.duration);
  duration = duration * 60 * 1000;
  generateSensorData(minLat, minLong, maxLat, maxLong, numVibration, numAsset, numHeartRate, numMoisture, numTemp, duration);
});

app.post('/delete-sensor-data', (req, res) => {
  res.send(200);
  deleteSensorData();
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
var firestore = firebase.firestore();
var sensors = firestore.collection("sensors");

function deleteSensorData() {
  deleteCollection(firestore, "sensors", 100);
}

function deleteCollection(db, collectionPath, batchSize) {
  var collectionRef = db.collection(collectionPath);
  var query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, batchSize, resolve, reject);
  });
}

function deleteQueryBatch(db, query, batchSize, resolve, reject) {
  query.get()
      .then((snapshot) => {
        // When there are no documents left, we are done
        if (snapshot.size == 0) {
          return 0;
        }

        // Delete documents in a batch
        var batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        return batch.commit().then(() => {
          return snapshot.size;
        });
      }).then((numDeleted) => {
        if (numDeleted === 0) {
          resolve();
          return;
        }

        // Recurse on the next process tick, to avoid
        // exploding the stack.
        process.nextTick(() => {
          deleteQueryBatch(db, query, batchSize, resolve, reject);
        });
      })
      .catch(reject);
}

function generateSensorData(minLat, minLong, maxLat, maxLong, numVibration, numAsset, numHeartRate, numMoisture, numTemp, duration) {
  console.log("generating sensor data");
  var vibrationSensors = [];
  var assetSensors = [];
  var heartRateSensors = [];
  var moistureSensors = [];
  var tempSensors = [];

  var averageTempVal = randn_bm(-10,100,0.5);
  var averageMoistureVal = randn_bm(40,80,1);

  console.log("determined average temperature and average moisture level");

  for (var i = 0; i < numVibration; i++) {
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    initializeVibrationSensor(randomLat, randomLong, randomSensorID);
    vibrationSensors.push(randomSensorID);
  }
  console.log("initialized vibration sensors");

  for (var i = 0; i < numAsset; i++) {
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    initializeAssetSensor(randomLat, randomLong, randomSensorID);
    assetSensors.push(randomSensorID);
  }
  console.log("initialized asset sensors");

  for (var i = 0; i < numHeartRate; i++) {
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    initializeHeartRateSensor(randomLat, randomLong, randomSensorID);
    heartRateSensors.push(randomSensorID);
  }
  console.log("initialized heart rate sensors");

  for (var i = 0; i < numMoisture; i++) {
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    var moistureVal = randn_bm(averageMoistureVal-5, averageMoistureVal+5, 1);
    moistureVal = Math.round(moistureVal*10) / 10;
    initializeMoistureSensor(randomLat, randomLong, randomSensorID, moistureVal);
    moistureSensors.push(randomSensorID);
  }
  console.log("initialized moisture sensors");

  for (var i = 0; i < numTemp; i++) {
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    var tempVal = randn_bm(averageTempVal-5, averageTempVal+5, 1);
    tempVal = Math.round(tempVal*10) / 10;
    initializeTempSensor(randomLat, randomLong, randomSensorID, tempVal);
    tempSensors.push(randomSensorID);
  }
  console.log("initialized temperature sensors");

  var startTime = new Date().getTime();

  var vibrationSensorInterval = setInterval(tripRandomVibrationSensor, 60 * 1000);
  var heartRateSensorInterval = setInterval(updateHeartRateSensors, 15 * 1000);
  var assetSensorInterval = setInterval(updateAssetSensors, 60 * 1000);
  var moistureSensorInterval = setInterval(updateMoistureSensors, 30 * 1000);
  var tempSensorInterval = setInterval(updateTempSensors, 30 * 1000);

  function tripRandomVibrationSensor() {
    console.log("tripping vibration sensor");
    if (new Date().getTime() - startTime > duration) {
      clearInterval(vibrationSensorInterval);
      return;
    }

    var randomIndex = getRandomInt(0, vibrationSensors.length - 1);
    var randomSensorID = vibrationSensors[randomIndex];
    console.log("tripping vibration sensor with Sensor_ID = " + randomSensorID);
    var query = sensors.where("Sensor_ID", "==", randomSensorID).orderBy("Date_Time", "desc").limit(1);
    query.get().then(results => {
        if (!results.empty) {
          var doc = results.docs[0];
          var sensorHealth = doc.get("SensorHealth");
          var battery = doc.get("Battery");
          if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
            var lat = doc.get("Lat");
            var long = doc.get("Long");
            if (Math.random() < 0.1)
                battery--;
            if (battery < 0)
              battery = 0;
            var sensorVal = randn_bm(50,250,1);
            sensorVal = Math.round(sensorVal*10)/10;
            sensors.doc().set({
              Date_Time: new Date().valueOf() / 1000,
              Lat: lat,
              Long: long,
              Sensor_Type: "Vibration",
              Sensor_Val: sensorVal,
              Sensor_ID: randomSensorID,
              SensorHealth: "Good",
              Battery: battery
            });
          }
        }
    })
  }

  function updateAssetSensors() {
    console.log("updating asset sensors");
    if (new Date().getTime() - startTime > duration) {
      clearInterval(assetSensorInterval);
      return;
    }

    for (var i = 0; i < assetSensors.length; i++) {
      var sensorID = assetSensors[i];
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              var lat = doc.get("Lat");
              var long = doc.get("Long");
              var sensorVal = doc.get("Sensor_Val");
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              sensors.doc().set({
                Date_Time: new Date().valueOf() / 1000,
                Lat: lat,
                Long: long,
                Sensor_Type: "Asset",
                Sensor_Val: sensorVal,
                Sensor_ID: sensorID,
                SensorHealth: "Good",
                Battery: battery
              });
            }
          }
        })
      })(sensorID);
    }
  }

  function updateHeartRateSensors() {
    console.log("updating heart rate sensors");
    if (new Date().getTime() - startTime > duration) {
      clearInterval(heartRateSensorInterval);
      return;
    }

    for (var i = 0; i < heartRateSensors.length; i++) {
      var sensorID = heartRateSensors[i];
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              var lat = doc.get("Lat");
              lat = lat + randn_bm(-0.001, 0.001, 1);
              lat = Math.round(lat * 100000) / 100000;
              var long = doc.get("Long");
              long = long + randn_bm(-0.001, 0.001, 1);
              long = Math.round(long * 100000) / 100000;
              var sensorVal = doc.get("Sensor_Val");
              sensorVal = sensorVal + randn_bm(-10,10,1);
              sensorVal = Math.round(sensorVal);
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              sensors.doc().set({
                Date_Time: new Date().valueOf() / 1000,
                Lat: lat,
                Long: long,
                Sensor_Type: "HeartRate",
                Sensor_Val: sensorVal,
                Sensor_ID: sensorID,
                SensorHealth: "Good",
                Battery: battery
              });
            }
          }
        })
      })(sensorID);
    }
  }

  function updateMoistureSensors() {
    console.log("updating moisture sensors");
    if (new Date().getTime() - startTime > duration) {
      clearInterval(moistureSensorInterval);
      return;
    }

    for (var i = 0; i < moistureSensors.length; i++) {
      var sensorID = moistureSensors[i];
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              var lat = doc.get("Lat");
              var long = doc.get("Long");
              var sensorVal = doc.get("Sensor_Val");
              sensorVal = sensorVal + randn_bm(-10,10,1);
              sensorVal = Math.round(sensorVal);
              if (sensorVal > 100)
                sensorVal = 100;
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              sensors.doc().set({
                Date_Time: new Date().valueOf() / 1000,
                Lat: lat,
                Long: long,
                Sensor_Type: "Moisture",
                Sensor_Val: sensorVal,
                Sensor_ID: sensorID,
                SensorHealth: "Good",
                Battery: battery
              });
            }
          }
        })
      })(sensorID);
    }
  }

  function updateTempSensors() {
    console.log("updating temp sensors");
    if (new Date().getTime() - startTime > duration) {
      clearInterval(tempSensorInterval);
      return;
    }

    for (var i = 0; i < tempSensors.length; i++) {
      var sensorID = tempSensors[i];
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              var lat = doc.get("Lat");
              var long = doc.get("Long");
              var sensorVal = doc.get("Sensor_Val");
              sensorVal = sensorVal + randn_bm(-5,5,1);
              sensorVal = Math.round(sensorVal*10)/10;
              if (sensorVal > 100)
                sensorVal = 100;
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              sensors.doc().set({
                Date_Time: new Date().valueOf() / 1000,
                Lat: lat,
                Long: long,
                Sensor_Type: "Temp",
                Sensor_Val: sensorVal,
                Sensor_ID: sensorID,
                SensorHealth: "Good",
                Battery: battery
              });
            }
          }
        })
      })(sensorID);
    }
  }
}

function getNewRandomSensorID() {
  var randomSensorID = getRandomInt(0,999999);
  var exists = false;

  var query = sensors.where("Sensor_ID", "==", randomSensorID);
  query.get().then(snap => {
    size = snap.size;
    if (size > 0)
     exists = true;
  })

  while (exists) {
    randomSensorID = getRandomInt(0,999999);

    var query = sensors.where("Sensor_ID", "==", randomSensorID);
    query.get().then(snap => {
      size = snap.size;
      if (size > 0)
      exists = true;
    })
  }
  return randomSensorID;
}

function randn_bm(min, max, skew) {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
    return num;
}

// Returns a random integer between min (include) and max (include)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initializeVibrationSensor(lat, long, sensorID) {
  sensors.doc().set({
    Date_Time: new Date().valueOf() / 1000,
    Lat: lat,
    Long: long,
    Sensor_Type: "Vibration",
    Sensor_Val: 0.0,
    Sensor_ID: sensorID,
    SensorHealth: "Good",
    Battery: getRandomInt(80,100)
  });
}

function initializeAssetSensor(lat, long, sensorID) {
  sensors.doc().set({
    Date_Time: new Date().valueOf() / 1000,
    Lat: lat,
    Long: long,
    Sensor_Type: "Asset",
    Sensor_Val: 0.0,
    Sensor_ID: sensorID,
    SensorHealth: "Good",
    Battery: getRandomInt(80,100)
  });
}

function initializeHeartRateSensor(lat, long, sensorID) {
  sensors.doc().set({
    Date_Time: new Date().valueOf() / 1000,
    Lat: lat,
    Long: long,
    Sensor_Type: "HeartRate",
    Sensor_Val: Math.round(randn_bm(40, 110, 1)),
    Sensor_ID: sensorID,
    SensorHealth: "Good",
    Battery: getRandomInt(80,100)
  });
}

function initializeMoistureSensor(lat, long, sensorID, moistureVal) {
  sensors.doc().set({
    Date_Time: new Date().valueOf() / 1000,
    Lat: lat,
    Long: long,
    Sensor_Type: "Moisture",
    Sensor_Val: moistureVal,
    Sensor_ID: sensorID,
    SensorHealth: "Good",
    Battery: getRandomInt(80,100)
  });
}

function initializeTempSensor(lat, long, sensorID, tempVal) {
  sensors.doc().set({
    Date_Time: new Date().valueOf() / 1000,
    Lat: lat,
    Long: long,
    Sensor_Type: "Temp",
    Sensor_Val: tempVal,
    Sensor_ID: sensorID,
    SensorHealth: "Good",
    Battery: getRandomInt(80,100)
  });
}