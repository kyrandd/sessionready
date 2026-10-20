// Inschrijving als tester. Stuurt een melding naar SessionReady via Brevo.
// Instellen in Vercel (Settings > Environment Variables):
//   BREVO_API_KEY   sleutel van brevo.com
//   MAIL_AFZENDER   bv. "SessionReady <noreply@sessionready.be>" (domein bevestigd in Brevo)
//   MELDING_NAAR    het adres dat de inschrijvingen ontvangt, bv. info@sessionready.be
const teken = (v, max) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ fout: "alleen POST" });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const naam = teken(b.naam, 80),
    email = teken(b.email, 120),
    club = teken(b.club, 80),
    leeftijd = teken(b.leeftijd, 40),
    land = b.land === "Nederland" ? "Nederland" : "België";
  if (!naam || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || b.akkoord !== true)
    return res.status(400).json({ fout: "ongeldige gegevens" });

  const { BREVO_API_KEY, MAIL_AFZENDER, MELDING_NAAR } = process.env;
  if (!BREVO_API_KEY || !MAIL_AFZENDER || !MELDING_NAAR)
    return res.status(503).json({ fout: "mail nog niet ingesteld" });

  const m = /^(.*)<(.+)>$/.exec(MAIL_AFZENDER);
  const afzender = m ? { name: m[1].trim(), email: m[2].trim() } : { email: MAIL_AFZENDER };
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: afzender,
      to: [{ email: MELDING_NAAR }],
      replyTo: { email, name: naam },
      subject: `Nieuwe tester: ${naam} (${land})`,
      textContent: `Naam: ${naam}\nE-mail: ${email}\nClub: ${club || "-"}\nLeeftijd ploeg: ${leeftijd || "-"}\nLand: ${land}\nToestemming: ja\nDatum: ${new Date().toISOString()}`,
    }),
  });
  if (!r.ok) return res.status(502).json({ fout: "mail mislukt" });
  return res.status(200).json({ ok: true });
}
