import { put } from "@vercel/blob";

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
    const body = req.body || {};
    const reportId = body.report_id || ("CCFS-" + Date.now());

    if (!body.data) {
      return res.status(400).json({ error: "Missing simulation data" });
    }

    const payload = {
      created_at: new Date().toISOString(),
      report_id: reportId,
      data: body.data
    };

    const blob = await put(
      `shared-simulations/${reportId}.json`,
      JSON.stringify(payload, null, 2),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true
      }
    );

    return res.status(200).json({
      ok: true,
      report_id: reportId,
      blob_url: blob.url
    });
  } catch (error) {
    console.error("share-simulation error:", error);

    return res.status(500).json({
      error: error?.message || "Failed to save simulation",
      details: String(error)
    });
  }
}
