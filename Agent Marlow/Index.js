import Fastify from "fastify";
import dotenv from "dotenv";
import WebSocket from "ws";
import fastifyWs from "@fastify/websocket";
import fastifyFormBody from "@fastify/formbody";
import twilio from "twilio";
import { twiml as generateTwiml } from "./twiml.js";
import OpenAI from "openai";
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';

dotenv.config();

import path from "path";
import { MongoClient } from "mongodb";

// Note: Airtable script fetching/updating removed per request.
// If you need to re-enable later, re-add Airtable configuration here.

// MongoDB configuration
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "matt_project";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env");
  process.exit(1);
}

const mongoClient = new MongoClient(MONGODB_URI);

let mongoDb;
let callsCollection;

const connectMongoDB = async () => {
  try {
    await mongoClient.connect();

    mongoDb = mongoClient.db(MONGODB_DB_NAME);
    callsCollection = mongoDb.collection("calls");

    console.log(`✅ MongoDB connected to database: ${MONGODB_DB_NAME}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  OPENAI_API_KEY,
  DOMAIN,
  PORT = 5100,
} = process.env;

// const VOICE = "sage";
// const VOICE = "echo";
// const VOICE = "fable";
// const VOICE = "verse";
// const VOICE = "nova";
const VOICE = "shimmer";

let COMPANY_NAME = "";
let SUMMARY = "";
let TOP_INTENT = "";
let SYSTEM_TAG = "";
let SYSTEM_MESSAGE = "";
let FROM_NUMBER = "";
let TO_NUMBER = "";
let firstTimer = "";
let secondTimer = "";
let durationString = "";
let callSid = "";
let dateNow = "";
let timeNow = "";

const LOG_EVENTS = [
  "session.created",
  "response.audio.delta",
  "response.content.done",
  "error",
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("🚀 Starting server setup...");

const fastify = Fastify();

fastify.register(fastifyFormBody);
fastify.register(fastifyWs);

const twilioClient = twilio(
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

fastify.get("/", async () => {
  return {
    message: "Incoming call AI Phase 2 server running."
  };
});

// Script fetching/selection removed — scripts are no longer fetched from remote.

//   selectScriptForCall()

fastify.get("/scripts", (req, res) => {
  // Script listing disabled — returning empty array.
  return res.send([]);
});

const callSessions = {};

fastify.post("/voice", async (req, reply) => {

  // Create a context object for this call
  const callSid = req.body.CallSid;

  callSessions[callSid] = {

    FROM_NUMBER: req.body.From,

    TO_NUMBER: req.body.To,

    // Add other variables you want to share
    createdAt: Date.now(),

  };

  try {

    //callContext.firstTimer = Date.now();

    const twimlResponse = generateTwiml(DOMAIN);

    reply
      .header("Content-Type", "text/xml")
      .send(twimlResponse);

    // You may want to persist callContext somewhere if needed for later
    // For example, in-memory map or DB keyed by callSid

  } catch (err) {

    console.error(
      "❌ Error in /voice route:",
      err
    );

    reply
      .status(500)
      .send("Server Error");
  }
});

const reconnectWebSocket = (
  ws,
  url,
  options = {}
) => {

  const reconnectDelay = 5000;

  ws.on("close", () => {

    console.log(
      "❌ WebSocket closed. Attempting to reconnect..."
    );

    setTimeout(() => {

      const newWs = new WebSocket(
        url,
        options
      );

      reconnectWebSocket(
        newWs,
        url,
        options
      );

    }, reconnectDelay);

  });

  ws.on("error", (error) => {

    console.error(
      "❌ WebSocket error:",
      error
    );

    ws.close();

  });
};

fastify.register(async function (fastify) {

  fastify.get(
    "/media-stream",
    { websocket: true },
    async (conn) => {

      console.log(
        "🔌 Twilio WebSocket connected"
      );

      // Create a context object for this WebSocket session
      const wsContext = {

        COMPANY_NAME: "",

        SUMMARY: "",

        TOP_INTENT: "",

        SYSTEM_TAG: "A",

        SYSTEM_MESSAGE: "",

        FROM_NUMBER: "",

        TO_NUMBER: "",

        firstTimer: Date.now(),

        secondTimer: null,

        durationString: "",

        callSid: "",

        dateNow: "",

        timeNow: "",

      };

      //const scriptResult = await selectScriptForCall();
      //wsContext.SYSTEM_TAG = scriptResult.tag;
      //wsContext.SYSTEM_MESSAGE = scriptResult.message;

      const todaysDate = new Date();

      wsContext.dateNow =
        todaysDate.toLocaleDateString(
          "en-US",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        );

      wsContext.timeNow =
        todaysDate.toLocaleTimeString();

      let aiWs;

      try {

        aiWs = new WebSocket(
          "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03",
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "realtime=v1",
            },
          }
        );

        /*reconnectWebSocket(
          aiWs,
          "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17",
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "OpenAI-Beta": "realtime=v1",
            },
          }
        );*/

      } catch (err) {

        console.error(
          "❌ Failed to connect to OpenAI WebSocket:",
          err
        );

        return;
      }

      let streamSid = null;

      let assistantIsSpeaking = false;

      let waitingForTurnToFinish = false;

      const initSession = () => {

        try {

          aiWs.send(
            JSON.stringify({

              type: "session.update",

              session: {

                turn_detection: {
                  type: "server_vad"
                },

                input_audio_format:
                  "g711_ulaw",

                output_audio_format:
                  "g711_ulaw",

                voice: VOICE,

                instructions: `CALL FLOW: Company Name → Intent → Misdial Check → End Call

STEP 1 — COMPANY NAME (MANDATORY):
Politely ask: "Which company are you trying to reach?"

Accept only specific and clearly stated company names.

Do not proceed if the name is missing, vague, or generic (e.g., "not sure", "don’t know", "unknown", etc.).

If unclear, say: "Sorry, I need the exact company name before I can assist."

If the user asks “Who is this?” or “What is this about?” — you may say:
"I'm a digital assistant."

STEP 2 — USER INTENT:
Once a valid company name is received, ask:
"What’s the reason for your call today?" or
"How can I help you with [COMPANY_NAME]?"

CALL store_call_info function immediately with the company name and user intent (optional).

STEP 3 — MISDIAL HANDLING:
After identifying both company and intent, say clearly:
"It seems you may have misdialed the [COMPANY_NAME] number."

Then wrap up the call with something like:
"This line will now disconnect. Please check the number and try again."

After that, call the handle_misdial function immediately to end the call.

BEHAVIOR GUIDELINES:

Keep responses short and focused, but not robotic.

You may respond to simple human questions (like “who is this?”) to keep it natural.

Don’t guess or assume — only act on what the user says.

Do not loop or repeat unless user asks.

Maintain a calm, neutral tone at all times.

`,

                modalities: [
                  "text",
                  "audio"
                ],

                tool_choice: "auto",

                tools: [

                  {
                    type: "function",

                    name: "store_call_info",

                    description: `Call this function to log the caller’s intended company and the reason for calling. The function should be called immediately after both the company name (required) and user intent (optional) are identified. The intent should be a single lowercase snake_case word representing the user's intent, like "support", "sales", "billing", etc. If the intent is not clear, it can be left as null. The company name is required and must be a specific, clearly stated name. Do not accept vague or generic values like "unknown", "unspecified", etc.`,

                    parameters: {

                      type: "object",

                      properties: {

                        intent: {

                          type: "string",

                          description:
                            "The caller's reason for calling, formatted as a lowercase snake_case word.",

                        },

                        company_name: {

                          type: "string",

                          description:
                            "Name of the company mentioned or implied in the message.",

                        },

                      },

                      required: [
                        "company_name",
                        "intent"
                      ],

                    },

                  },

                  {

                    type: "function",

                    name: "handle_misdial",

                    description:
                      "Call this immediately after telling the caller they misdialed.",

                    parameters: {

                      type: "object",

                      properties: {},

                      required: []

                    },

                  },

                ],

              },

            })
          );

          // ✅ Use realistic user-style message instead of a system instruction

          aiWs.send(
            JSON.stringify({

              type:
                "conversation.item.create",

              item: {

                type: "message",

                role: "user",

                content: [

                  {

                    type: "input_text",

                    text:
                      "Ask caller about the company name he is trying to reach",

                  },

                ],

              },

            })
          );

          // Trigger assistant response
          aiWs.send(
            JSON.stringify({
              type: "response.create"
            })
          );

          console.log(
            "✅ Session initialized with OpenAI."
          );

        } catch (err) {

          console.error(
            "❌ Error during session.init:",
            err
          );

        }

      };

      aiWs.on("open", () => {

        console.log(
          "✅ Connected to OpenAI realtime."
        );

        setTimeout(
          initSession,
          100
        );

        /*setTimeout(() => {
          if (aiWs && aiWs.readyState === WebSocket.OPEN) {
            console.log("⏱️ 45 seconds passed. Closing OpenAI WebSocket...");
            aiWs.close();
          }
          if (conn.socket && conn.socket.readyState === WebSocket.OPEN) {
            conn.socket.send(JSON.stringify({ event: "stop" }));
            console.log("Sent 'stop' to Twilio to end call.");
            twilioClient
              .calls(callSid)
              .update({ status: "completed" })
              .then((call) => console.log("✅ Call ended."))
              .catch((err) => console.error("❌ Error:", err));
          }
        }, 60000);*/

      });

      let toolCallBuffer = "";

      aiWs.on(
        "message",
        async (msg) => {

          try {

            const res = JSON.parse(msg);

            if (false) //LOG_EVENTS.includes(res.type))
              if (res.type) {

                // console.log("📥 OpenAI Event:", res.type);

                console.log(
                  "📥 OpenAI Event:",
                  res
                );

              }

            if (
              res.type ===
                "response.audio.delta" &&
              res.delta
            ) {

              assistantIsSpeaking = true;

              const audio = {

                event: "media",

                streamSid,

                media: {

                  payload:
                    Buffer.from(
                      res.delta,
                      "base64"
                    ).toString("base64"),

                },

              };

              conn.socket.send(
                JSON.stringify(audio)
              );

            }

            if (
              res.type ===
              "response.content.done"
            ) {

              assistantIsSpeaking = false;

              waitingForTurnToFinish =
                false;

              console.log(
                "✅ OpenAI response completed."
              );

            }

            if (
              res.type ===
              "conversation.turn.started"
            ) {

              console.log(
                "🗣️ User started speaking"
              );

              if (
                assistantIsSpeaking &&
                !waitingForTurnToFinish &&
                aiWs.readyState ===
                  WebSocket.OPEN
              ) {

                console.log(
                  "🛑 Stopping assistant due to user turn..."
                );

                aiWs.send(
                  JSON.stringify({
                    type:
                      "response.stop"
                  })
                );

                waitingForTurnToFinish =
                  true;

              }

            }

            if (
              res.type ===
              "conversation.turn.stopped"
            ) {

              console.log(
                "✅ User turn ended, generating response..."
              );

              waitingForTurnToFinish =
                false;

              if (
                aiWs.readyState ===
                WebSocket.OPEN
              ) {

                aiWs.send(
                  JSON.stringify({
                    type:
                      "response.create"
                  })
                );

              }

            }

            if (
              res.type ===
                "response.content_part.done" &&
              res.part?.transcript
            ) {

              assistantIsSpeaking =
                false;

              waitingForTurnToFinish =
                false;

              console.log(
                `OpenAI said: ${res.part.transcript}`
              );

            }

            if (
              res.type ===
              "response.function_call_arguments.delta"
            ) {

              if (res.delta) {

                toolCallBuffer +=
                  res.delta;

                console.log(
                  "📦 Tool call buffer updated:",
                  toolCallBuffer
                );

              } else {

                console.log(
                  "csbsjkcb not working"
                );

              }

            }

            //         if (res.type === "response.function_call_arguments.done") {
            //           console.log("✅ Assistant is calling function with args:");
            //           try {
            //             const functionName = res.name || res.function_call?.name;
            //             console.log("📌 Function called:", functionName);

            //             const parsed = JSON.parse(toolCallBuffer);
            //             console.log("📦 Parsed args:", parsed);

            //             toolCallBuffer = "";

            //             console.log("............................");

            //             if (functionName === "classify_intent") {
            //               let { intent, company_name } = parsed;
            //               if (typeof intent === "undefined") {
            //                 intent = null;
            //               }

            //               if (!TOP_INTENT) {
            //                 TOP_INTENT = intent;
            //                 console.log("Saved user intent:", intent);
            //               } else {
            //                 console.log("Intent already saved:", TOP_INTENT);
            //               }

            //               if (!COMPANY_NAME) {
            //                 COMPANY_NAME = company_name;
            //                 console.log("new company name saved", COMPANY_NAME)
            //                 const response = await openai.responses.create({
            //                   model: "gpt-4.1",
            //                   tools: [{ type: "web_search_preview" }],
            //                   input: `Search online for "${COMPANY_NAME}" and return ONLY the single most relevant high-level industry or category it belongs to. 
            // Respond with ONE term only — like: Software, Healthcare, Retail, Finance, etc. 
            // Do NOT list multiple categories. Do NOT explain. Do NOT include any other text. 
            // Respond with a SINGLE TERM ONLY.`,
            //                 });

            //                 const summary = response.output_text?.trim();
            //                 SUMMARY = summary;

            //                 console.log("Saved company name:", company_name);
            //               } else {
            //                 console.log("Using the old company name", COMPANY_NAME)

            //                 //                 const response = await openai.responses.create({
            //                 //                   model: "gpt-4.1",
            //                 //                   tools: [{ type: "web_search_preview" }],
            //                 //                   input: `Search online for "${COMPANY_NAME}" and return a short summary including what the company does and its industry or category. 
            //                 // The output should be concise and factual, like: "MK Solutions is a software company that specializes in business automation and AI."`,
            //                 //                 });

            //                 //                 const summary = response.output_text?.trim();
            //                 //                 SUMMARY = summary;

            //                 //                 console.log("Saved old company name:", COMPANY_NAME);

            //                 const response = await openai.responses.create({
            //                   model: "gpt-4.1",
            //                   tools: [{ type: "web_search_preview" }],
            //                   input: `Search online for "${COMPANY_NAME}" and return ONLY the single most relevant high-level industry or category it belongs to. 
            // Respond with ONE term only — like: Software, Healthcare, Retail, Finance, etc. 
            // Do NOT list multiple categories. Do NOT explain. Do NOT include any other text. 
            // Respond with a SINGLE TERM ONLY.`,
            //                 });

            //                 const industry = response.output_text?.trim();
            //                 SUMMARY = industry;

            //                 console.log("Saved old company name:", COMPANY_NAME);
            //                 console.log("Detected industry:", SUMMARY);
            //               }
            //             } else if (functionName === "handle_misdial") {
            //               console.log("🚨 Misdial function was called");
            //               setTimeout(() => {
            //                 if (conn && conn.socket && conn.socket.readyState === 1) {
            //                   console.log("🔌 Closing WebSocket due to misdial.");
            //                   conn.socket.close();
            //                 }
            //               }, 5000);
            //             }
            //           } catch (err) {
            //             console.error("❌ Failed to parse function args:", toolCallBuffer);
            //           }
            //         }

            if (
              res.type ===
              "response.function_call_arguments.done"
            ) {

              console.log(
                "✅ Assistant is calling function with args:"
              );

              handleFunctionCall(
                res,
                toolCallBuffer,
                conn,
                wsContext
              ).catch(console.error);

              console.log(
                "📦 Tool call buffer reset."
              );

              toolCallBuffer = "";

              const functionName =
                res.name ||
                res.function_call?.name;

              if (
                functionName ===
                "handle_misdial"
              ) {

                return;

              }

              // Decide next step based on context

              let nextInstruction = "";

              if (
                wsContext.COMPANY_NAME &&
                wsContext.TOP_INTENT
              ) {

                //nextInstruction = `You have the company name and intent. Proceed to misdial handling: tell the caller they may have misdialed, then wrap up the call.`;

                nextInstruction =
                  `Say: "It seems you may have misdialed the ${wsContext.COMPANY_NAME} number. This line will now disconnect. Please check the number and try again." Then, CALL the handle_misdial function immediately.`;

              } else if (
                wsContext.COMPANY_NAME &&
                !wsContext.TOP_INTENT
              ) {

                nextInstruction =
                  `You have the company name. Ask the caller for the reason for their call (intent).`;

                return;

              } else {

                nextInstruction =
                  `Ask the caller for the company name they are trying to reach.`;

              }

              setTimeout(() => {

                aiWs.send(
                  JSON.stringify({

                    type:
                      "response.create",

                    response: {

                      instructions:
                        nextInstruction,

                      modalities: [
                        "text",
                        "audio"
                      ],

                      //tool_choice: wsContext.COMPANY_NAME && wsContext.TOP_INTENT ? "handle_misdial" : "auto"

                    }

                  })
                );

              }, 1000);

            }

          } catch (err) {

            console.error(
              "❌ Error parsing OpenAI message:",
              err
            );

          }

        }
      );

      conn.socket.on(
        "message",
        (msg) => {

          try {

            const data =
              JSON.parse(msg);

            if (
              data.event === "start"
            ) {

              streamSid =
                data.start.streamSid;

              console.log(
                "▶️ Twilio stream started:",
                streamSid
              );

              callSid =
                data.start.callSid;

              const sessionVars =
                callSessions[callSid];

              if (sessionVars) {

                wsContext.FROM_NUMBER =
                  sessionVars.FROM_NUMBER;

                wsContext.TO_NUMBER =
                  sessionVars.TO_NUMBER;

              }

            }

            if (
              data.event === "media" &&
              aiWs.readyState ===
                WebSocket.OPEN
            ) {

              aiWs.send(
                JSON.stringify({

                  type:
                    "input_audio_buffer.append",

                  audio:
                    data.media.payload,

                })
              );

            }

          } catch (err) {

            console.error(
              "❌ Error handling Twilio WS message:",
              err
            );

          }

        }
      );

      conn.socket.on(
        "close",
        async () => {

          console.log(
            "❌ Twilio WebSocket disconnected."
          );

          if (
            aiWs.readyState ===
            WebSocket.OPEN
          ) {

            aiWs.close();

          }

          wsContext.secondTimer =
            Date.now();

          const durationInSeconds =
            Math.floor(
              (
                wsContext.secondTimer -
                wsContext.firstTimer
              ) / 1000
            );

          if (
            durationInSeconds < 60
          ) {

            durationString =
              `${durationInSeconds} second${durationInSeconds !== 1 ? "s" : ""}`;

          } else {

            const minutes =
              Math.floor(
                durationInSeconds / 60
              );

            const seconds =
              durationInSeconds % 60;

            durationString =
              `${minutes} minute${minutes !== 1 ? "s" : ""}`;

            if (seconds > 0) {

              durationString +=
                ` ${seconds} second${seconds !== 1 ? "s" : ""}`;

            }

          }

          const anonFunc =
            async () => {

              await new Promise(
                resolve =>
                  setTimeout(
                    resolve,
                    5000
                  )
              );

              if (
                wsContext.COMPANY_NAME
              ) {

                try {

                  const mongoRecord = {

                    TFN:
                      wsContext.FROM_NUMBER,

                    Intent:
                      wsContext.TOP_INTENT,

                    Industry:
                      wsContext.SUMMARY,

                    Company:
                      wsContext.COMPANY_NAME,

                    Script_tag:
                      wsContext.SYSTEM_TAG,

                  };

                  const result =
                    await callsCollection.insertOne(
                      mongoRecord
                    );

                  console.log(
                    "✅ MongoDB call record inserted:",
                    {
                      id:
                        result.insertedId,

                      ...mongoRecord,
                    }
                  );

                } catch (err) {

                  console.error(
                    "❌ MongoDB insert failed:",
                    err.message
                  );

                }

                // Script success tracking disabled — not updating remote script records.
                console.log(
                  "ℹ️ Script success tracking disabled; would have incremented Success for tag:",
                  SYSTEM_TAG
                );

                TOP_INTENT = "";
                SYSTEM_TAG = "";
                SYSTEM_MESSAGE = "";
                FROM_NUMBER = "";
                firstTimer = "";
                secondTimer = "";
                durationString = "";
                callSid = "";
                dateNow = "";
                timeNow = "";
                TO_NUMBER = "";
                COMPANY_NAME = "";
                SUMMARY = "";

              } else {

                try {

                  const mongoRecord = {

                    TFN:
                      wsContext.FROM_NUMBER,

                    Intent:
                      "Null",

                    Industry:
                      "Null",

                    Company:
                      "Null",

                    Script_tag:
                      wsContext.SYSTEM_TAG,

                  };

                  const result =
                    await callsCollection.insertOne(
                      mongoRecord
                    );

                  console.log(
                    "✅ MongoDB call record inserted:",
                    {
                      id:
                        result.insertedId,

                      ...mongoRecord,
                    }
                  );

                } catch (err) {

                  console.error(
                    "❌ MongoDB insert failed:",
                    err.message
                  );

                }

                console.log(
                  "⚠️ No intent detected."
                );

                // Script failure tracking disabled — not updating remote script records.
                console.log(
                  "ℹ️ Script failure tracking disabled; would have incremented Failed for tag:",
                  wsContext.SYSTEM_TAG
                );

                TOP_INTENT = "";
                SYSTEM_TAG = "";
                SYSTEM_MESSAGE = "";
                FROM_NUMBER = "";
                firstTimer = "";
                secondTimer = "";
                durationString = "";
                callSid = "";
                dateNow = "";
                timeNow = "";
                TO_NUMBER = "";
                COMPANY_NAME = "";
                SUMMARY = "";

              }

            };

          anonFunc().catch(
            console.error
          );

        }
      );

      aiWs.on(
        "close",
        () =>
          console.log(
            "❌ OpenAI WebSocket closed."
          )
      );

      aiWs.on(
        "error",
        (e) =>
          console.error(
            "❌ OpenAI WebSocket error:",
            e
          )
      );

    }
  );


fastify.get("/openai/status", async (req, reply) => {
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: "Reply with exactly: OpenAI API is working.",
      max_output_tokens: 20,
    });

    const answer = response.output_text?.trim();

    return reply.send({
      success: true,
      status: "active",
      message: "OpenAI API successfully answered the test question.",
      answer,
    });

  } catch (error) {
    console.error("❌ OpenAI test failed:", error);

    return reply.code(error?.status || 500).send({
      success: false,
      status: error?.status === 401
        ? "invalid_key"
        : error?.status === 429
        ? "credits_or_rate_limit"
        : "error",
      message: error?.message || "OpenAI API request failed.",
    });
  }
});
});

async function handleFunctionCall(
  res,
  toolCallBufferLocal,
  conn,
  context
) {

  console.log(
    "✅ Assistant is calling function with args:"
  );

  const functionName =
    res.name ||
    res.function_call?.name;

  console.log(
    "📌 Function called:",
    functionName
  );

  const parsed =
    JSON.parse(
      toolCallBufferLocal
    );

  console.log(
    "📦 Parsed args:",
    parsed
  );

  console.log(
    "............................"
  );

  if (
    functionName ===
    "store_call_info"
  ) {

    let {
      intent,
      company_name
    } = parsed;

    if (
      typeof intent ===
      "undefined"
    ) {

      intent = null;

    }

    if (
      !context.TOP_INTENT
    ) {

      context.TOP_INTENT =
        intent;

      console.log(
        "Saved user intent:",
        intent
      );

    } else {

      console.log(
        "Intent already saved:",
        context.TOP_INTENT
      );

    }

    if (
      !context.COMPANY_NAME
    ) {

      context.COMPANY_NAME =
        company_name;

      console.log(
        "new company name saved",
        context.COMPANY_NAME
      );

      const response =
        await openai.responses.create(
          {
            model: "gpt-4.1",

            tools: [
              {
                type:
                  "web_search_preview"
              }
            ],

            input: `Search online for "${context.COMPANY_NAME}" and return ONLY the single most relevant high-level industry or category it belongs to. 
Respond with ONE term only — like: Software, Healthcare, Retail, Finance, etc. 
Do NOT list multiple categories. Do NOT explain. Do NOT include any other text. 
Respond with a SINGLE TERM ONLY.`,

          }
        );

      context.SUMMARY =
        response.output_text?.trim();

      console.log(
        "Saved company name:",
        context.COMPANY_NAME
      );

    } else {

      console.log(
        "Using the old company name",
        context.COMPANY_NAME
      );

      const response =
        await openai.responses.create(
          {
            model: "gpt-4.1",

            tools: [
              {
                type:
                  "web_search_preview"
              }
            ],

            input: `Search online for "${context.COMPANY_NAME}" and return ONLY the single most relevant high-level industry or category it belongs to. 
Respond with ONE term only — like: Software, Healthcare, Retail, Finance, etc. 
Do NOT list multiple categories. Do NOT explain. Do NOT include any other text. 
Respond with a SINGLE TERM ONLY.`,

          }
        );

      context.SUMMARY =
        response.output_text?.trim();

      console.log(
        "Detected industry:",
        context.SUMMARY
      );

    }

  } else if (
    functionName ===
    "handle_misdial"
  ) {

    console.log(
      "🚨 Misdial function was called"
    );

    setTimeout(
      () => {

        if (
          conn?.socket?.readyState ===
          WebSocket.OPEN
        ) {

          console.log(
            "🔌 Closing WebSocket due to misdial."
          );

          conn.socket.close();

        }

      },
      6500
    );

  }

}

const startServer = async () => {

  try {

    await connectMongoDB();

    const address =
      await fastify.listen(
        {
          host: "0.0.0.0",
          port: PORT,
        }
      );

    console.log(
      `🚀 Server ready at ${address}`
    );

  } catch (err) {

    console.error(
      "❌ Server failed to start:",
      err
    );

    await mongoClient
      .close()
      .catch(() => {});

    process.exit(1);

  }

};

startServer();