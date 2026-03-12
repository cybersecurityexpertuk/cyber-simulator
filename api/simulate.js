import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function verifyTurnstileToken(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret || !token) {
    return false;
  }

  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);

  if (remoteip) {
    formData.append("remoteip", remoteip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  return !!data.success;
}

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
      organisation_size,
      currency,
      turnstileToken
    } = req.body || {};

    if (!scenario || !environment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const remoteip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "";

    const isHuman = await verifyTurnstileToken(turnstileToken, remoteip);

    if (!isHuman) {
      return res.status(403).json({ error: "Turnstile verification failed" });
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
  "key_controls": ["string", "string", "string", "string"],
  "control_references": ["string", "string", "string"],
  "detection_opportunity": "string",
  "assurance_questions": ["string", "string", "string", "string"],
  "assurance_insight": "string",
  "confidence_rating": "string",
  "conclusion": "string"
}

Scenario: ${scenario}
Environment: ${environment}
Sector: ${sector || "Not provided"}
Critical service: ${critical_service || "Not provided"}
Organisation size: ${organisation_size || "Not provided"}
Currency: ${currency || "GBP"}

Requirements:
- Make the simulation specific to the selected scenario, environment, sector and critical service.
- Keep the summary to 2 sentences maximum.
- Keep each attack path step to 1 sentence only.
- Include a realistic MITRE ATT&CK technique ID where appropriate, for example T1566, T1078, T1021, T1003, T1530, T1105.
- Weak signals must be observable by security or IT teams and should reference likely telemetry such as authentication logs, IAM activity, API activity, endpoint telemetry, audit logs or network traffic.
- Business impact must be plausible and concrete.
- Where financial impact is included, express it in the selected currency and make it plausible for the selected sector, service and organisation size.
- Priority actions must be practical first-response actions.
- Key controls must be preventative or detective controls that would materially reduce risk.
- Control references should include recognised best-practice control references such as CIS Controls v8, NIST CSF 2.0 categories, or ISO/IEC 27002 controls where relevant.
- Detection opportunity must explain where the organisation could realistically have detected the incident chain earlier.
- Assurance questions must be practical questions a security, audit or technology leadership team should ask.
- Assurance insight must explain what this scenario reveals about control effectiveness and assurance.
- Confidence rating must be one of: Low, Moderate, High.
- Conclusion must provide a concise closing statement suitable for the end of the report.
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
