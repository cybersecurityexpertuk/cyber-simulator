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

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  return !!data.success;
}

function ensureArray(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function ensureObject(value, fallback) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function normaliseOutput(parsed, selectedCurrency, scenario, environment, sector, criticalService, organisationSize) {
  const safeCurrency = selectedCurrency || "GBP";
  const scenarioText = scenario || "selected scenario";
  const environmentText = environment || "selected environment";
  const sectorText = sector || "selected sector";
  const serviceText = criticalService || "affected service";
  const sizeText = organisationSize || "selected organisation size";

  const defaults = {
    summary:
      "A realistic cyber scenario has been generated based on the selected context, highlighting how weak or failed controls may escalate into operational disruption, financial loss and assurance concerns.",
    board_brief:
      "This scenario should be treated as a material control-effectiveness discussion point for leadership, with focus on service impact, control gaps and rapid containment readiness.",
    board_risk_statement:
      "This scenario represents a plausible route to material operational disruption, customer harm and regulatory scrutiny if control weaknesses remain unresolved.",
    severity: "High",
    likelihood: "Moderate",
    attack_path: [
      {
        phase: "Initial Access",
        step: "An initiating control weakness created an exploitable opportunity.",
        mitre: "T1078"
      },
      {
        phase: "Privilege Misuse",
        step: "The attacker or insider moved through weak access controls.",
        mitre: "T1098"
      },
      {
        phase: "Lateral Movement",
        step: "The incident chain progressed due to weak monitoring or segmentation.",
        mitre: "T1021"
      },
      {
        phase: "Impact",
        step: "Business-critical services or data became exposed to operational and regulatory risk.",
        mitre: "T1499"
      }
    ],
    weak_signals: [
      "Unusual authentication events involving privileged or service identities.",
      "Anomalous IAM, API or policy change activity outside approved change windows.",
      "Unexpected spikes in authentication failures, data access or token issuance."
    ],
    business_impact:
      "Operational disruption affects critical services, increases manual workarounds and creates customer harm, regulatory exposure and reputational damage.",
    financial_impact: {
      currency: safeCurrency,
      downtime_hours: "12-24",
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
    evidence_to_request: [
      `Privileged access review evidence for ${serviceText}`,
      `Audit and activity logs covering ${scenarioText} indicators in the ${environmentText}`,
      "MFA and conditional access policy evidence, including exported settings or screenshots",
      "Administrative change evidence, including IAM, API or control-plane configuration history",
      `Incident timeline and containment records for the ${sectorText} scenario under review`,
      "SIEM or alert rule evidence showing how anomalous activity would be detected"
    ],
    detection_opportunity:
      "Earlier detection would likely have depended on stronger monitoring of identity, audit, API and abnormal access patterns.",
    detection_time: "6-24 hours depending on monitoring maturity",
    assurance_questions: [
      "Which controls were assumed to be working but were not independently validated?",
      "What fresh evidence proves containment, access revocation and recovery effectiveness?",
      "Which critical services remain exposed to repeat exploitation?",
      "Where did logging, alerting or escalation fail to surface the incident sooner?"
    ],
    assurance_insight:
      "The greatest risk is often not the initiating event itself, but the absence of fresh, corroborated evidence proving that key controls were operating at the point of failure.",
    confidence_rating: "Moderate",
    conclusion:
      "Immediate containment, validation of control failures and independently verified remediation will materially reduce residual risk and improve confidence in the organisation’s response.",
    adversary_profile: {
      likely_actor: "Financially motivated threat actor",
      motivation: `Exploit weak controls in the ${environmentText} supporting ${serviceText} to cause disruption, extract value, or gain unauthorised access.`,
      typical_entry_methods: [
        "Abuse of weak authentication, privileged access, or exposed services",
        "Credential phishing, token theft, or exploitation of misconfiguration",
        "Use of trusted accounts or administrative pathways to avoid early detection"
      ],
      typical_behaviours: [
        "Privilege escalation after initial foothold",
        "Movement into business-critical systems or data stores",
        "Attempts to avoid detection by blending into normal operational activity"
      ]
    },
    control_weakness_map: [
      {
        domain: "Identity and Access Management",
        weakness: `Weak identity or privileged access controls may have enabled compromise of ${serviceText}.`,
        risk: "High"
      },
      {
        domain: "Security Logging and Monitoring",
        weakness: "Detection coverage may be incomplete for abnormal access, administrative changes, or control-plane activity.",
        risk: "High"
      },
      {
        domain: "Incident Response and Recovery",
        weakness: "Containment and recovery readiness may not be supported by fresh, independently validated evidence.",
        risk: "Moderate"
      }
    ],
    drift_to_fix: {
      detect: "12 hours",
      contain: "8 hours",
      recover: "24 hours",
      verify: "10 hours",
      total: "54 hours"
    }
  };

  const financialImpact = ensureObject(parsed.financial_impact, {});
  const frameworkRefs = ensureObject(parsed.control_framework_references, {});
  const adversaryProfile = ensureObject(parsed.adversary_profile, {});
  const driftToFix = ensureObject(parsed.drift_to_fix, {});

  return {
    summary: parsed.summary || defaults.summary,
    board_brief: parsed.board_brief || defaults.board_brief,
    board_risk_statement: parsed.board_risk_statement || defaults.board_risk_statement,
    severity: parsed.severity || defaults.severity,
    likelihood: parsed.likelihood || defaults.likelihood,
    attack_path: ensureArray(parsed.attack_path, defaults.attack_path),
    weak_signals: ensureArray(parsed.weak_signals, defaults.weak_signals),
    business_impact: parsed.business_impact || defaults.business_impact,
    financial_impact: {
      currency: financialImpact.currency || defaults.financial_impact.currency,
      downtime_hours: financialImpact.downtime_hours || defaults.financial_impact.downtime_hours,
      response_cost: financialImpact.response_cost || defaults.financial_impact.response_cost,
      lost_revenue: financialImpact.lost_revenue || defaults.financial_impact.lost_revenue,
      regulatory_exposure: financialImpact.regulatory_exposure || defaults.financial_impact.regulatory_exposure,
      customer_remediation_cost:
        financialImpact.customer_remediation_cost || defaults.financial_impact.customer_remediation_cost,
      total_estimated_impact:
        financialImpact.total_estimated_impact || defaults.financial_impact.total_estimated_impact
    },
    priority_actions: ensureArray(parsed.priority_actions, defaults.priority_actions),
    key_controls: ensureArray(parsed.key_controls, defaults.key_controls),
    control_framework_references: {
      cis_controls_v8: ensureArray(
        frameworkRefs.cis_controls_v8,
        defaults.control_framework_references.cis_controls_v8
      ),
      nist_csf_2_0: ensureArray(
        frameworkRefs.nist_csf_2_0,
        defaults.control_framework_references.nist_csf_2_0
      ),
      iso_iec_27002_2022: ensureArray(
        frameworkRefs.iso_iec_27002_2022,
        defaults.control_framework_references.iso_iec_27002_2022
      )
    },
    evidence_to_request: ensureArray(parsed.evidence_to_request, defaults.evidence_to_request),
    detection_opportunity: parsed.detection_opportunity || defaults.detection_opportunity,
    detection_time: parsed.detection_time || defaults.detection_time,
    assurance_questions: ensureArray(parsed.assurance_questions, defaults.assurance_questions),
    assurance_insight: parsed.assurance_insight || defaults.assurance_insight,
    confidence_rating: parsed.confidence_rating || defaults.confidence_rating,
    conclusion: parsed.conclusion || defaults.conclusion,
    adversary_profile: {
      likely_actor: adversaryProfile.likely_actor || defaults.adversary_profile.likely_actor,
      motivation: adversaryProfile.motivation || defaults.adversary_profile.motivation,
      typical_entry_methods: ensureArray(
        adversaryProfile.typical_entry_methods,
        defaults.adversary_profile.typical_entry_methods
      ),
      typical_behaviours: ensureArray(
        adversaryProfile.typical_behaviours,
        defaults.adversary_profile.typical_behaviours
      )
    },
    control_weakness_map: ensureArray(parsed.control_weakness_map, defaults.control_weakness_map),
    drift_to_fix: {
      detect: driftToFix.detect || defaults.drift_to_fix.detect,
      contain: driftToFix.contain || defaults.drift_to_fix.contain,
      recover: driftToFix.recover || defaults.drift_to_fix.recover,
      verify: driftToFix.verify || defaults.drift_to_fix.verify,
      total: driftToFix.total || defaults.drift_to_fix.total
    },
    simulation_context: {
      scenario: scenarioText,
      environment: environmentText,
      sector: sectorText,
      critical_service: serviceText,
      organisation_size: sizeText,
      currency: safeCurrency
    }
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
You are a senior cybersecurity assurance specialist and second-line control effectiveness reviewer.

Create a realistic cyber control failure simulation for a website visitor.

Your response must be VALID JSON ONLY.
Do not include markdown.
Do not include commentary outside the JSON.
Do not wrap the JSON in code fences.

Return JSON in this exact structure:
{
  "summary": "string",
  "board_brief": "string",
  "board_risk_statement": "string",
  "severity": "Low | Moderate | High | Critical",
  "likelihood": "Low | Moderate | High",
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
  "evidence_to_request": ["string", "string", "string", "string", "string", "string"],
  "detection_opportunity": "string",
  "detection_time": "string",
  "assurance_questions": ["string", "string", "string", "string"],
  "assurance_insight": "string",
  "confidence_rating": "Low | Moderate | High",
  "conclusion": "string",
  "adversary_profile": {
    "likely_actor": "string",
    "motivation": "string",
    "typical_entry_methods": ["string", "string", "string"],
    "typical_behaviours": ["string", "string", "string"]
  },
  "control_weakness_map": [
    { "domain": "string", "weakness": "string", "risk": "Low | Moderate | High | Critical" },
    { "domain": "string", "weakness": "string", "risk": "Low | Moderate | High | Critical" },
    { "domain": "string", "weakness": "string", "risk": "Low | Moderate | High | Critical" }
  ],
  "drift_to_fix": {
    "detect": "string",
    "contain": "string",
    "recover": "string",
    "verify": "string",
    "total": "string"
  }
}

Requirements:
- Be realistic and specific to the scenario, environment, sector, critical service, and organisation size.
- Focus on control effectiveness, not generic threat commentary.
- Make the board_brief concise, executive-friendly, and commercially aware.
- Make the board_risk_statement sound credible and serious but not sensationalist.
- The attack_path must describe a plausible progression from initiating weakness to business impact.
- MITRE values should be common ATT&CK technique IDs where appropriate.
- weak_signals should be subtle early indicators, not obvious post-incident facts.
- business_impact must mention operational, customer, regulatory, or reputational implications where relevant.
- financial ranges must be plausible for the organisation context and use the selected currency.
- priority_actions must be immediate and practical.
- key_controls must identify the most relevant preventive, detective, and response controls.
- evidence_to_request must sound like second-line assurance evidence requests.
- assurance_questions must help an assurance reviewer challenge assumptions.
- assurance_insight must explain what this scenario reveals about evidence, validation, or control reliability.
- adversary_profile must reflect the most plausible type of actor and how they are likely to behave.
- control_weakness_map must identify control domains, the likely weakness, and the approximate risk level.
- drift_to_fix must estimate the time from detection to containment, recovery, and verification in a plausible way.
- detection_time should be concise and plausible.
- confidence_rating should reflect how well the scenario fits known patterns and the selected context.
- Use UK English spelling.
- Avoid hype and avoid vague buzzwords.
- Make the content suitable for a board-facing cyber resilience simulation report.

Context:
Scenario: ${scenario}
Environment: ${environment}
Sector: ${sector}
Critical service: ${critical_service || "Not provided"}
Organisation size: ${organisation_size || "Not provided"}
Currency: ${currency || "GBP"}
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

    const finalOutput = normaliseOutput(
      parsed,
      currency || "GBP",
      scenario,
      environment,
      sector,
      critical_service,
      organisation_size
    );

    return res.status(200).json(finalOutput);
  } catch (error) {
    console.error("Simulation error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
