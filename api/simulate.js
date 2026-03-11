import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { scenario, environment } = req.body || {};

    if (!scenario || !environment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
You are a cybersecurity control failure simulator.

Return valid JSON only in this exact structure:
{
  "summary": "string",
  "failure_chain": ["step 1", "step 2", "step 3", "step 4"],
  "business_impact": "string",
  "key_controls": ["control 1", "control 2", "control 3", "control 4"]
}

Scenario: ${scenario}
Environment: ${environment}

Create a realistic cyber incident chain showing how a control weakness escalates into a wider incident.
Use plain English suitable for cybersecurity leaders.
Do not include markdown.
Do not include code fences.
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt
    });

    const text = response.output_text || "";
    const parsed = JSON.parse(text);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Simulation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
