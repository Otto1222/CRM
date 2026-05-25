/**
 * Email küldés - Gmail API Service Account alapú
 * VAGY Resend.com (egyszerűbb, ingyenes 3000/hó)
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) return res.status(400).json({ error: "Hiányos adatok" });

  // Resend.com API (ingyenes, egyszerű)
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: "RESEND_API_KEY nincs beállítva" });
  }

  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "CRM Napelem <noreply@crm-napelem.hu>",
        to: [to],
        subject,
        html,
      }),
    });
    
    const data = await result.json();
    if (!result.ok) throw new Error(data.message || "Email küldési hiba");
    return res.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[send-email]", err);
    return res.status(500).json({ error: err.message });
  }
}
