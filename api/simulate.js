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
    const {
      scenario,
      environment,
      sector,
      critical_service,
      organisation_size
    } = req.body || {};

    if (!scenario || !environment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
You are a senior cybersecurity assurance specialist creating a realistic control failure simulation for a website visitor.

Return valid JSON only in this exact structure:
{
  "summary": "string",
  "attack_path": [
    { "step": "string", "mitre": "string" },
    { "step": "string", "mitre": "string" },
    { "step": "string", "mitre": "string" },
    { "step": "string", "mitre": "string" }
  ],
  "weak_signals": ["string", "string", "string"],
  "business_impact": "string",
  "priority_actions": ["string", "string", "string", "string"],
  "key_controls": ["string", "string", "string", "string"]
}

Scenario: ${scenario}
Environment: ${environment}
Sector: ${sector || "Not provided"}
Critical service: ${critical_service || "Not provided"}
Organisation size: ${organisation_size || "Not provided"}

Requirements:
- Make the simulation specific to the selected scenario, environment, sector and critical service.
- Keep the summary to 2 sentences maximum.
- Keep each attack path step to 1 sentence only.
- Include a realistic MITRE ATT&CK technique ID where appropriate, for example T1566, T1078, T1021, T1003.
- Weak signals must be observable by security or IT teams.
- Business impact must be plausible and concrete.
- Priority actions must be practical first-response actions.
- Key controls must be preventative or detective controls that would materially reduce risk.
- Avoid generic wording and repeated phrases.
- Do not include markdown.
- Do not include code fences.
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
      console.error("JSON parse error:", parseError);
      console.error("Raw model output:", text);
      return res.status(500).json({
        error: "Model returned invalid JSON"
      });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Simulation error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
