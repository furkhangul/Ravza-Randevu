export type CreativeBrief = {
  briefVersion: string;
  purpose: string;
  mustAvoid: string[];
  textPolicy: 'no_baked_text';
  variantCount: number;
};

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; reasons: string[] };

const hardDenyPatterns: Array<[string, RegExp]> = [
  ['passport', /\b(passport|pasaport)\b/i],
  ['visa', /\b(visa|vize)\b/i],
  ['qr', /\bqr\b/i],
  ['payment', /\b(payment|ödeme|kart numarası)\b/i],
  ['reservation', /\b(reservation|rezervasyon no|randevu no)\b/i],
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ['phone', /(?:\+?\d[\s-]?){10,}/],
];

export function reviewCreativeInput(input: string): PolicyDecision {
  const reasons = hardDenyPatterns.filter(([, pattern]) => pattern.test(input)).map(([label]) => label);
  return reasons.length ? { allowed: false, reasons } : { allowed: true };
}

export function validateBrief(brief: CreativeBrief): string[] {
  const errors: string[] = [];
  if (brief.briefVersion !== '1.0') errors.push('unsupported_brief_version');
  if (!brief.purpose.trim()) errors.push('purpose_required');
  if (brief.textPolicy !== 'no_baked_text') errors.push('text_policy_must_be_no_baked_text');
  if (brief.variantCount < 1 || brief.variantCount > 4) errors.push('variant_count_out_of_range');
  return errors;
}

export function makeCreativeJobKey(briefId: string, promptHash: string): string {
  return `${briefId}:${promptHash}`;
}
