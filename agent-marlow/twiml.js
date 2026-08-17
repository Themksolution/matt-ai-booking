import twilio from "twilio";

// export function twiml(domain) {
//   const VoiceResponse = twilio.twiml.VoiceResponse;
//   const twiml = new VoiceResponse();

//   const connect = twiml.connect();
//   connect.stream({
//     url: `wss://${domain}/media-stream`,
//     // url: 'ws://159.223.123.144:5100/media-stream'
//   });

//   const result = twiml.toString();
//   console.log("📤 Sending TwiML:", result);
//   return result;
// }

export function twiml(domain) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  const connect = twiml.connect();
  connect.stream({
    url: `wss://${domain}/media-stream`,
    // url: 'ws://159.223.123.144:5100/media-stream'
  });

  const result = twiml.toString();
  console.log("📤 Sending TwiML:", result);
  return result;
}
