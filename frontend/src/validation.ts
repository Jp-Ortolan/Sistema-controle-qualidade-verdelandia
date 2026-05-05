/** Limites alinhados à API / boas práticas (cliente só orienta; o servidor continua a ser a fonte de verdade). */

export const LIMITS = {
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 128,
  profileNameMax: 120,
  profileImageMaxBytes: 512 * 1024,
  producerNameMax: 120,
  producerCityMax: 120,
  producerPhoneMax: 40,
  analysisTicketMax: 9_999_999,
  analysisFieldMax: 64,
  fichaTextMax: 2000,
  coletaTextMax: 2000,
} as const;

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase().slice(0, LIMITS.emailMax);
}

export function validateLoginFields(email: string, password: string): string | null {
  const e = normalizeEmail(email);
  if (e.length < 5 || !EMAIL_RE.test(e)) {
    return "Informe um e-mail válido.";
  }
  if (password.length < LIMITS.passwordMin) {
    return `A senha deve ter pelo menos ${LIMITS.passwordMin} caracteres.`;
  }
  if (password.length > LIMITS.passwordMax) {
    return "Senha demasiado longa.";
  }
  return null;
}

export function validateProfileName(name: string): string | null {
  const t = name.trim();
  if (t.length > LIMITS.profileNameMax) {
    return `Nome de exibição: máximo ${LIMITS.profileNameMax} caracteres.`;
  }
  return null;
}

export function validateProfileImageFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return "Use apenas imagem JPEG, PNG ou WebP.";
  }
  if (file.size > LIMITS.profileImageMaxBytes) {
    return "Imagem demasiado grande (máx. 512 KB).";
  }
  return null;
}

export function clampStr(s: string, max: number) {
  return s.trim().slice(0, max);
}
