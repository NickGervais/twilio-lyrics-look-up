# twilio-lyrics-look-up
Don't you hate when you can't figure out the name of the song you're listening to?

And you're a cheap skate like me so you don't want to use your phone data to find out?

**Well, you're in luck!**

This project allows you to text lyrics to a `Twilio` phone service and it will respond with the top matching songs!

Now you know what song you're listening to and you didn't waste any of your phone data.

**You're welcome (;**

## Project Details
I am using `Twilio` to recieve and send SMS messages. 
My Twilio project will get incoming SMS messages then make a POST request to this `Node.js` API's `/sms` endpoint.
The endpoint will:
- Check if the phone number is a verified number.
- Verify the Phone number if it is not verified already.
- Make an asynchronous request to the `MusixMatch` API with the provided lyrics. 
  This will return songs that containe the provided lyrics.
- Sort the resulting songs by their track rating.
- Then respond to the user with the top 3 results.

This API is being hosted on Google Cloud Platform's App Engine service.

## Struggles
Here are some of the struggles I had with this project.
- Verification is limited on Twilio trail accounts.
- The API `MusixMatch` limits song results and lyrics on trail accounts. This lead to a 70% decrease in available songs.

## References
`Twilio` webpage https://www.twilio.com/.

`Google Cloud Platform` webpage https://cloud.google.com/.

`MusixMatch` API documentation https://developer.musixmatch.com/.
