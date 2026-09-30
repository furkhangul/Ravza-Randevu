// Consistent formatting for real charge amounts (never display-currency converted).
// Display-currency conversion for marketing estimates stays in usePublicPreferences().formatUsd.

export function formatMoneyMajor(
  amount: number,
  currencyCode: string,
  localeCode = 'en-US',
) {
  return `${amount.toLocaleString(localeCode, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencyCode}`;
}

export function formatMoneyMinor(
  amountMinor: number,
  currencyCode: string,
  localeCode = 'en-US',
) {
  return formatMoneyMajor(amountMinor / 100, currencyCode, localeCode);
}
