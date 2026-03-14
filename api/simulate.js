import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function verifyTurnstileToken(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET;

  if (!secret || !token) {
    return false;
  }

  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);

  if (remoteip) {
    formData.append("remoteip", remoteip);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();
  console.log("Turnstile response:", data);

  return data.success;
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
      turnstile_token,
      turnstileToken
    } = req.body || {};

    if (!scenario || !environment || !sector) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const remoteip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "";

    const tokenToVerify = turnstileToken || turnstile_token;
    const isHuman = await verifyTurnstileToken(tokenToVerify, remoteip);

    if (!isHuman) {
      return res.status(403).json({ error: "Turnstile verification failed" });
    }

    const prompt = `
You are a senior cybersecurity assurance specialist creating a realistic control failure simulation for a professional website tool used by CISOs, security leaders, internal audit, risk teams and boards.

Your task is to produce a realistic scenario that is:
1. operationally plausible,
2. grounded in control failure and detection weakness,
3. suitable for executive and board discussion.

Return valid JSON only in this exact structure:
{
  "summary": "string",
  "board_risk_statement": "string",
  "board_brief": "string",
  "attack_path": [
    { "phase": "string", "step": "string", "mitre": "string" },
    { "phase": "string", "step": "string", "mitre": "string" },
    { "phase": "string", "step": "string", "mitre": "string" },
    { "phase": "string", "step": "string", "mitre": "string" }
  ],
  "weak_signals": ["string", "string", "string"],
  "business_impact": "string",
  "financial_impact": {
    "currency": "string",
    "downtime_hours": "string",
    "response_cost": "string",
    "lost_revenue": "string",
    "regulatory_exposure": "string",
    "customer_remediation_cost": "string",
    "total_estimated_impact": "string"
  },
  "priority_actions": ["string", "string", "string", "string"],
  "key_controls": ["string", "string", "string", "string"],
  "control_references": {
    "cis_controls_v8": ["string", "string", "string"],
    "nist_csf_2": ["string", "string", "string"],
    "iso_27002_2022": ["string", "string", "string"]
  },
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
- Make the scenario specific to the selected environment, sector and critical service.
- Write as if this could happen in a real organisation within the next 12 months.
- Use UK English.
- Keep the summary to 2 sentences maximum.
- board_risk_statement must be a single plain-English sentence suitable for a board slide headline.
- The board_brief must be 2 to 3 sentences in plain executive language with no jargon overload.
- attack_path must reflect a realistic sequence from initial compromise to business impact.
- Each attack_path item must include:
  - phase: one of "Initial Access", "Privilege Misuse", "Lateral Movement", "Impact"
  - step: one sentence only
  - mitre: a realistic MITRE ATT&CK technique ID
- weak_signals must be observable indicators from logs, telemetry, IAM, API activity, cloud audit logs, endpoint events or service monitoring.
- business_impact must describe operational disruption, customer impact, regulatory consequences and reputational effect.
- financial_impact must be plausible for the selected sector and organisation size.
- Use the selected currency throughout financial_impact.
- total_estimated_impact must be a concise range or total figure suitable for a board slide.
- downtime_hours must be a realistic range such as "12-24 hours" or "36-72 hours".
- priority_actions must be practical first-response actions.
- key_controls must be the most relevant preventive or detective controls.
- control_references must map the scenario to recognised control frameworks.
- cis_controls_v8 should contain realistic CIS Controls v8 references such as "CIS Control 5", "CIS Control 6", "CIS Control 8", "CIS Control 13".
- nist_csf_2 should contain realistic NIST CSF 2.0 category references such as "PR.AA", "DE.CM", "ID.RA", "RS.AN", "GV.RM".
- iso_27002_2022 should contain realistic ISO/IEC 27002:2022 references such as "5.15", "5.16", "5.18", "8.15", "8.16".
- detection_opportunity must explain where the incident chain could have been detected earlier.
- assurance_questions must be practical questions leadership should ask.
- assurance_insight must explain what this reveals about control effectiveness, evidence gaps and assurance maturity.
- confidence_rating must be one of: Low, Moderate, High.
- conclusion must be concise and suitable for the end of a board-ready report.
- Avoid vague language, generic filler and repeated phrases.
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
