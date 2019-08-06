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

app.get('/', (req, res) => {
    res.status(200).send("This is the lyrics to song SMS machine!");
})

app.post('/sms', async (req, res) => {
    const apiKey = secrets.musixmatchApiKey;
    let songResults = [];
    try {
        const lyrics = req.body.Body;
        axios.get(`https://api.musixmatch.com/ws/1.1/track.search?q_lyrics=${lyrics}&apikey=${apiKey}`)
            .then(response => {
                let trackList = ((((response || {}).data || {}).message || {}).body || {}).track_list;
                if (trackList.length == 0) {
                    twilioClient.messages
                    .create({
                        body: 'Sorry we were unable to find a song result. Try a different lyric.',
                        from: '+19528005414',
                        to: req.body.From
                    })
                    .then(message => {
                        console.log(message.sid);
                        res.status(404).send('Sorry We were unable to find and song results');
                    });
                    res.status(404).send('Sorry We were unable to find and song results');
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
                    twilioClient.messages
                    .create({
                        body: textResponse,
                        from: '+19528005414',
                        to: req.body.From
                    })
                    .then(message => {
                        console.log(message.sid);
                        res.status(200).send(req.body);
                    });
                }
            })
            .catch(error => {
                console.log(error);
                twilioClient.messages
                .create({
                    body: 'Sorry, something went wrong',
                    from: '+19528005414',
                    to: req.body.From
                })
                .then(message => {
                    console.log(message.sid);
                    res.status(500).send('Sorry, something went wrong');
                });
            });
    } catch(error) {
        console.log(error);
        res.status(500).send('Sorry, something went wrong');
    }
});

if (module === require.main) {
    const server = app.listen(process.env.PORT || 8080, () => {
        const port = server.address().port;
        console.log(`App listening on port ${port}`);
    });
}

module.exports = app;
