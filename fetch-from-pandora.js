#!/usr/bin/env node

var baseUrl = '//tuner.pandora.com/services/json/';

//var partnerUsername = 'iphone';
//var partnerPassword = 'P2E4FC0EAD3*878N92B2CDp34I0B1@388137C';
//var partnerDeviceModel = 'IP01';
//var partnerDecryptKey = '20zE1E47BE57$51';
//var partnerEncryptKey = '721^26xE22776';
//var partnerVersion = '5'; // must be a string

var partnerUsername = 'android';
var partnerPassword = 'AC7IBG09A3DTSYM4R41UJWL07VLN8JI7';
var partnerDeviceModel = 'android-generic';
var partnerDecryptKey = 'R=U!LH$O2B#';
var partnerEncryptKey = '6#26FRL$ZWD';
var partnerVersion = '5'; // must be a string

if (process.argv.length != 4) {
    console.log('Usage: fetch-from-pandora.js <email> <password>');
    process.exit(1);
}
var userUsername = process.argv[2];
var userPassword = process.argv[3];
console.log('username:', userUsername);
console.log('password:', userPassword);

var db;
var partnerId;
var partnerAuthToken;
var timeOffset;
var userId;
var userAuthToken;

var axios = require('axios');
var crypto = require('crypto');
var qsql = require('q-sqlite3');

function encrypt(text) {
    var cipher = crypto.createCipheriv('bf-ecb', partnerEncryptKey, '');
    var ciphered = cipher.update(text, 'utf8', 'hex');
    ciphered += cipher.final('hex');
    return ciphered;
}

function decrypt(text) {
    var decipher = crypto.createDecipheriv('bf-ecb', partnerDecryptKey, '');
    var deciphered = decipher.update(text, 'hex', 'utf8');
    deciphered += decipher.final('utf8');
    return deciphered;
}

function decryptSyncTime(encrypted) {
    var syncTime = decrypt(encrypted);
    console.log('decrypted syncTime:', syncTime);

    // var buffer = new Buffer(syncTime, 'ascii');
    // syncTime = buffer.toString('ascii', 4);

    // Instead of stripping the first "four" characters of garbage, it seems
    // more reliable to just take the last 10 characters. However, this will 
    // be a problem in the year 2286, when it will need 11 digits.
    syncTime = syncTime.slice(-10);

    // for (;;) {
    //     var leadingChar = syncTime[0];
    //     console.log('leadingChar:', leadingChar);
    //     if (Number.isInteger(leadingChar)) {
    //         break;
    //     }
    //     syncTime = syncTime.slice(1);
    // }

    console.log('syncTime:', syncTime);
    return syncTime;
}

function getTime() {
    var now = (new Date()).getTime();
    return parseInt(now / 1000, 10);
}

function doPartnerLogin() {
    return axios({
        method: 'POST',
        url: 'https:' + baseUrl,
        params: {
             method: 'auth.partnerLogin'
        },
        data: {
            username: partnerUsername,
            password: partnerPassword,
            deviceModel: partnerDeviceModel,
            version: partnerVersion
        }
    });
}

function doUserLogin() {
    var payload = {
        loginType: 'user',
        username: userUsername,
        password: userPassword,
        partnerAuthToken: partnerAuthToken,
        syncTime: getTime() + timeOffset
    };

    console.log("");
    console.log('doUserLogin: partnerId:', partnerId, ', partnerAuthToken:', partnerAuthToken, ', syncTime:', payload.syncTime);
    console.log('doUserLogin: payload:', JSON.stringify(payload));

    return axios({
        method: 'POST',
        url: 'https:' + baseUrl,
        params: {
             method: 'auth.userLogin',
             auth_token: partnerAuthToken,
             partner_id: partnerId
        },
        data: encrypt(JSON.stringify(payload))
    });
}

function getStationList() {
    var payload = {
        userAuthToken: userAuthToken,
        syncTime: getTime() + timeOffset
    };
    console.log("");
    console.log('getStationList: userAuthToken:', payload.userAuthToken, ', syncTime:', payload.syncTime);
    console.log('getStationList: payload:', JSON.stringify(payload));
    return axios({
        method: 'POST',
        url: 'http:' + baseUrl,
        params: {
             method: 'user.getStationList',
             auth_token: userAuthToken,
             partner_id: partnerId,
             user_id: userId
        },
        data: encrypt(JSON.stringify(payload))
    });
}

function getExtendedStationInformation(stationToken) {
    var payload = {
        stationToken: stationToken,
        includeExtendedAttributes: true,
        userAuthToken: userAuthToken,
        syncTime: getTime() + timeOffset
    };
    console.log("");
    console.log('getExtendedStationInformation: userAuthToken:', payload.userAuthToken, ', syncTime:', payload.syncTime);
    console.log('getExtendedStationInformation: payload:', JSON.stringify(payload));
    return axios({
        method: 'POST',
        url: 'http:' + baseUrl,
        params: {
             method: 'station.getStation',
             auth_token: userAuthToken,
             partner_id: partnerId,
             user_id: userId
        },
        data: encrypt(JSON.stringify(payload))
    });
}

function initDb() {
    return qsql.createDatabase('tracks.db')
        .then(function(_db) {
            db = _db;
        });
}

function storeTrack(artistName, songName) {
    return db.run('INSERT INTO tracks (artistName, songName) VALUES (?, ?)', [ artistName, songName ]);
}


initDb()
    .then(function(db) {
        return doPartnerLogin();
    })
    .then(function(response) {
        console.log('partnerLogin response:', response.data);
        if (response.data.stat != 'ok') {
            throw new Error(response.data.stat, response);
        }
        var result = response.data.result;
        partnerId = result.partnerId;
        partnerAuthToken = result.partnerAuthToken;
        timeOffset = decryptSyncTime(result.syncTime) - getTime();
        console.log('partnerId:', partnerId, ', partnerAuthToken:', partnerAuthToken, ', timeOffset:', timeOffset);
        return doUserLogin();
    })
    .then(function(response) {
        console.log('userLogin response:', response);
        var result = response.data.result;
        userId = result.userId;
        userAuthToken = result.userAuthToken;
        return getStationList();
    })
    .then(function(response) {
        console.log('response:', response);
        var stations = response.data.result.stations;
        console.log("");
        console.log("FIRST STATION:");
        for (var i = 0; i < stations.length; i++) {
            var station = stations[i];
            console.log(station);
            break;
        }
        var first = stations[1];
        return getExtendedStationInformation(first.stationToken);
    })
    .then(function(response) {
        console.log('response:', response);
        if (response.data.result.feedback) {
            var feedback = response.data.result.feedback;
            console.log('FEEDBACK:', feedback);
            console.log("");
            var promises = [];
            for (var i = 0; i < feedback.thumbsUp.length; i++) {
                var track = feedback.thumbsUp[i];
                console.log(track.songName, 'by', track.artistName);
                promises.push(storeTrack(track.artistName, track.songName));
            }
            return Promise.all(promises);
        }
    })
    .catch(function(response) {
        // if (response instanceof Error) throw response;
        console.log('unexpected response:', response);
    });
