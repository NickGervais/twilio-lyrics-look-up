// Copyright 2018, Google LLC.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const express = require('express');
const { urlencoded } = require('body-parser');

const app = express();
app.use(urlencoded({ extended: false }));

const axios = require('axios');
const secrets = require('./secrets.js');
const twilioClient = require('twilio')(secrets.twilio_accountSid, secrets.twilio_authToken);

function trackCompare(trackA, trackB) {
    if (trackA.track_rating > trackB.track_rating) {
        // trackA comes before trackB
        return -1;
    } else if (trackA.track_rating < trackB.track_rating) {
        // trackB comes before trackA
        return 1;
    } else {
        // trackA and trackB tie
        return 0;
    }
}

function writeResponse(res, statusCode, contentType, message) {
    res.writeHead(statusCode, {'Content-Type': contentType});
    res.end(message);
}

async function isNumberVerified(number) {
    var ver = await twilioClient.verify.services(secrets.service_id)
        .verifications(number).fetch();
    if (ver.status === 'approved') {
        return true;
    } else {
        return false;
    }
}

async function verifyNumber(toNumber){
    return await twilioClient.verify.services(secrets.service_id)
            .verifications(toNumber)
            .update({status: 'approved'});
}

async function sendSMS(fromNumber, toNumber, bodyText) {
    return await twilioClient.messages
    .create({
        body: bodyText,
        from: fromNumber,
        to: toNumber
    });
}

app.get('/', (req, res) => {
    writeResponse(res, 200, 'text/plain', 'This is the lyrics to song SMS machine!');
})

app.post('/sms', async (req, res) => {
    const apiKey = secrets.musixmatchApiKey;
    const fromNumber = '+19528005414';

    const toNumber = ((req || {}).body || {}).From;
    if (!toNumber) {
        writeResponse(res, 404, 'text/plain', 'Phone number not provided.');
        return;
    }
    const lyrics = ((req || {}).body || {}).Body;
    if (!lyrics) {
        writeResponse(res, 404, 'text/plain', 'Lyrics not provided.');
        return;
    }

    try {
        if (!isNumberVerified(toNumber, req.body.sid)) {
            await verifyNumber(toNumber);
            console.log(`Verified: ${number}`)
            await sendSms(fromNumber, toNumber, 'Your number has been verified. Now you can send lyrics!');
            writeResponse(res, 200, 'text/plain', 'verified number');
            return;
        }
    } catch(error) {
        console.log(error);
        await sendSMS(fromNumber, toNumber, 'An error occured when verifying your number');
        writeResponse(res, 500, 'text/plain', 'Error occured during verification.');
        return;
    }

    let songResults = [];
    try {
        var response = await axios.get(`https://api.musixmatch.com/ws/1.1/track.search?q_lyrics=${lyrics}&apikey=${apiKey}`)
        let trackList = ((((response || {}).data || {}).message || {}).body || {}).track_list;
        if (trackList.length == 0) {
            await sendSMS(fromNumber, toNumber, 'Sorry we were unable to find a song result. Try different lyrics.');
            writeResponse(res, 404, 'text/plain', 'Sorry we were unable to find a song result. Try different lyrics.')
            return;
        } else {
            // Sort results by track rating.
            trackList.sort(trackCompare);
            // Grab the top 3 results.
            songResults = trackList.slice(0, 3);

            // Build text response.
            let textResponse = `Here are the top 3 results for \"${lyrics}\":\n`;
            for (let i=0; i<songResults.length; i++){
                let track = songResults[i].track;
                textResponse += `${i+1}. ${track.track_name} by ${track.artist_name}.\n`;
            }
            textResponse += "\n\n Due to the trail version, you only have access to 30% of songs."

            // Send the message to the number who sent the request!
            console.log(`From: ${fromNumber}`);
            console.log(`Body: ${lyrics}`);
            console.log(`To: ${toNumber}`);
            await sendSMS(fromNumber, toNumber, textResponse);
            writeResponse(res, 200, 'text/plain', 'message sent.');
            return;
        }
    } catch(error) {
        console.log(error);
        await sendSMS(fromNumber, toNumber, 'Sorry something went wrong.');
        writeResponse(res, 500, 'text/plain', 'Sorry something went wrong.');
        return;
    }
});

if (module === require.main) {
    const server = app.listen(process.env.PORT || 8080, () => {
        const port = server.address().port;
        console.log(`App listening on port ${port}`);
    });
}

module.exports = app;
