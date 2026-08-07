import "server-only";

/**
 * The two emails the auth system sends.
 *
 * Plain and short on purpose: a message that looks like marketing is a message
 * people have been taught to distrust, and this one is asking them to click a
 * link and type a password.
 *
 * Neither ever contains a password — only a link that expires and can be used
 * once.
 */

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );

function wrap(lines: string[]) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#2a1f24">${lines.join("")}</div>`;
}

export function inviteEmail({
  firstName,
  url,
  invitedBy,
}: {
  firstName: string;
  url: string;
  invitedBy: string;
}) {
  const text = [
    `Hello ${firstName},`,
    "",
    `${invitedBy} has set up an account for you on the church system, where you can see your own giving, attendance and messages.`,
    "",
    "Choose your password here:",
    url,
    "",
    "The link works once and expires in seven days. If it has expired, ask the church office to send another.",
    "",
    "If you were not expecting this, you can ignore it — no account is active until the link is used.",
  ].join("\n");

  const html = wrap([
    `<p>Hello ${escape(firstName)},</p>`,
    `<p>${escape(invitedBy)} has set up an account for you on the church system, where you can see your own giving, attendance and messages.</p>`,
    `<p><a href="${escape(url)}" style="color:#5d2745;font-weight:600">Choose your password</a></p>`,
    `<p style="color:#6b5b60;font-size:13px">The link works once and expires in seven days. If it has expired, ask the church office to send another.</p>`,
    `<p style="color:#6b5b60;font-size:13px">If you were not expecting this, you can ignore it — no account is active until the link is used.</p>`,
  ]);

  return { subject: "Your account on the church system", text, html };
}

export function passwordResetEmail({ firstName, url }: { firstName: string; url: string }) {
  const text = [
    `Hello ${firstName},`,
    "",
    "Somebody asked to reset the password on your church account. If that was you, set a new one here:",
    url,
    "",
    "The link works once and expires in one hour.",
    "",
    "If it was not you, ignore this — your password has not changed and nobody has been given access.",
  ].join("\n");

  const html = wrap([
    `<p>Hello ${escape(firstName)},</p>`,
    `<p>Somebody asked to reset the password on your church account. If that was you, set a new one here:</p>`,
    `<p><a href="${escape(url)}" style="color:#5d2745;font-weight:600">Set a new password</a></p>`,
    `<p style="color:#6b5b60;font-size:13px">The link works once and expires in one hour.</p>`,
    `<p style="color:#6b5b60;font-size:13px">If it was not you, ignore this — your password has not changed and nobody has been given access.</p>`,
  ]);

  return { subject: "Reset your church account password", text, html };
}
