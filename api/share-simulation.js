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

    const payload = {
      created_at: new Date().toISOString(),
      report_id: reportId,
      data: body.data || {}
    };

    const pathname = `shared-simulations/${reportId}.json`;

    const blob = await put(
      pathname,
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
      pathname: pathname,
      blob_url: blob.url
    });
  } catch (error) {
    console.error("share-simulation error:", error);
    return res.status(500).json({ error: "Failed to save simulation" });
  }
}
