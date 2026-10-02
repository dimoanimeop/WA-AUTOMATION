
const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION;

const faqs = [
  {
    keywords: ["admission", "admissions", "प्रवेश"],
    answer: "Admissions enquiry: Please share the student's class and our school team can assist you."
  },
  {
    keywords: ["fees", "fee", "फीस"],
    answer: "For current fee details, please contact the school office."
  },
  {
    keywords: ["timing", "timings", "time", "समय"],
    answer: "Please contact the school office for the current school timings."
  },
  {
    keywords: ["location", "address", "पता"],
    answer: "Saarthi Play Public School, Alipur, Delhi 110036."
  },
  {
    keywords: ["hello", "hi", "hey", "नमस्ते"],
    answer: "Hello! Welcome to Saarthi Play Public School. How can we help you?\n\n1. Admissions\n2. Fees\n3. School timings\n4. Address\n\nType your question to get started."
  }
];

function getReply(message) {
  const text = message.toLowerCase().trim();

  for (const faq of faqs) {
    if (faq.keywords.some(keyword => text.includes(keyword))) {
      return faq.answer;
    }
  }

  return "Thank you for contacting Saarthi Play Public School!\nPlease ask about admissions, fees, school timings, or our address. For other questions, please contact the school office.";
}

// Meta uses this endpoint to verify your webhook.
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token &&
    token === VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Receive incoming WhatsApp messages.
app.post("/webhook", async (req, res) => {
  // Acknowledge the webhook promptly.
  res.sendStatus(200);

  try {
    const entries = req.body.entry || [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const messages = value.messages || [];

        for (const message of messages) {
          // This first version handles text messages only.
          if (message.type !== "text") continue;

          const sender = message.from;
          const incomingText = message.text?.body || "";
          const reply = getReply(incomingText);

          const response = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: sender,
                type: "text",
                text: { body: reply }
              })
            }
          );

          if (!response.ok) {
            console.error("WhatsApp API error:", await response.text());
          }
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error.message);
  }
});

app.get("/", (req, res) => {
  res.send("WhatsApp FAQ Bot server is running.");
});

app.listen(PORT, () => {
  console.log(`FAQ bot listening on port ${PORT}`);
});
