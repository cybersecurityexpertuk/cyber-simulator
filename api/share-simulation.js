import { put } from "@vercel/blob";

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function sanitiseReportId(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 80);
}

function buildReportId() {
  const now = new Date();
  const timestamp =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    "-" +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0");
  const random = Math.floor(Math.random() * 900 + 100);
  return `CCFS-${timestamp}-${random}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = parseBody(req.body);
    const incomingReportId = sanitiseReportId(body.report_id);
    const reportId = incomingReportId || buildReportId();

    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return res.status(400).json({ error: "Missing or invalid simulation data" });
    }

    const payload = {
      created_at: new Date().toISOString(),
      report_id: reportId,
      version: "1.1",
      source: "Cyber Control Failure Simulator",
      data: body.data
    };

    const payloadString = JSON.stringify(payload, null, 2);
    const payloadBytes = Buffer.byteLength(payloadString, "utf8");

    if (payloadBytes > 1024 * 1024) {
      return res.status(413).json({
        error: "Simulation payload is too large to save"
      });
    }

    const blob = await put(
      `shared-simulations/${reportId}.json`,
      payloadString,
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: false,
        token: process.env.BLOB_READ_WRITE_TOKEN || process.env.PUBLIC_BLOB_READ_WRITE_TOKEN
      }
    );

    const shareUrl =
      "https://www.cybersecurityexpert.co.uk/sim-report?url=" +
      encodeURIComponent(blob.url);

    return res.status(200).json({
      ok: true,
      report_id: reportId,
      blob_url: blob.url,
      share_url: shareUrl
    });
  } catch (error) {
    console.error("share-simulation error:", error);

    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Failed to save simulation";

    return res.status(500).json({
      error: message
    });
  }
}
