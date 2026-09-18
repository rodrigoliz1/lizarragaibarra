type EmailDetail = { label: string; value: string | undefined };

type TransactionalEmailContent = {
  eyebrow: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  details?: EmailDetail[];
  action?: { label: string; url: string };
  notice?: string;
};

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

export function renderTransactionalEmail(content: TransactionalEmailContent) {
  const details = (content.details ?? []).filter(
    (detail): detail is { label: string; value: string } =>
      Boolean(detail.value),
  );
  const notice =
    content.notice ??
    "La recepción de este mensaje o de una solicitud de consulta no constituye por sí misma una relación abogado-cliente.";
  const text = [
    content.greeting,
    ...content.paragraphs,
    details.length
      ? details.map(({ label, value }) => `${label}: ${value}`).join("\n")
      : undefined,
    content.action
      ? `${content.action.label}: ${content.action.url}`
      : undefined,
    notice,
    "LIZÁRRAGA & IBARRA ABOGADOS · contacto@lizarragaibarra.com",
  ]
    .filter(Boolean)
    .join("\n\n");

  const detailRows = details
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:8px 12px;color:#6b6b67;font-size:12px;vertical-align:top;width:38%;border-bottom:1px solid #e8e6e1">${escapeEmailHtml(label)}</td><td style="padding:8px 12px;color:#171717;font-size:13px;vertical-align:top;border-bottom:1px solid #e8e6e1">${escapeEmailHtml(value)}</td></tr>`,
    )
    .join("");
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#363633;font-size:15px;line-height:1.65">${escapeEmailHtml(paragraph)}</p>`,
    )
    .join("");
  const action = content.action
    ? `<p style="margin:28px 0"><a href="${escapeEmailHtml(content.action.url)}" style="display:inline-block;border-radius:999px;background:#111;color:#fff;text-decoration:none;padding:13px 22px;font-size:12px;font-weight:700;letter-spacing:.04em">${escapeEmailHtml(content.action.label)}</a></p><p style="margin:0 0 20px;color:#777;font-size:11px;line-height:1.5;word-break:break-all">Si el botón no funciona: ${escapeEmailHtml(content.action.url)}</p>`
    : "";

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#efeee9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#080808;padding:26px 30px;color:#fff"><div style="font-family:Georgia,serif;font-size:28px;letter-spacing:-1px">LIZÁRRAGA & IBARRA ABOGADOS</div><div style="margin-top:8px;color:#bcbcb8;font-size:10px;letter-spacing:.18em;text-transform:uppercase">${escapeEmailHtml(content.eyebrow)}</div></td></tr><tr><td style="padding:34px 30px"><h1 style="margin:0 0 22px;color:#111;font-family:Georgia,serif;font-size:30px;font-weight:400;line-height:1.15">${escapeEmailHtml(content.title)}</h1>${content.greeting ? `<p style="margin:0 0 16px;color:#171717;font-size:15px;line-height:1.65">${escapeEmailHtml(content.greeting)}</p>` : ""}${paragraphs}${details.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #e8e6e1;border-radius:10px;border-collapse:separate;overflow:hidden">${detailRows}</table>` : ""}${action}<div style="margin-top:28px;border-top:1px solid #e8e6e1;padding-top:20px;color:#6b6b67;font-size:11px;line-height:1.6">${escapeEmailHtml(notice)}<br><br>Por su seguridad, no envíe documentación sensible por respuesta hasta que la firma confirme un canal adecuado.</div></td></tr><tr><td style="background:#f7f6f2;padding:20px 30px;color:#777;font-size:11px;line-height:1.6">LIZÁRRAGA & IBARRA ABOGADOS · contacto@lizarragaibarra.com<br>Este correo es exclusivamente transaccional.</td></tr></table></td></tr></table></body></html>`;

  return { text, html };
}
