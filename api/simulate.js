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

  return res.status(200).json({
    summary: "A temporary exception created a weakness that was not reviewed or removed.",
    failure_chain: [
      "A legacy admin account was excluded from MFA during a support workaround.",
      "The exception remained in place beyond the intended timeframe.",
      "Privileged activity monitoring did not detect the exposure promptly.",
      "An attacker used the exempt account to gain elevated access."
    ],
    business_impact: "Critical systems were disrupted and sensitive data was exposed, creating operational and reputational impact.",
    key_controls: [
      "Consistent MFA enforcement",
      "Review of temporary access exceptions",
      "Privileged account monitoring",
      "Continuous control validation"
    ]
  });
}
