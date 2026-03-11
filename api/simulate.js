export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return res.status(200).json({
    initialWeakness: "Legacy admin account excluded from MFA during a support workaround.",
    controlDrift: "The temporary exception remained in place and was never reviewed.",
    missedDetection: "No alert fired because privileged identity monitoring was incomplete.",
    escalation: "An attacker used the exempt account to gain privileged access and move laterally.",
    impact: "Critical systems were disrupted and sensitive data was exposed.",
    lessons: "Review access exceptions, enforce MFA consistently, monitor privileged activity, and validate controls continuously."
  });
}
