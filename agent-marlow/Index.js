import Fastify from "fastify";
import dotenv from "dotenv";
import WebSocket from "ws";
import fastifyWs from "@fastify/websocket";
import fastifyFormBody from "@fastify/formbody";
import twilio from "twilio";
import { twiml as generateTwiml } from "./twiml.js";
import OpenAI from "openai";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "url";
import path from "path";
import { MongoClient } from "mongodb";
import {
  BUSINESS_GREETING,
  BUSINESS_NAME,
  FAQ_ENTRIES,
} from "./config/marlowFaq.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "matt_project";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env");
  process.exit(1);
}

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  OPENAI_API_KEY,
  DOMAIN,
  LIVE_AGENT_NUMBER,
  PORT = 5100,
} = process.env;

const VOICE = "shimmer";
const REALTIME_MODEL = "gpt-realtime-1.5";

const mongoClient = new MongoClient(MONGODB_URI);

let mongoDb;
let callsCollection;

const connectMongoDB = async () => {
  try {
    await mongoClient.connect();
    mongoDb = mongoClient.db(MONGODB_DB_NAME);
    callsCollection = mongoDb.collection("calls");
    console.log(`MongoDB connected to database: ${MONGODB_DB_NAME}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

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
  root: path.join(__dirname, "public"),
  prefix: "/",
});

const callSessions = {};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "can",
  "do",
  "for",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "we",
  "what",
  "when",
  "where",
  "who",
  "with",
  "you",
  "your",
]);

const normalizeText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value = "") =>
  normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));

const phraseIncludes = (
  haystack,
  phrase
) =>
  haystack.includes(
    normalizeText(phrase)
  );

const findBestFaqMatch = (question = "") => {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = new Set(tokenize(question));

  if (!normalizedQuestion || !questionTokens.size) {
    return {
      found: false,
      answer: null,
      source: null,
      faqId: null,
    };
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of FAQ_ENTRIES) {
    let score = 0;
    let keywordHits = 0;

    for (const keyword of entry.keywords || []) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) {
        continue;
      }

      if (
        phraseIncludes(
          normalizedQuestion,
          normalizedKeyword
        )
      ) {
        keywordHits += 1;
        score += normalizedKeyword.includes(" ") ? 5 : 3;
      }
    }

    for (const token of tokenize(entry.question)) {
      if (questionTokens.has(token)) {
        score += 1;
      }
    }

    for (const token of questionTokens) {
      if (
        tokenize(entry.question).includes(
          token
        )
      ) {
        score += 1;
      }
    }

    if (
      keywordHits === 0 &&
      score < 4
    ) {
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (!bestMatch || bestScore < 5) {
    return {
      found: false,
      answer: null,
      source: null,
      faqId: null,
    };
  }

  return {
    found: true,
    answer: bestMatch.answer,
    source: bestMatch.question,
    faqId: bestMatch.id,
  };
};

const createTransferTwiml = (destinationNumber) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.dial(
    {
      answerOnBridge: true,
    },
    destinationNumber
  );
  return response.toString();
};

const reconnectWebSocket = (
  ws,
  url,
  options = {}
) => {
  const reconnectDelay = 5000;

  ws.on("close", () => {
    console.log("WebSocket closed. Attempting to reconnect...");

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
    console.error("WebSocket error:", error);
    ws.close();
  });
};

fastify.get("/", async () => ({
  message: "Incoming call AI Phase 2 server running.",
}));

fastify.get("/scripts", (req, res) =>
  res.send([])
);

fastify.post("/voice", async (req, reply) => {
  const incomingCallSid = req.body.CallSid;

  callSessions[incomingCallSid] = {
    FROM_NUMBER: req.body.From,
    TO_NUMBER: req.body.To,
    createdAt: Date.now(),
  };

  try {
    const twimlResponse = generateTwiml(DOMAIN);

    reply
      .header("Content-Type", "text/xml")
      .send(twimlResponse);
  } catch (err) {
    console.error("Error in /voice route:", err);
    reply.status(500).send("Server Error");
  }
});

fastify.register(async function (fastifyInstance) {
  fastifyInstance.get(
    "/media-stream",
    { websocket: true },
    async (conn) => {
      console.log("Twilio WebSocket connected");

      const today = new Date();

      const wsContext = {
        SYSTEM_TAG: "A",
        FROM_NUMBER: "",
        TO_NUMBER: "",
        firstTimer: Date.now(),
        secondTimer: null,
        durationString: "",
        callSid: "",
        streamSid: "",
        dateNow: today.toLocaleDateString(
          "en-US",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        ),
        timeNow: today.toLocaleTimeString(),
        faqMatched: false,
        faqEscalated: false,
        appointmentRequested: false,
        transferRequested: false,
        transferSucceeded: false,
        lastToolUsed: "",
        lastFaqId: "",
      };

      let aiWs;

      try {
        aiWs = new WebSocket(
          `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`,
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
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
          "Failed to connect to OpenAI WebSocket:",
          err
        );
        return;
      }

      let assistantIsSpeaking = false;
      let waitingForTurnToFinish = false;
      let toolCallBuffer = "";

      const sendAssistantFollowUp = (
        instruction
      ) => {
        if (
          !instruction ||
          aiWs.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        setTimeout(() => {
          aiWs.send(
            JSON.stringify({
              type: "response.create",
              response: {
                instructions: instruction,
                output_modalities: [
                  "audio",
                ],
              },
            })
          );
        }, 500);
      };

      const initSession = () => {
        try {
          if (
            aiWs.readyState !==
            WebSocket.OPEN
          ) {
            console.error(
              "Skipping session init because OpenAI WebSocket is not open."
            );
            return;
          }

          aiWs.send(
            JSON.stringify({
              type: "session.update",
              session: {
                type: "realtime",
                audio: {
                  input: {
                    format: {
                      type: "audio/pcmu",
                    },
                    turn_detection: {
                      type: "server_vad",
                    },
                  },
                  output: {
                    format: {
                      type: "audio/pcmu",
                    },
                    voice: VOICE,
                  },
                },
                // Business-specific answers must come from the FAQ source rather than
                // model knowledge so the voice agent does not invent company information.
                instructions: `You are a short, calm phone receptionist for ${BUSINESS_NAME}.

The caller has already heard the opening audio greeting. Continue naturally from there.

Rules:
- Keep phone responses brief, warm, and direct.
- Speak clearly and naturally for a phone call, with short sentences and no hype.
- Most answers should be one short sentence. Use two short sentences only when needed.
- If the caller asks a business-specific question about pricing, policies, location, services, process, availability, booking details, qualifications, hours, or company details, call get_faq_answer before answering.
- The FAQ source is authoritative. Do not answer business-specific questions from your own knowledge.
- If get_faq_answer returns found false, do not guess or improvise. Say exactly: "Transferring your call, hold back." Then call transfer_to_live_agent.
- If the caller explicitly asks for a person, agent, representative, or human help, say exactly: "Transferring your call, hold back." Then call transfer_to_live_agent immediately.
- If the caller asks to book, schedule, reserve, or make an appointment, call request_appointment.
- Appointment booking is under development. Do not invent availability, time slots, or confirmations.
- You may answer small conversational questions naturally, such as who you are, but do not invent business facts that are not in the FAQ.
- Ask at most one short follow-up question only when it is genuinely needed to understand the caller's request.
- Never mention tools, APIs, the FAQ file, function calls, or internal logic.`,
                output_modalities: [
                  "audio",
                ],
                tool_choice: "auto",
                tools: [
                  {
                    type: "function",
                    name: "get_faq_answer",
                    description:
                      "Retrieve a business answer from the Marlow Boating FAQ source. Use this for business-specific questions instead of answering from general model knowledge.",
                    parameters: {
                      type: "object",
                      properties: {
                        question: {
                          type: "string",
                          description:
                            "The caller's business question in plain language.",
                        },
                      },
                      required: [
                        "question",
                      ],
                    },
                  },
                  {
                    type: "function",
                    name: "request_appointment",
                    description:
                      "Handle appointment and booking requests while the real appointment API is not connected yet.",
                    parameters: {
                      type: "object",
                      properties: {
                        request: {
                          type: "string",
                          description:
                            "The caller's appointment or booking request in plain language.",
                        },
                      },
                      required: [
                        "request",
                      ],
                    },
                  },
                  {
                    type: "function",
                    name: "transfer_to_live_agent",
                    description:
                      "Transfer the active caller to the configured live agent when they ask for a human or when the FAQ cannot answer reliably.",
                    parameters: {
                      type: "object",
                      properties: {
                        reason: {
                          type: "string",
                          description:
                            "Short reason for the transfer request, such as human_request or faq_unavailable.",
                        },
                      },
                      required: [
                        "reason",
                      ],
                    },
                  },
                ],
              },
            })
          );

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
                    text: BUSINESS_GREETING,
                  },
                ],
              },
            })
          );

          aiWs.send(
            JSON.stringify({
              type: "response.create",
            })
          );

          console.log(
            "Session initialized with OpenAI."
          );
        } catch (err) {
          console.error(
            "Error during session.init:",
            err
          );
        }
      };

      aiWs.on("open", () => {
        console.log(
          "Connected to OpenAI realtime."
        );
        setTimeout(initSession, 100);
      });

      aiWs.on(
        "message",
        async (msg) => {
          try {
            const res = JSON.parse(msg);

            if (
              res.type ===
                "response.output_audio.delta" &&
              res.delta
            ) {
              assistantIsSpeaking = true;

              conn.socket.send(
                JSON.stringify({
                  event: "media",
                  streamSid:
                    wsContext.streamSid,
                  media: {
                    // OpenAI already returns base64-encoded PCMU chunks here.
                    // Passing them through directly avoids mangling Twilio media payloads.
                    payload:
                      res.delta,
                  },
                })
              );
            }

            if (
              res.type ===
              "response.output_audio.done"
            ) {
              assistantIsSpeaking = false;
              waitingForTurnToFinish = false;
              console.log(
                "OpenAI response completed."
              );
            }

            if (
              res.type ===
              "conversation.turn.started"
            ) {
              console.log(
                "User started speaking"
              );

              if (
                assistantIsSpeaking &&
                !waitingForTurnToFinish &&
                aiWs.readyState ===
                  WebSocket.OPEN
              ) {
                console.log(
                  "Stopping assistant due to user turn..."
                );

                aiWs.send(
                  JSON.stringify({
                    type: "response.stop",
                  })
                );

                waitingForTurnToFinish = true;
              }
            }

            if (
              res.type ===
              "conversation.turn.stopped"
            ) {
              console.log(
                "User turn ended, generating response..."
              );

              waitingForTurnToFinish = false;

              if (
                aiWs.readyState ===
                WebSocket.OPEN
              ) {
                aiWs.send(
                  JSON.stringify({
                    type:
                      "response.create",
                  })
                );
              }
            }

            if (
              res.type ===
                "response.output_audio_transcript.done" &&
              res.transcript
            ) {
              assistantIsSpeaking = false;
              waitingForTurnToFinish = false;
              console.log(
                `OpenAI said: ${res.transcript}`
              );
            }

            if (
              res.type ===
              "response.function_call_arguments.delta"
            ) {
              if (res.delta) {
                toolCallBuffer += res.delta;
                console.log(
                  "Tool call buffer updated:",
                  toolCallBuffer
                );
              }
            }

            if (
              res.type ===
              "response.function_call_arguments.done"
            ) {
              const toolResult =
                await handleFunctionCall(
                  res,
                  toolCallBuffer,
                  conn,
                  wsContext
                );

              const toolCallId =
                res.call_id ||
                res.item?.call_id ||
                res.function_call?.call_id;

              toolCallBuffer = "";

              if (
                toolCallId &&
                aiWs.readyState ===
                  WebSocket.OPEN
              ) {
                aiWs.send(
                  JSON.stringify({
                    type:
                      "conversation.item.create",
                    item: {
                      type:
                        "function_call_output",
                      call_id:
                        toolCallId,
                      output:
                        JSON.stringify(
                          toolResult.output
                        ),
                    },
                  })
                );
              }

              if (
                toolResult.skipFollowUp
              ) {
                return;
              }

              sendAssistantFollowUp(
                toolResult.responseInstruction
              );
            }
          } catch (err) {
            console.error(
              "Error parsing OpenAI message:",
              err
            );
          }
        }
      );

      conn.socket.on("message", (msg) => {
        try {
          const data = JSON.parse(msg);

          if (data.event === "start") {
            wsContext.streamSid =
              data.start.streamSid;
            wsContext.callSid =
              data.start.callSid;

            console.log(
              "Twilio stream started:",
              wsContext.streamSid
            );

            const sessionVars =
              callSessions[
                wsContext.callSid
              ];

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
            "Error handling Twilio WS message:",
            err
          );
        }
      });

      conn.socket.on(
        "close",
        async () => {
          console.log(
            "Twilio WebSocket disconnected."
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

          if (durationInSeconds < 60) {
            wsContext.durationString =
              `${durationInSeconds} second${durationInSeconds !== 1 ? "s" : ""}`;
          } else {
            const minutes = Math.floor(
              durationInSeconds / 60
            );
            const seconds =
              durationInSeconds % 60;

            wsContext.durationString =
              `${minutes} minute${minutes !== 1 ? "s" : ""}`;

            if (seconds > 0) {
              wsContext.durationString +=
                ` ${seconds} second${seconds !== 1 ? "s" : ""}`;
            }
          }

          await saveCallRecord(wsContext);
          delete callSessions[wsContext.callSid];
        }
      );

      aiWs.on(
        "close",
        (code, reasonBuffer) => {
          const reason =
            reasonBuffer?.toString?.() ||
            "";

          console.log(
            "OpenAI WebSocket closed:",
            {
              code,
              reason,
            }
          );
        }
      );

      aiWs.on("error", (error) =>
        console.error(
          "OpenAI WebSocket error:",
          error
        )
      );
    }
  );

  fastifyInstance.get(
    "/openai/status",
    async (req, reply) => {
      try {
        const response =
          await openai.responses.create({
            model: "gpt-4.1",
            input:
              "Reply with exactly: OpenAI API is working.",
            max_output_tokens: 20,
          });

        return reply.send({
          success: true,
          status: "active",
          message:
            "OpenAI API successfully answered the test question.",
          answer:
            response.output_text?.trim(),
        });
      } catch (error) {
        console.error(
          "OpenAI test failed:",
          error
        );

        return reply
          .code(error?.status || 500)
          .send({
            success: false,
            status:
              error?.status === 401
                ? "invalid_key"
                : error?.status === 429
                  ? "credits_or_rate_limit"
                  : "error",
            message:
              error?.message ||
              "OpenAI API request failed.",
          });
      }
    }
  );
});

async function saveCallRecord(context) {
  try {
    const mongoRecord = {
      TFN: context.FROM_NUMBER || "Null",
      Intent: context.lastToolUsed || "general",
      Industry: "Boating",
      Company: BUSINESS_NAME,
      Script_tag: context.SYSTEM_TAG,
      FAQ_Matched: context.faqMatched,
      FAQ_Escalated: context.faqEscalated,
      Appointment_Requested:
        context.appointmentRequested,
      Transfer_Requested:
        context.transferRequested,
      Transfer_Succeeded:
        context.transferSucceeded,
      Duration: context.durationString,
    };

    const result =
      await callsCollection.insertOne(
        mongoRecord
      );

    console.log(
      "MongoDB call record inserted:",
      {
        id: result.insertedId,
        ...mongoRecord,
      }
    );
  } catch (err) {
    console.error(
      "MongoDB insert failed:",
      err.message
    );
  }
}

async function transferLiveCall(
  context,
  conn
) {
  context.transferRequested = true;
  context.lastToolUsed =
    "transfer_to_live_agent";

  if (!LIVE_AGENT_NUMBER) {
    console.error(
      "LIVE_AGENT_NUMBER is not configured."
    );

    return {
      output: {
        transferred: false,
        reason: "missing_configuration",
      },
      responseInstruction:
        "Tell the caller briefly that call transfer is not available right now and ask them to call back shortly.",
      skipFollowUp: false,
    };
  }

  if (!context.callSid) {
    console.error(
      "Cannot transfer call without an active Call SID."
    );

    return {
      output: {
        transferred: false,
        reason: "missing_call_sid",
      },
      responseInstruction:
        "Tell the caller briefly that call transfer is not available right now and ask them to call back shortly.",
      skipFollowUp: false,
    };
  }

  try {
    // Twilio must update the currently active call rather than creating
    // a second outbound call so the live transfer stays on the same call SID.
    await twilioClient
      .calls(context.callSid)
      .update({
        twiml: createTransferTwiml(
          LIVE_AGENT_NUMBER
        ),
      });

    context.transferSucceeded = true;

    console.log(
      "Live agent transfer succeeded for call:",
      context.callSid
    );

    setTimeout(() => {
      if (
        conn?.socket?.readyState ===
        WebSocket.OPEN
      ) {
        conn.socket.close();
      }
    }, 1000);

    return {
      output: {
        transferred: true,
        destination:
          LIVE_AGENT_NUMBER,
      },
      responseInstruction: null,
      skipFollowUp: true,
    };
  } catch (error) {
    console.error(
      "Live agent transfer failed:",
      error.message
    );

    return {
      output: {
        transferred: false,
        reason: "transfer_failed",
      },
      responseInstruction:
        "Tell the caller briefly that call transfer is not available right now and ask them to call back shortly.",
      skipFollowUp: false,
    };
  }
}

async function handleFunctionCall(
  res,
  toolCallBuffer,
  conn,
  context
) {
  const functionName =
    res.name ||
    res.function_call?.name;

  const parsed =
    toolCallBuffer?.trim()
      ? JSON.parse(toolCallBuffer)
      : {};

  console.log(
    "Function called:",
    functionName,
    parsed
  );

  if (
    functionName ===
    "get_faq_answer"
  ) {
    context.lastToolUsed =
      "get_faq_answer";

    const result =
      findBestFaqMatch(
        parsed.question
      );

    context.faqMatched = result.found;
    context.lastFaqId =
      result.faqId || "";

    console.log(
      "FAQ tool called. Answer found:",
      result.found
    );

    if (!result.found) {
      context.faqEscalated = true;
    }

    return {
      output: result,
      // Unknown FAQ questions must transfer rather than improvise answers.
      responseInstruction: result.found
        ? "Answer the caller in one short sentence using only the returned FAQ answer. If a very short follow-up is necessary, ask only one brief question."
        : 'Say exactly: "Transferring your call, hold back." Then call transfer_to_live_agent with reason "faq_unavailable".',
      skipFollowUp: false,
    };
  }

  if (
    functionName ===
    "request_appointment"
  ) {
    context.appointmentRequested = true;
    context.lastToolUsed =
      "request_appointment";

    console.log(
      "Appointment requested."
    );

    return {
      output: {
        status: "pending_api",
        request:
          parsed.request || "",
      },
      // Appointment booking currently only returns a controlled pending state
      // so callers are not given fake availability or false confirmations.
      responseInstruction:
        'Say exactly: "Appointment booking is under development right now."',
      skipFollowUp: false,
    };
  }

  if (
    functionName ===
    "transfer_to_live_agent"
  ) {
    console.log(
      "Transfer requested."
    );

    return transferLiveCall(
      context,
      conn,
      parsed.reason
    );
  }

  return {
    output: {
      status: "unhandled_tool",
      name: functionName,
    },
    responseInstruction:
      "Tell the caller briefly that you are sorry and ask how else you can help.",
    skipFollowUp: false,
  };
}

const startServer = async () => {
  try {
    await connectMongoDB();

    const address =
      await fastify.listen({
        host: "0.0.0.0",
        port: PORT,
      });

    console.log(
      `Server ready at ${address}`
    );
  } catch (err) {
    console.error(
      "Server failed to start:",
      err
    );

    await mongoClient
      .close()
      .catch(() => {});

    process.exit(1);
  }
};

startServer();
