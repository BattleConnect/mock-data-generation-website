const express = require('express');
const app = express();
var bodyParser = require('body-parser');
var path = require('path');
var firebase = require('firebase/app');
require('firebase/auth');
require('firebase/firestore');
require('dotenv').config();
const gcm = require('node-gcm');

const PORT = process.env.PORT || 5000;

app.use(bodyParser());

var userAuthenticated = false;

// Initialize Firebase
var config = {
	apiKey: process.env.FIREBASE_APIKEY,
	authDomain: "battle-connect.firebaseapp.com",
	databaseURL: "https://battle-connect.firebaseio.com/",
	projectId: "battle-connect",
};
firebase.initializeApp(config);

app.post('/login', function (req, res) {
  if (!req.body.email) return res.status(400).json({error: 'missing email'});
  if (!req.body.password) return res.status(400).json({error: 'missing password'});

  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE) // don't persist auth session
    .then(function() {
      return firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.password)
    })
    .then((user) => {
      if (user != null) {
        userAuthenticated = true;
        res.sendFile(path.join(__dirname + '/index.html'));
      }
      // let uid = user.uid;

      // // set cookie with UID or some other form of persistence
      // // such as the Authorization header
      // res.cookie('__session', { uid: uid }, { signed: true, maxAge: 3600 });
      // res.set('cache-control', 'max-age=0, private') // may not be needed. Good to have if behind a CDN.
      // res.send('You have successfully logged in');

      // return firebase.auth().signOut(); //clears session from memory
    })
    .catch((err) => {
      //next(err);
      res.status(400).json({error: 'wrong credentials'});
    });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/login.html'));
});

app.get('/notification.html', (req, res) => {
  if (!userAuthenticated) {
    return res.status(400).json({error: 'user has not been authenticated'});
  }
  res.sendFile(path.join(__dirname + '/notification.html'));
});

app.post('/generate-sensor-data', (req, res) => {
  if (!userAuthenticated) {
    return res.status(400).json({error: 'user has not been authenticated'});
  }
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
  if (!userAuthenticated) {
    return res.status(400).json({error: 'user has not been authenticated'});
  }
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
  if (!userAuthenticated) {
    return res.status(400).json({error: 'user has not been authenticated'});
  }
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
  if (!userAuthenticated) {
    return res.status(400).json({error: 'user has not been authenticated'});
  }
  res.send(200);
  deleteForceTrackingData();
});

app.post('/delete-sensor-data', (req, res) => {
  if (!userAuthenticated) {
    return res.status(400).json({error: 'user has not been authenticated'});
  }
  res.send(200);
  deleteSensorData();
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}/`);
});

const firestore = firebase.firestore();
const settings = {/* your settings... */ timestampsInSnapshots: true};
firestore.settings(settings);
var sensors = firestore.collection("sensors");
var forces = firestore.collection("forces");
var notifications = firestore.collection("notifications");
var users = firestore.collection("users");

//deletes the "sensors" collection in firebase
function deleteSensorData() {
  deleteCollection(firestore, "sensors", 100);
}

//delete the "forces" collection in firebase
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

//delets a collection
function deleteCollection(db, collectionPath, batchSize) {
  var collectionRef = db.collection(collectionPath);
  var query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, batchSize, resolve, reject);
  });
}

//deletes documents from a collection in batches
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

//sends a notification to a device and stores the notification in firebase
function generateNotification(id, sender, priority, message) {
  console.log("generating notification");

  //send the notification to the device
  pushNotification(id, sender, priority, message);

  //store the notification from text input in firestore
  initializeNotification(id, sender,priority, message);
}

//pushes a notification to a specific device
function pushNotification(id, sender, priority, message) {
  // Create a message
  var message = new gcm.Message({
    priority: 'high',
    timeToLive: 3,
    data: {
        id: id,
        sender: sender,
        priority: priority,
        message: message
    },
    notification: {
        title: "BattleConnect",
        icon: "ic_launcher_background",
        body: message
      }
  });

  var sender = new gcm.Sender('AAAAL5LrE4o:APA91bF7kmEf180fNCAUEX1fkyqObgq_ZY88zYyq-g5SwrVvYf7XNTnusPrvbpGs2Fz8OoqjbcvbDX7HTHHJimF2EjMWQvNkj1ItNKVUysJZ6BCfxU76YqlgQOuEcr2UCJXfsC-Iegcl');
  
  // Add the registration tokens of the devices you want to send to
  var regTokens = [];
  users.get().then(function(querySnapshot) {
    querySnapshot.forEach(function(doc) {
      regTokens.push(doc.data().id); 
    });
    sender.send(message, regTokens, 10, function (err, result) {
      if(err) console.error(err);
      else console.log(result);
    })
  });
}

//adds a notification to firebase
function initializeNotification(id, sender, priority, message) {
  notifications.doc().set({
      id: id,
      message: message,
      priority: priority,
      sender: sender
  });
}

//generates force data that conforms to the user's specifications
function generateForceTrackingData(minLat, minLong, maxLat, maxLong, numPlatoons, numSquads, numEnemyUnits, numPreplannedTargets, duration) {
  console.log("generating force tracking data");
  var platoons = []; //ids of generatd platoons
  var squads = []; //ids of generatd squads
  var enemyUnits = []; //ids of generatd enemy units
  var preplannedTargets = []; //ids of generatd targets

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

  //the intervals below determine how often certain forces should push updates to firebase
  var platoonInterval = setInterval(updatePlatoons, 30 * 1000);
  var squadInterval = setInterval(updateSquads, 15 * 1000);
  var enemyUnitInterval = setInterval(updateEnemyUnits, 60 * 1000);
  var preplannedTargetInterval = setInterval(updatePreplannedTargets, 60 * 1000);

  //makes all of the platoons push updates to firebase
  function updatePlatoons() {
    console.log("updating platoons");
    //stop updating platoons if the user specified duration for generating force data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(platoonInterval);
      return;
    }

    //have every platoon push an update
    for (var i = 0; i < platoons.length; i++) {
      var ID = platoons[i];
      //gets the platoons last update from firebase
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");

            //slightly change the platoon's location
            var lat = doc.get("Lat");
            lat = lat + randn_bm(-0.002, 0.002, 1);
            lat = Math.round(lat * 100000) / 100000;
            var long = doc.get("Long");
            long = long + randn_bm(-0.002, 0.002, 1);
            long = Math.round(long * 100000) / 100000;

            //push an update to firebase
            forces.doc().set({
              Date_Time: Date.now(),
              Type: "Platoon",
              Name: name,
              ID: ID,
              Lat: lat,
              Long: long,
              //give the platoon a new random status
              Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
            });
          }
        })
      })(ID);
    }
  }

  //makes all of the squads push updates to firebase
  function updateSquads() {
    console.log("updating squads");

    //stop having squads push updates if the user specified duration for generating force data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(squadInterval);
      return;
    }

    //have every squad push an update
    for (var i = 0; i < squads.length; i++) {
      var ID = squads[i];
      //get the squad's last update from firebase
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");

            //slightly change the squad's location
            var lat = doc.get("Lat");
            lat = lat + randn_bm(-0.001, 0.001, 1);
            lat = Math.round(lat * 100000) / 100000;
            var long = doc.get("Long");
            long = long + randn_bm(-0.001, 0.001, 1);
            long = Math.round(long * 100000) / 100000;

            //push an update to firebase
            forces.doc().set({
              Date_Time: Date.now(),
              Type: "Squad",
              Name: name,
              ID: ID,
              Lat: lat,
              Long: long,
              //give the squad a new random status
              Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
            });
          }
        })
      })(ID);
    }
  }

  //have enenmy units push updates to firebase
  function updateEnemyUnits() {
    console.log("updating enemy units");
    //stop having enemy units push updates to firebase if the user specified duration for generating data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(enemyUnitInterval);
      return;
    }

    //have every enemy unit push an update to firebase
    for (var i = 0; i < enemyUnits.length; i++) {
      var ID = enemyUnits[i];
      //get the enemy unit's last update from firebase
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");
            var status = doc.get("Status")
            //randomly change the enemy unit's status half the time
            if (Math.random() < 0.5)
              status = enemyUnitStatuses[getRandomInt(0, enemyUnitStatuses.length-1)]

            var lat = doc.get("Lat");
            var long = doc.get("Long");

            //randomly change the enemy unit's location
            if (Math.random() < 0.01) {
              lat = lat + randn_bm(-0.01, 0.01, 1);
              lat = Math.round(lat * 100000) / 100000;
              long = long + randn_bm(-0.01, 0.01, 1);
              long = Math.round(long * 100000) / 100000;
            }

            //push an update to firebase
            forces.doc().set({
              Date_Time: Date.now(),
              Type: "Enemy Unit",
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

    //randomly add a new enemy unit
    if (Math.random() < 0.5)
      initializeEnemyUnit();
  }

  //have all the preplanned targets push updates to firebase
  function updatePreplannedTargets() {
    console.log("updating preplanned targets");
    //stop pushing updates if the duration that the user wants data to generate for has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(preplannedTargetInterval);
      return;
    }

    //have every preplanned target push an update to firebase
    for (var i = 0; i < preplannedTargets.length; i++) {
      var ID = preplannedTargets[i];
      //get the preplanned targets last update from firebase
      var query = forces.where("ID", "==", ID).orderBy("Date_Time", "desc").limit(1);
      (function (ID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];

            var name = doc.get("Name");
            var status = doc.get("Status")
            //if the target has not been captured, give it 50% chance of getting a new random status
            if (status != "Captured") {
              if (Math.random() < 0.5)
                status = preplannedTargetStatuses[getRandomInt(0, preplannedTargetStatuses.length-1)]
            }

            var lat = doc.get("Lat");
            var long = doc.get("Long");

            //slightly change the target's location
            if (Math.random() < 0.01) {
              lat = lat + randn_bm(-0.01, 0.01, 1);
              lat = Math.round(lat * 100000) / 100000;
              long = long + randn_bm(-0.01, 0.01, 1);
              long = Math.round(long * 100000) / 100000;
            }

            //push an update to firebase
            forces.doc().set({
              Date_Time: Date.now(),
              Type: "Preplanned Target",
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

    //randomly add new target
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

//add a new company HQ to firebase
function initializeCompanyHQ(minLat, maxLat, minLong, maxLong) {
  //give the company HQ a random location within the allowed bounds
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  var name = "CompanyHQ";

  var ID = getNewForceID();

  //add the company HQ data to firebase
  forces.doc().set({
    Date_Time: Date.now(),
    Type: "Company HQ",
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: ""
  });

  platoonCount++;
  return ID;
}

//add a new platoon to firebase
function initializePlatoon(minLat, maxLat, minLong, maxLong) {
  //give the platoon a random location within the allowed bounds
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  //give the platoon a new random name, e.g., "Platoon1"
  var name = platoonNames[getRandomInt(0, platoonNames.length-1)];
  name = name + (platoonCount + 1);

  var ID = getNewForceID();

  //add the platoon data to firebase
  forces.doc().set({
    Date_Time: Date.now(),
    Type: "Platoon",
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
  });

  platoonCount++;
  return ID;
}

//add a new squad to firebase
function initializeSquad(minLat, maxLat, minLong, maxLong) {
  //give the squad a random location within the allowed bounds
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  //give the squad a random name, e.g., "Squad3"
  var name = squadNames[getRandomInt(0, squadNames.length-1)];
  name = name + (squadCount + 1);

  var ID = getNewForceID();

  //add the squad's data to firebase
  forces.doc().set({
    Date_Time: Date.now(),
    Type: "Squad",
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: forceStatuses[getRandomInt(0, forceStatuses.length-1)]
  });

  squadCount++;
  return ID;
}

//add a new enemy unit to firebase
function initializeEnemyUnit(minLat, maxLat, minLong, maxLong) {
  //give the enemy unit a random location within the allowed bounds
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  //give the enemy unit a random name, e.g., "Enemy3"
  var name = enemyUnitNames[getRandomInt(0, enemyUnitNames.length-1)];
  name = name + (enemyUnitCount + 1);

  var ID = getNewForceID();

  //add the enemy unit's data to firebase
  forces.doc().set({
    Date_Time: Date.now(),
    Type: "Enemy Unit",
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: enemyUnitStatuses[getRandomInt(0, enemyUnitStatuses.length-1)]
  });

  enemyUnitCount++;
  return ID;
}

//add a new target to firebase
function initializePreplannedTarget(minLat, maxLat, minLong, maxLong) {
  //give the target a random location within the allowed bounds
  var randomLat = minLat + (maxLat - minLat) * Math.random();
  randomLat = Math.round(randomLat * 100000) / 100000;
  var randomLong = minLong + (maxLong - minLong) * Math.random();
  randomLong = Math.round(randomLong * 100000) / 100000;
  
  //give the target a random name like "Target2"
  var name = preplannedTargetNames[getRandomInt(0, preplannedTargetNames.length-1)];
  name = name + (preplannedTargetCount + 1);

  var ID = getNewForceID();

  //add the target's data to firebase
  forces.doc().set({
    Date_Time: Date.now(),
    Type: "Preplanned Target",
    Name: name,
    ID: ID,
    Lat: randomLat,
    Long: randomLong,
    Status: preplannedTargetStatuses[getRandomInt(0, preplannedTargetStatuses.length-1)]
  });

  preplannedTargetCount++;
  return ID;
}

//generates an appropriate force id
function getNewForceID() {
  var randomID = guidGenerator();
  var exists = false;

  //check if the "forces" collection already has data with the same force ID
  var query = forces.where("ID", "==", randomID);
  query.get().then(snap => {
    size = snap.size;
    if (size > 0)
     exists = true;
  })

  //generate force IDs until one is not found in the "forces" collection
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

//generates a random string
function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

//generates sensor data that conforms to the users's specifications
function generateSensorData(minLat, minLong, maxLat, maxLong, numVibration, numAsset, numHeartRate, numMoisture, numTemp, duration) {
  console.log("generating sensor data");
  var vibrationSensors = []; //ids of generatd vibration sensors
  var assetSensors = []; //ids of generatd asset sensors
  var heartRateSensors = []; //ids of generatd heart rate sensors
  var moistureSensors = []; //ids of generatd moisture sensors
  var tempSensors = []; //ids of generatd temperature sensors

  //generate the average temperature and moisture level for the area, forms a baseline for generating temperature and moisture sensors
  var averageTempVal = randn_bm(-10,100,0.5);
  var averageMoistureVal = randn_bm(40,80,1);

  console.log("determined average temperature and average moisture level");

  //generate vibration sensors
  for (var i = 0; i < numVibration; i++) {
    //give the sensor a random location within the allowed bounds
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    //finish generating the sensor and add it to firebase
    initializeVibrationSensor(randomLat, randomLong, randomSensorID);
    vibrationSensors.push(randomSensorID);
  }
  console.log("initialized vibration sensors");

  //generate asset sensors
  for (var i = 0; i < numAsset; i++) {
    //give the sensor a random location within the allowed bounds
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    //finish generating the sensor and add it to firebase
    initializeAssetSensor(randomLat, randomLong, randomSensorID);
    assetSensors.push(randomSensorID);
  }
  console.log("initialized asset sensors");

  //generate heart rate sensors
  for (var i = 0; i < numHeartRate; i++) {
    //give the sensor a random location within the allowed bounds
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    //finish generating the sensor and add it to firebase
    initializeHeartRateSensor(randomLat, randomLong, randomSensorID);
    heartRateSensors.push(randomSensorID);
  }
  console.log("initialized heart rate sensors");

  //generate moisture sensors
  for (var i = 0; i < numMoisture; i++) {
    //give the sensor a random location within the allowed bounds
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    //give the moisture sensor a random moisture level that's near the average moisture level
    var moistureVal = randn_bm(averageMoistureVal-5, averageMoistureVal+5, 1);
    moistureVal = Math.round(moistureVal*10) / 10;
    //finish generating the sensor and add it to firebase
    initializeMoistureSensor(randomLat, randomLong, randomSensorID, moistureVal);
    moistureSensors.push(randomSensorID);
  }
  console.log("initialized moisture sensors");

  //generate temperature sensors
  for (var i = 0; i < numTemp; i++) {
    //give the sensor a random location within the allowed bounds
    var randomLat = minLat + (maxLat - minLat) * Math.random();
    randomLat = Math.round(randomLat * 100000) / 100000;
    var randomLong = minLong + (maxLong - minLong) * Math.random();
    randomLong = Math.round(randomLong * 100000) / 100000;
    var randomSensorID = getNewRandomSensorID();
    //give the temperature sensor a random temperature that's near the average temperature
    var tempVal = randn_bm(averageTempVal-5, averageTempVal+5, 1);
    tempVal = Math.round(tempVal*10) / 10;
    //finish generating the sensor and add it to firebase
    initializeTempSensor(randomLat, randomLong, randomSensorID, tempVal);
    tempSensors.push(randomSensorID);
  }
  console.log("initialized temperature sensors");

  var startTime = Date.now();

  //the intervals determine how often different types of sensors should push updates to firebase
  var vibrationSensorInterval = setInterval(tripRandomVibrationSensor, 60 * 1000);
  var heartRateSensorInterval = setInterval(updateHeartRateSensors, 15 * 1000);
  var assetSensorInterval = setInterval(updateAssetSensors, 60 * 1000);
  var moistureSensorInterval = setInterval(updateMoistureSensors, 30 * 1000);
  var tempSensorInterval = setInterval(updateTempSensors, 30 * 1000);

  //trips a vibration sensor, i.e., give it a value above 0
  function tripRandomVibrationSensor() {
    console.log("tripping vibration sensor");
    //stop tripping vibration sensors if the duration for generating data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(vibrationSensorInterval);
      return;
    }

    //randomly choose a vibration sensor to trip
    var randomIndex = getRandomInt(0, vibrationSensors.length - 1);
    var randomSensorID = vibrationSensors[randomIndex];
    console.log("tripping vibration sensor with Sensor_ID = " + randomSensorID);
    //get the vibration sensor's last update from firebase
    var query = sensors.where("Sensor_ID", "==", randomSensorID).orderBy("Date_Time", "desc").limit(1);
    query.get().then(results => {
        if (!results.empty) {
          var doc = results.docs[0];
          var sensorHealth = doc.get("SensorHealth");
          var battery = doc.get("Battery");
          //don't trip vibration sensors that have health issues or 0 battery
          if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
            var lat = doc.get("Lat");
            var long = doc.get("Long");
            //lower the battery a bit
            if (Math.random() < 0.1)
                battery--;
            if (battery < 0)
              battery = 0;
            //change the health randomly
              if (Math.random() < 0.01)
                sensorHealth = "Service";
              if (Math.random() < 0.01)
                sensorHealth = "EOL";
            //get random value for the sensor
            var sensorVal = randn_bm(50,250,1);
            sensorVal = Math.round(sensorVal*10)/10;
            //add the data to firebase
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

  //have each asset sensor push an update to firebase
  function updateAssetSensors() {
    console.log("updating asset sensors");
    //stop updating asset sensors if the duration for generating data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(assetSensorInterval);
      return;
    }

    //have every asset sensor push an update to firebase
    for (var i = 0; i < assetSensors.length; i++) {
      var sensorID = assetSensors[i];
      //get the asset sensor's last update from firebase
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            //don't udpate a sensor with bad health or no battery left
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              var lat = doc.get("Lat");
              var long = doc.get("Long");
              var sensorVal = doc.get("Sensor_Val");
              //lower the battery a bit
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              //change the health randomly
              if (Math.random() < 0.01)
                sensorHealth = "Service";
              if (Math.random() < 0.01)
                sensorHealth = "EOL";
              //add the data to firebase
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

  //have all the heart rate sensors push updates to firebase
  function updateHeartRateSensors() {
    console.log("updating heart rate sensors");
    //stop updating heart rate sensors if the duration for generating data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(heartRateSensorInterval);
      return;
    }
    //have every heart rate sensor push an update to firebase
    for (var i = 0; i < heartRateSensors.length; i++) {
      var sensorID = heartRateSensors[i];
      //get the heart rate sensor's last update from firebase
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            //don't update a heart rate sensor with bad health or 0 battery
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              //adjust the heart rate sensor's location a bit
              var lat = doc.get("Lat");
              lat = lat + randn_bm(-0.001, 0.001, 1);
              lat = Math.round(lat * 100000) / 100000;
              var long = doc.get("Long");
              long = long + randn_bm(-0.001, 0.001, 1);
              long = Math.round(long * 100000) / 100000;
              //update the heart rate sensor's value a bit
              var sensorVal = doc.get("Sensor_Val");
              sensorVal = sensorVal + randn_bm(-10,10,1);
              sensorVal = Math.round(sensorVal);
              //lower the heart rate sensor's battery a bit
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              //change the health randomly
              if (Math.random() < 0.01)
                sensorHealth = "Service";
              if (Math.random() < 0.01)
                sensorHealth = "EOL";
              //add the data to firebase
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

  //have all the moisture sensors push updates to firebase
  function updateMoistureSensors() {
    console.log("updating moisture sensors");
    //stop updating moisture sensors if the duration for generating data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(moistureSensorInterval);
      return;
    }

    //have every moisture sensor push an update
    for (var i = 0; i < moistureSensors.length; i++) {
      var sensorID = moistureSensors[i];
      //get the moisture sensor's last update from firebase
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            //don't update a sensor with bad health or 0 battery
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              var lat = doc.get("Lat");
              var long = doc.get("Long");
              //change the value a bit
              var sensorVal = doc.get("Sensor_Val");
              sensorVal = sensorVal + randn_bm(-10,10,1);
              sensorVal = Math.round(sensorVal);
              if (sensorVal > 100)
                sensorVal = 100;
              //lower the battery a bit
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              //change the health randomly
              if (Math.random() < 0.01)
                sensorHealth = "Service";
              if (Math.random() < 0.01)
                sensorHealth = "EOL";
              //add the data to firebase
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

  //have all the temp sensors push updates to firebase
  function updateTempSensors() {
    console.log("updating temperature sensors");
    //stop updating temperature sensors if the duration for generating data has elapsed
    if (Date.now() - startTime > duration) {
      clearInterval(tempSensorInterval);
      return;
    }

    //have every temperature sensor push an update to firebase
    for (var i = 0; i < tempSensors.length; i++) {
      var sensorID = tempSensors[i];
      //get the sensor's last update from firebase
      var query = sensors.where("Sensor_ID", "==", sensorID).orderBy("Date_Time", "desc").limit(1);
      (function (sensorID) {
        query.get().then(results => {
          if (!results.empty) {
            var doc = results.docs[0];
            var sensorHealth = doc.get("SensorHealth");
            var battery = doc.get("Battery");
            //don't update a sensor with bad health or 0 battery
            if (sensorHealth != "EOL" || sensorHealth != "Service" || battery != 0) {
              var lat = doc.get("Lat");
              var long = doc.get("Long");
              //change the sensor's value a bit
              var sensorVal = doc.get("Sensor_Val");
              sensorVal = sensorVal + randn_bm(-5,5,1);
              sensorVal = Math.round(sensorVal*10)/10;
              if (sensorVal > 100)
                sensorVal = 100;
              //lower the battery a bit
              if (Math.random() < 0.02)
                battery--;
              if (battery < 0)
                battery = 0;
              //change the health randomly
              if (Math.random() < 0.01)
                sensorHealth = "Service";
              if (Math.random() < 0.01)
                sensorHealth = "EOL";
              //add the data to firebase
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

//gets a random, unique sensor ID
function getNewRandomSensorID() {
  var randomSensorID = getRandomInt(0,999999);
  var exists = false;

  //check if the sensor id is already present in the "sensors" collection
  var query = sensors.where("Sensor_ID", "==", randomSensorID);
  query.get().then(snap => {
    size = snap.size;
    if (size > 0)
     exists = true;
  })

  //get new IDs until the id is not taken
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

//returns a random number between min and max, approximately normally distributed
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


//adds a vibration sensor to firebase
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

//adds an asset sensor to firebase
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

//adds a heart rate sensor to firebase
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

//adds a moisture sensor to firebase
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

//adds a temperature sensor to firebase
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