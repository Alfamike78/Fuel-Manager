import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function sendInviteEmail({ to, inviterName, companyName, inviteLink, role }) {
  const roleLabel = role === 'admin' ? 'Amministratore' : 'Operatore';

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Sei stato invitato a ${companyName} su Fuel Manager`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
        <div style="background:#1e40af;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">✈️ Fuel Manager</h1>
        </div>

        <h2 style="color:#111827;font-size:18px;margin-bottom:8px;">Sei stato invitato!</h2>
        <p style="color:#374151;line-height:1.6;">
          <strong>${inviterName}</strong> ti ha invitato a unirti a <strong>${companyName}</strong>
          come <strong>${roleLabel}</strong> su Fuel Manager.
        </p>

        <div style="text-align:center;margin:32px 0;">
          <a href="${inviteLink}"
             style="background:#1e40af;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;display:inline-block;">
            Accetta l'invito
          </a>
        </div>

        <p style="color:#6b7280;font-size:13px;line-height:1.5;">
          Il link scade tra 7 giorni. Se non ti aspettavi questo invito puoi ignorare questa email.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:12px;text-align:center;">Fuel Manager · PilotCraft Solutions</p>
      </div>
    `,
  });
}

export async function sendTankAlertEmail({ to, companyName, tankName, tankCode, levelLiters, thresholdLiters, capacityLiters, severity }) {
  const pct = ((levelLiters / capacityLiters) * 100).toFixed(1);
  const isCritical = severity === 'critical';
  const accentColor = isCritical ? '#dc2626' : '#d97706';
  const emoji = isCritical ? '🚨' : '⚠️';
  const label = isCritical ? 'CRITICO' : 'ATTENZIONE';

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${emoji} ${label}: Cisterna ${tankName} (${tankCode}) sotto soglia — ${companyName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
        <div style="background:#1e40af;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">✈️ Fuel Manager</h1>
        </div>

        <div style="background:${accentColor};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <h2 style="color:#fff;margin:0;font-size:16px;">${emoji} Cisterna sotto soglia — ${label}</h2>
        </div>

        <p style="color:#374151;line-height:1.6;">
          La cisterna <strong>${tankName} (${tankCode})</strong> dell'azienda <strong>${companyName}</strong>
          ha superato la soglia minima.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr style="background:#f3f4f6;">
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:600;">Livello attuale</td>
            <td style="padding:12px 16px;color:${accentColor};font-weight:700;font-size:16px;">${levelLiters.toFixed(0)} L (${pct}%)</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:600;">Soglia minima</td>
            <td style="padding:12px 16px;color:#374151;font-weight:600;">${thresholdLiters.toFixed(0)} L</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;font-weight:600;">Capacità totale</td>
            <td style="padding:12px 16px;color:#374151;">${capacityLiters.toFixed(0)} L</td>
          </tr>
        </table>

        <p style="color:#374151;line-height:1.6;">
          Accedi a Fuel Manager per pianificare un rifornimento.
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:12px;text-align:center;">Fuel Manager · PilotCraft Solutions</p>
      </div>
    `,
  });
}
