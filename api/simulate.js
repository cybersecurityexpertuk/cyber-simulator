export default async function handler(req, res) {

 if (req.method !== "POST") {
   return res.status(405).json({ error: "Method not allowed" });
 }

 const { scenario, environment } = req.body;

 const prompt = `
Simulate a cybersecurity control failure.

Scenario: ${scenario}
Environment: ${environment}

Return JSON:

{
 "initialWeakness": "",
 "controlDrift": "",
 "missedDetection": "",
 "escalation": "",
 "impact": "",
 "lesson": ""
}
`;

 const response = await fetch("https://api.openai.com/v1/chat/completions", {
   method: "POST",
   headers: {
     "Content-Type": "application/json",
     "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
   },
   body: JSON.stringify({
     model: "gpt-4.1-mini",
     messages: [
       { role: "user", content: prompt }
     ]
   })
 });

 const data = await response.json();

 res.status(200).json(JSON.parse(data.choices[0].message.content));

}
