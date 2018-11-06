const express = require('express');
const app = express();
var bodyParser = require('body-parser');
var path = require('path');
var firebase = require('firebase/app');
require('firebase/firestore');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

app.use(bodyParser());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/notification.html', (req, res) => {
  res.sendFile(path.join(__dirname + '/notification.html'));
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

app.post('/generate-notification', (req, res) => {
  var id = req.body.notificationID;
  var sender = req.body.sender;
  var priority = req.body.priority;
  var message = req.body.message;
  console.log(id);
  console.log(sender);
  console.log(priority);
  console.log(message);

  generateNotification(id, sender, priority, message);
  res.sendStatus(200);
}); 

app.post('/generate-force-tracking-data', (req, res) => {
  res.send(200);
  var minLat = parseFloat(req.body.minLat);
  var minLong = parseFloat(req.body.minLong);
  var maxLat = parseFloat(req.body.maxLat);
  var maxLong = parseFloat(req.body.maxLong);
  var numPlatoons = parseInt(req.body.numPlatoons);
  var numSquads = parseInt(req.body.numSquads);
  var numEnemyUnits = parseInt(req.body.numEnemyUnits);
  var numPreplannedTargets = parseInt(req.body.numPreplannedTargets);
  var duration = parseInt(req.body.duration);
  duration = duration * 60 * 1000;
  generateForceTrackingData(minLat, minLong, maxLat, maxLong, numPlatoons, numSquads, numEnemyUnits, numPreplannedTargets, duration);
});

app.post('/delete-force-tracking-data', (req, res) => {
  res.send(200);
  deleteForceTrackingData();
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
	apiKey: process.env.FIREBASE_APIKEY,
	authDomain: "battle-connect.firebaseapp.com",
	databaseURL: "https://battle-connect.firebaseio.com/",
	projectId: "battle-connect",
};
firebase.initializeApp(config);

const firestore = firebase.firestore();
const settings = {/* your settings... */ timestampsInSnapshots: true};
firestore.settings(settings);
var sensors = firestore.collection("sensors");
var forces = firestore.collection("forces");
var notifications = firestore.collection("notifications");
var users = firestore.collection("users");

function deleteSensorData() {
  deleteCollection(firestore, "sensors", 100);
}

function deleteForceTrackingData() {
  deleteCollection(firestore, "forces", 100);
}

//returns the entire firestore collection
function getFirestoreCollection(db, collectionName) {
  var collectionRef = db.collection(collectionName);
  var query = collectionRef.orderBy("__id__");

  return new Promise((resolve, reject) => {
    getCollection(db, query);
  });
}

function getCollection(db, query) {
  var collection = [];

  query.get()
      .then((snapshot) => {
        // Grab all documents
        snapshot.docs.forEach((doc) => {
          collection.push(doc.data().id)
        });
      })
      .catch(reject);
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

function generateNotification(id, sender, priority, message) {
  console.log("generating notification");

  //send the notification to the device
  pushNotification(id, sender, priority, message);

  //store the notification from text input in firestore
  initializeNotification(id, sender,priority, message);
}

function pushNotification(id, sender, priority, message) {
  var gcm = require('node-gcm');
 
  // Create a message
  var message = new gcm.Message({
      collapseKey: 'demo',
      priority: 'high',
      contentAvailable: true,
      delayWhileIdle: true,
      timeToLive: 3,
      restrictedPackageName: "com.cs495.battleelite.battleelite",
      data: {
          id: id,
          sender: sender,
          priority: priority,
          message: message
      },
      notification: {
          title: "BattleElite",
          icon: "ic_launcher_background",
          body: message
      }
  });
  
  // Set up the sender with you API key
  var sender = new gcm.Sender('AAAAL5LrE4o:APA91bGISR2ZHJGZNN-TnghL0Z16a7Uw3TJyZaR2KVdsPYUcEPPFte8yAWOhDJLIVi6UihVoepu0OOs32OptAytOlrww344GQM-6AktG6sustK6455mD0uEjBvvQuq7BsrSt-qCAr5yX');
  
  // Add the registration tokens of the devices you want to send to
  var registrationTokens = [];

  //send notifications to all devices
  users.get().then(snapshot => {
    snapshot.forEach(doc => {
      registrationTokens.push(doc.data().id); 
      console.log(doc.data().id);  
    });

    // Send the message
    // ... trying only once
    sender.sendNoRetry(message, { registrationTokens: registrationTokens }, function(err, response) {
      if(err) console.error(err);
      else    console.log(response);
    });
  });
}

function initializeNotification(id, sender, priority, message) {
  notifications.doc().set({
      id: id,
      message: message,
      priority: priority,
      sender: sender
  });
}

function generateForceTrackingData(minLat, minLong, maxLat, maxLong, numPlatoons, numSquads, numEnemyUnits, numPreplannedTargets, duration) {
  console.log("generating force tracking data");
  var platoons = [];
  var squads = [];
  var enemyUnits = [];
  var preplannedTargets = [];

  initializeCompanyHQ(minLat, maxLat, minLong, maxLong);
  for (i = 0; i < numPlatoons; i++)
    platoons.push(initializePlatoon(minLat, maxLat, minLong, maxLong));
  for (i = 0; i < numSquads; i++)
    squads.push(initializeSquad(minLat, maxLat, minLong, maxLong));
  for (i = 0; i < numEnemyUnits; i++)
    enemyUnits.push(initializeEnemyUnit(minLat, maxLat, minLong, maxLong));
  for (i = 0; i < numPreplannedTargets; i++)
    preplannedTargets.push(initializePreplannedTarget(minLat, maxLat, minLong, maxLong));

  var startTime = Date.now();

  var platoonInterval = setInterval(updatePlatoons, 30 * 1000);
  var squadInterval = setInterval(updateSquads, 15 * 1000);
  var enemyUnitInterval = setInterval(updateEnemyUnits, 60 * 1000);
  var preplannedTargetInterval = setInterval(updatePreplannedTargets, 60 * 1000);

  function updatePlatoons() {
    console.log("updating platoons");
    if (Date.now() - startTime > duration) {
      clearInterval(platoonInterval);
      return;
    }

    for (var i = 0; i < platoons.length; i++) {
      var ID = platoons[i];
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");

            var lat = doc.get("Lat");
            lat = lat + randn_bm(-0.002, 0.002, 1);
            lat = Math.round(lat * 100000) / 100000;
            var long = doc.get("Long");
            long = long + randn_bm(-0.002, 0.002, 1);
            long = Math.round(long * 100000) / 100000;

            forces.doc().set({
              Date_Time: Date.now(),
              IsCompanyHQ: false,
              IsPlatoon: true,
              IsSquad: false,
              IsEnemyUnit: false,
              IsPreplannedTarget: false,
              Name: name,
              ID: ID,
              Lat: lat,
              Long: long,
              Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
            });
          }
        })
      })(ID);
    }
  }

  function updateSquads() {
    console.log("updating squads");
    if (Date.now() - startTime > duration) {
      clearInterval(squadInterval);
      return;
    }

    for (var i = 0; i < squads.length; i++) {
      var ID = squads[i];
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");

            var lat = doc.get("Lat");
            lat = lat + randn_bm(-0.001, 0.001, 1);
            lat = Math.round(lat * 100000) / 100000;
            var long = doc.get("Long");
            long = long + randn_bm(-0.001, 0.001, 1);
            long = Math.round(long * 100000) / 100000;

            forces.doc().set({
              Date_Time: Date.now(),
              IsCompanyHQ: false,
              IsPlatoon: false,
              IsSquad: true,
              IsEnemyUnit: false,
              IsPreplannedTarget: false,
              Name: name,
              ID: ID,
              Lat: lat,
              Long: long,
              Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
            });
          }
        })
      })(ID);
    }
  }

  function updateEnemyUnits() {
    console.log("updating enemy units");
    if (Date.now() - startTime > duration) {
      clearInterval(enemyUnitInterval);
      return;
    }

    //randomly change status and location of targets
    for (var i = 0; i < enemyUnits.length; i++) {
      var ID = enemyUnits[i];
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");
            var status = doc.get("Status")
            if (Math.random() < 0.5)
              status = enemyUnitStatuses[getRandomInt(0, enemyUnitStatuses.length-1)]

            var lat = doc.get("Lat");
            var long = doc.get("Long");

            //randomly change target location
            if (Math.random() < 0.01) {
              lat = lat + randn_bm(-0.01, 0.01, 1);
              lat = Math.round(lat * 100000) / 100000;
              long = long + randn_bm(-0.01, 0.01, 1);
              long = Math.round(long * 100000) / 100000;
            }

            forces.doc().set({
              Date_Time: Date.now(),
              IsCompanyHQ: false,
              IsPlatoon: false,
              IsSquad: false,
              IsEnemyUnit: true,
              IsPreplannedTarget: false,
              Name: name,
              ID: ID,
              Lat: lat,
              Long: long,
              Status: status
            });
          }
        })
      })(ID);
    }

    //randomly add new enemy unit
    if (Math.random() < 0.5)
      initializeEnemyUnit();
  }

  function updatePreplannedTargets() {
    console.log("updating preplanned targets");
    if (Date.now() - startTime > duration) {
      clearInterval(preplannedTargetInterval);
      return;
    }

    //randomly change status and location of targets
    for (var i = 0; i < preplannedTargets.length; i++) {
      var ID = preplannedTargets[i];
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");
            var status = doc.get("Status")
            if (status != "Captured") {
              if (Math.random() < 0.5)
                status = preplannedTargetStatuses[getRandomInt(0, preplannedTargetStatuses.length-1)]
            }

            var lat = doc.get("Lat");
            var long = doc.get("Long");

            //randomly change target location
            if (Math.random() < 0.01) {
              lat = lat + randn_bm(-0.01, 0.01, 1);
              lat = Math.round(lat * 100000) / 100000;
              long = long + randn_bm(-0.01, 0.01, 1);
              long = Math.round(long * 100000) / 100000;
            }

            forces.doc().set({
              Date_Time: Date.now(),
              IsCompanyHQ: false,
              IsPlatoon: false,
              IsSquad: false,
              IsEnemyUnit: true,
              IsPreplannedTarget: false,
              Name: name,
              ID: ID,
              Lat: lat,
              Long: long,
              Status: status
            });
          }
        })
      })(ID);
    }

    //randomly add new preplanned target
    if (Math.random() < 0.5)
      initializePreplannedTarget();
  }
}

var platoonNames = ["Platoon"];
var squadNames = ["Squad"];
var enemyUnitNames = ["Enemy"];
var preplannedTargetNames = ["Target"];
var platoonCount = 0;
var squadCount = 0;
var enemyUnitCount = 0;
var preplannedTargetCount = 0;
var forceStatuses = ["On standby", "Under fire", "Engaged in combat", "Mobilizing", "Moving towards target"];
var enemyUnitStatuses = ["On the move", "Attacking friendly forces", "Standing still", "Eliminated"];
var preplannedTargetStatuses = ["Captured", "Not captured", "In contention"];

function initializeCompanyHQ(minLat, maxLat, minLong, maxLong) {
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  var name = "CompanyHQ";

  var ID = getNewForceID();

  forces.doc().set({
    Date_Time: Date.now(),
    IsCompanyHQ: true,
    IsPlatoon: false,
    IsSquad: false,
    IsEnemyUnit: true,
    IsPreplannedTarget: false,
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: ""
  });

  platoonCount++;
  return ID;
}

function initializePlatoon(minLat, maxLat, minLong, maxLong) {
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  var name = platoonNames[getRandomInt(0, platoonNames.length-1)];
  name = name + (platoonCount + 1);

  var ID = getNewForceID();

  forces.doc().set({
    Date_Time: Date.now(),
    IsCompanyHQ: false,
    IsPlatoon: true,
    IsSquad: false,
    IsEnemyUnit: false,
    IsPreplannedTarget: false,
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
  });

  platoonCount++;
  return ID;
}

function initializeSquad(minLat, maxLat, minLong, maxLong) {
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  var name = squadNames[getRandomInt(0, squadNames.length-1)];
  name = name + (squadCount + 1);

  var ID = getNewForceID();

  forces.doc().set({
    Date_Time: Date.now(),
    IsCompanyHQ: false,
    IsPlatoon: false,
    IsSquad: false,
    IsEnemyUnit: true,
    IsPreplannedTarget: false,
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
  });

  squadCount++;
  return ID;
}

function initializeEnemyUnit(minLat, maxLat, minLong, maxLong) {
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  var name = enemyUnitNames[getRandomInt(0, enemyUnitNames.length-1)];
  name = name + (targetCount + 1);

  var ID = getNewForceID();

  forces.doc().set({
    Date_Time: Date.now(),
    IsCompanyHQ: false,
    IsPlatoon: false,
    IsSquad: false,
    IsEnemyUnit: true,
    IsPreplannedTarget: false,
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: enemyUnitStatuses[getRandomInt(0, enemyUnitStatuses.length-1)]
  });

  enemyUnitCount++;
  return ID;
}

function initializePreplannedTarget(minLat, maxLat, minLong, maxLong) {
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  var name = preplannedTargetNames[getRandomInt(0, preplannedTargetNames.length-1)];
  name = name + (targetCount + 1);

  var ID = getNewForceID();

  forces.doc().set({
    Date_Time: Date.now(),
    IsCompanyHQ: false,
    IsPlatoon: false,
    IsSquad: false,
    IsEnemyUnit: false,
    IsPreplannedTarget: true,
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: preplannedTargetStatuses[getRandomInt(0, preplannedTargetStatuses.length-1)]
  });

  preplannedTargetCount++;
  return ID;
}

function getNewForceID() {
  var randomID = guidGenerator();
  var exists = false;

  var query = forces.where("ID", "==", randomID);
  query.get().then(snap => {
    size = snap.size;
    if (size > 0)
     exists = true;
  })

  while (exists) {
    randomID = guidGenerator();

    var query = sensors.where("ID", "==", randomID);
    query.get().then(snap => {
      size = snap.size;
      if (size > 0)
      exists = true;
    })
  }
  return randomID;
}

function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
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

  var startTime = Date.now();

  var vibrationSensorInterval = setInterval(tripRandomVibrationSensor, 60 * 1000);
  var heartRateSensorInterval = setInterval(updateHeartRateSensors, 15 * 1000);
  var assetSensorInterval = setInterval(updateAssetSensors, 60 * 1000);
  var moistureSensorInterval = setInterval(updateMoistureSensors, 30 * 1000);
  var tempSensorInterval = setInterval(updateTempSensors, 30 * 1000);

  function tripRandomVibrationSensor() {
    console.log("tripping vibration sensor");
    if (Date.now() - startTime > duration) {
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
              Date_Time: Date.now(),
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
    if (Date.now() - startTime > duration) {
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
                Date_Time: Date.now(),
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
    if (Date.now() - startTime > duration) {
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
                Date_Time: Date.now(),
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
    if (Date.now() - startTime > duration) {
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
                Date_Time: Date.now(),
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
    if (Date.now() - startTime > duration) {
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
                Date_Time: Date.now(),
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
    Date_Time: Date.now(),
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
    Date_Time: Date.now(),
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
    Date_Time: Date.now(),
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
    Date_Time: Date.now(),
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
    Date_Time: Date.now(),
    Lat: lat,
    Long: long,
    Sensor_Type: "Temp",
    Sensor_Val: tempVal,
    Sensor_ID: sensorID,
    SensorHealth: "Good",
    Battery: getRandomInt(80,100)
  });
}