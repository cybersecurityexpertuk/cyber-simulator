export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { url } = req.query || {};

    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(404).json({ error: "Simulation not found" });
    }

    const json = await response.json();
    return res.status(200).json(json);
  } catch (error) {
    console.error("get-shared-simulation error:", error);
    return res.status(500).json({ error: "Failed to load simulation" });
  }
}
