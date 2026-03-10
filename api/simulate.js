import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { organisation, scenario, environment } = req.body || {};

    if (!organisation || !scenario || !environment) {
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

Organisation: ${organisation}
Scenario: ${scenario}
Environment: ${environment}

Create a realistic, concise cyber incident simulation showing how control weaknesses cascade into a larger incident.
Use plain English suitable for cybersecurity leaders.
Do not include markdown fences.
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt
    });

    const text = response.output_text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      return res.status(500).json({
        error: "Model returned invalid JSON",
        raw: text
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Simulation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
