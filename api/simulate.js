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

function ensureArray(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function normaliseOutput(parsed, selectedCurrency) {
  const safeCurrency = selectedCurrency || "GBP";

  const defaults = {
    summary: "A realistic cyber scenario has been generated based on the selected context, highlighting how weak or failed controls may escalate into operational disruption, financial loss and assurance concerns.",
    board_brief: "This scenario should be treated as a material control-effectiveness discussion point for leadership, with focus on service impact, control gaps and rapid containment readiness.",
    board_risk_statement: "This scenario represents a plausible route to material operational disruption, customer harm and regulatory scrutiny if control weaknesses remain unresolved.",
    attack_path: [
      { phase: "Initial Access", step: "An initiating control weakness created an exploitable opportunity.", mitre: "T1078" },
      { phase: "Privilege Misuse", step: "The attacker or insider moved through weak access controls.", mitre: "T1098" },
      { phase: "Lateral Movement", step: "The incident chain progressed due to weak monitoring or segmentation.", mitre: "T1021" },
      { phase: "Impact", step: "Business-critical services or data became exposed to operational and regulatory risk.", mitre: "T1499" }
    ],
    weak_signals: [
      "Unusual authentication events involving privileged or service identities.",
      "Anomalous IAM, API or policy change activity outside approved change windows.",
      "Unexpected spikes in authentication failures, data access or token issuance."
    ],
    business_impact: "Operational disruption affects critical services, increases manual workarounds and creates customer harm, regulatory exposure and reputational damage.",
    financial_impact: {
      currency: safeCurrency,
      downtime_hours: "12-24 hours",
      response_cost: `${safeCurrency} 150,000 - 400,000`,
      lost_revenue: `${safeCurrency} 500,000 - 1,500,000`,
      regulatory_exposure: `${safeCurrency} 250,000 - 1,000,000`,
      customer_remediation_cost: `${safeCurrency} 100,000 - 500,000`,
      total_estimated_impact: `${safeCurrency} 1.0M - 3.0M`
    },
    priority_actions: [
      "Contain affected accounts, sessions, keys or endpoints immediately.",
      "Preserve logs and forensic evidence before remediation changes overwrite them.",
      "Confirm service impact, customer impact and regulatory notification triggers.",
      "Restore control over privileged access and revalidate monitoring coverage."
    ],
    key_controls: [
      "Privileged access management and least privilege enforcement",
      "Centralised logging with alerting on abnormal identity and control-plane activity",
      "Strong MFA and conditional access for privileged identities",
      "Regular access review, credential rotation and change control validation"
    ],
    control_framework_references: {
      cis_controls_v8: ["CIS 5", "CIS 6", "CIS 8"],
      nist_csf_2_0: ["PR.AA", "DE.CM", "RS.AN"],
      iso_iec_27002_2022: ["5.15", "5.16", "8.15"]
    },
    detection_opportunity: "Earlier detection would likely have depended on stronger monitoring of identity, audit, API and abnormal access patterns.",
    assurance_questions: [
      "Which controls were assumed to be working but were not independently validated?",
      "What fresh evidence proves containment, access revocation and recovery effectiveness?",
      "Which critical services remain exposed to repeat exploitation?",
      "Where did logging, alerting or escalation fail to surface the incident sooner?"
    ],
    assurance_insight: "The greatest risk is often not the initiating event itself, but the absence of fresh, corroborated evidence proving that key controls were operating at the point of failure.",
    confidence_rating: "Moderate",
    conclusion: "Immediate containment, validation of control failures and independently verified remediation will materially reduce residual risk and improve confidence in the organisation’s response."
  };

  return {
    summary: parsed.summary || defaults.summary,
    board_brief: parsed.board_brief || defaults.board_brief,
    board_risk_statement: parsed.board_risk_statement || defaults.board_risk_statement,
    attack_path: ensureArray(parsed.attack_path, defaults.attack_path),
    weak_signals: ensureArray(parsed.weak_signals, defaults.weak_signals),
    business_impact: parsed.business_impact || defaults.business_impact,
    financial_impact: {
      currency: parsed.financial_impact?.currency || defaults.financial_impact.currency,
      downtime_hours: parsed.financial_impact?.downtime_hours || defaults.financial_impact.downtime_hours,
      response_cost: parsed.financial_impact?.response_cost || defaults.financial_impact.response_cost,
      lost_revenue: parsed.financial_impact?.lost_revenue || defaults.financial_impact.lost_revenue,
      regulatory_exposure: parsed.financial_impact?.regulatory_exposure || defaults.financial_impact.regulatory_exposure,
      customer_remediation_cost: parsed.financial_impact?.customer_remediation_cost || defaults.financial_impact.customer_remediation_cost,
      total_estimated_impact: parsed.financial_impact?.total_estimated_impact || defaults.financial_impact.total_estimated_impact
    },
    priority_actions: ensureArray(parsed.priority_actions, defaults.priority_actions),
    key_controls: ensureArray(parsed.key_controls, defaults.key_controls),
    control_framework_references: {
      cis_controls_v8: ensureArray(parsed.control_framework_references?.cis_controls_v8, defaults.control_framework_references.cis_controls_v8),
      nist_csf_2_0: ensureArray(parsed.control_framework_references?.nist_csf_2_0, defaults.control_framework_references.nist_csf_2_0),
      iso_iec_27002_2022: ensureArray(parsed.control_framework_references?.iso_iec_27002_2022, defaults.control_framework_references.iso_iec_27002_2022)
    },
    detection_opportunity: parsed.detection_opportunity || defaults.detection_opportunity,
    assurance_questions: ensureArray(parsed.assurance_questions, defaults.assurance_questions),
    assurance_insight: parsed.assurance_insight || defaults.assurance_insight,
    confidence_rating: parsed.confidence_rating || defaults.confidence_rating,
    conclusion: parsed.conclusion || defaults.conclusion
  };
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

Return valid JSON only in this exact structure:
{
  "summary": "string",
  "board_brief": "string",
  "board_risk_statement": "string",
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
  "control_framework_references": {
    "cis_controls_v8": ["string", "string", "string"],
    "nist_csf_2_0": ["string", "string", "string"],
    "iso_iec_27002_2022": ["string", "string", "string"]
  },
  "detection_opportunity": "string",
  "assurance_questions": ["string", "string", "string", "string"],
  "assurance_insight": "string",
  "confidence_rating": "string",
  "conclusion": "string"
}

Scenario: ${scenario}
Environment: ${environment}
Sector: ${sector}
Critical service: ${critical_service || "Not provided"}
Organisation size: ${organisation_size || "Not provided"}
Currency: ${currency || "GBP"}

Requirements:
- Use UK English.
- Make the scenario realistic and suitable for executive and board discussion.
- Keep the summary to 2 sentences maximum.
- Keep board_brief to 2 to 3 sentences.
- board_risk_statement must be a single sentence suitable for a board slide.
- Each attack_path item must include:
  - phase: one of "Initial Access", "Privilege Misuse", "Lateral Movement", "Impact"
  - step: one sentence only
  - mitre: a realistic MITRE ATT&CK technique ID
- weak_signals must be observable indicators from logs, telemetry, IAM, API activity, cloud audit logs, endpoint events or service monitoring.
- financial_impact must be plausible and use the selected currency.
- key_controls must be practical and relevant.
- control_framework_references must include only realistic mappings.
- For CIS Controls v8 use entries like "CIS 5", "CIS 6", "CIS 8", "CIS 13".
- For NIST CSF 2.0 use entries like "PR.AA", "DE.CM", "ID.RA", "RS.AN", "GV.RM".
- For ISO/IEC 27002:2022 use entries like "5.15", "5.16", "5.18", "8.15", "8.16", "8.23".
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

    const finalOutput = normaliseOutput(parsed, currency || "GBP");
    return res.status(200).json(finalOutput);
  } catch (error) {
    console.error("Simulation error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
