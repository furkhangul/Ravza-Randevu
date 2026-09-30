export const IYZICO_SANDBOX_URL = 'https://sandbox-api.iyzipay.com';
export const IYZICO_LIVE_URL = 'https://api.iyzipay.com';
export const IYZICO_SUPPORTED_CURRENCIES = [
  'USD',
  'TRY',
  'EUR',
  'GBP',
  'NOK',
  'CHF',
] as const;
export const DEFAULT_PAYMENT_CURRENCY = 'USD';

export type IyzicoEnvironment = 'sandbox' | 'live';
export type IyzicoCurrency = (typeof IYZICO_SUPPORTED_CURRENCIES)[number];

export type IyzicoConfigurationStatus = {
  provider: 'iyzico';
  environment: IyzicoEnvironment;
  trustedBaseUrl: boolean;
  configured: boolean;
  checkoutEnabled: boolean;
  livePaymentsEnabled: boolean;
  defaultCurrency: IyzicoCurrency;
  supportedCurrencies: readonly IyzicoCurrency[];
  turkishCustomerSharePercent: number;
  turkishCustomerTurkeyResidentSharePercent: number;
  domesticUsdRequired: boolean;
  domesticUsdLegalApproved: boolean;
  domesticCheckoutEnabled: boolean;
  missing: string[];
};

export type CustomerResidency = 'TR' | 'NON_TR';

export type PaymentQuotePolicy = {
  currency: IyzicoCurrency;
  checkoutAllowed: boolean;
  reason: 'ready' | 'checkout_disabled' | 'domestic_usd_legal_review';
};

export type IyzicoHppWebhook = {
  iyziEventType: string;
  iyziPaymentId: string;
  token: string;
  paymentConversationId: string;
  status: string;
};

type IyzicoClientOptions = {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
  checkoutEnabled?: boolean;
  livePaymentsEnabled?: boolean;
  fetchFn?: typeof fetch;
};

type SignedRequest = {
  authorization: string;
  randomKey: string;
};

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function hmacSha256(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(value)),
  );
}

function timingSafeEqual(left: string, right: string) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  let mismatch = normalizedLeft.length ^ normalizedRight.length;
  const longest = Math.max(normalizedLeft.length, normalizedRight.length);
  for (let index = 0; index < longest; index += 1) {
    mismatch |=
      (normalizedLeft.charCodeAt(index) || 0) ^
      (normalizedRight.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export function getIyzicoConfigurationStatus(
  env: Record<string, string | undefined> = process.env,
): IyzicoConfigurationStatus {
  const baseUrl = env.IYZICO_BASE_URL ?? IYZICO_SANDBOX_URL;
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const trustedBaseUrl = [IYZICO_SANDBOX_URL, IYZICO_LIVE_URL].includes(
    normalizedBaseUrl,
  );
  const environment =
    normalizedBaseUrl === IYZICO_LIVE_URL ? 'live' : 'sandbox';
  const missing = [
    ['IYZICO_API_KEY', env.IYZICO_API_KEY],
    ['IYZICO_SECRET_KEY', env.IYZICO_SECRET_KEY],
  ].flatMap(([name, configuredValue]) =>
    configuredValue ? [] : [name as string],
  );
  if (!trustedBaseUrl) missing.push('IYZICO_BASE_URL (resmi alan adı)');
  const checkoutRequested = env.PAYMENT_CHECKOUT_ENABLED === 'true';
  const livePaymentsEnabled = env.PAYMENT_LIVE_ENABLED === 'true';
  const requestedCurrency = (
    env.PAYMENT_DEFAULT_CURRENCY ?? DEFAULT_PAYMENT_CURRENCY
  ).toUpperCase();
  const currencySupported = IYZICO_SUPPORTED_CURRENCIES.some(
    (currency) => currency === requestedCurrency,
  );
  if (!currencySupported) {
    missing.push(
      `PAYMENT_DEFAULT_CURRENCY (${IYZICO_SUPPORTED_CURRENCIES.join('/')})`,
    );
  }
  const defaultCurrency = currencySupported
    ? (requestedCurrency as IyzicoCurrency)
    : DEFAULT_PAYMENT_CURRENCY;
  const domesticUsdRequired = env.PAYMENT_DOMESTIC_USD_REQUIRED === 'true';
  if (domesticUsdRequired && defaultCurrency !== 'USD') {
    missing.push('PAYMENT_DEFAULT_CURRENCY=USD (USD tahsilat zorunlu)');
  }
  const fullyConfigured = missing.length === 0;
  const parsedTurkishShare = Number(env.CUSTOMER_TURKISH_SHARE_PERCENT ?? 0);
  const turkishCustomerSharePercent =
    Number.isInteger(parsedTurkishShare) &&
    parsedTurkishShare >= 0 &&
    parsedTurkishShare <= 100
      ? parsedTurkishShare
      : 0;
  const parsedTurkishResidentShare = Number(
    env.TURKISH_CUSTOMER_TURKEY_RESIDENT_SHARE_PERCENT ?? 0,
  );
  const turkishCustomerTurkeyResidentSharePercent =
    Number.isInteger(parsedTurkishResidentShare) &&
    parsedTurkishResidentShare >= 0 &&
    parsedTurkishResidentShare <= 100
      ? parsedTurkishResidentShare
      : 0;
  const domesticUsdLegalApproved =
    env.PAYMENT_DOMESTIC_USD_LEGAL_APPROVED === 'true';
  const checkoutEnabled =
    fullyConfigured &&
    checkoutRequested &&
    (environment === 'sandbox' || livePaymentsEnabled);

  return {
    provider: 'iyzico',
    environment,
    trustedBaseUrl,
    configured: fullyConfigured,
    checkoutEnabled,
    livePaymentsEnabled,
    defaultCurrency,
    supportedCurrencies: IYZICO_SUPPORTED_CURRENCIES,
    turkishCustomerSharePercent,
    turkishCustomerTurkeyResidentSharePercent,
    domesticUsdRequired,
    domesticUsdLegalApproved,
    domesticCheckoutEnabled:
      checkoutEnabled &&
      (defaultCurrency !== 'USD' || domesticUsdLegalApproved),
    missing,
  };
}

export function getPaymentQuotePolicy(
  residency: CustomerResidency,
  env: Record<string, string | undefined> = process.env,
): PaymentQuotePolicy {
  const configuration = getIyzicoConfigurationStatus(env);
  if (!configuration.checkoutEnabled) {
    return {
      currency: configuration.defaultCurrency,
      checkoutAllowed: false,
      reason: 'checkout_disabled',
    };
  }
  if (
    residency === 'TR' &&
    configuration.defaultCurrency === 'USD' &&
    !configuration.domesticUsdLegalApproved
  ) {
    return {
      currency: configuration.defaultCurrency,
      checkoutAllowed: false,
      reason: 'domestic_usd_legal_review',
    };
  }
  return {
    currency: configuration.defaultCurrency,
    checkoutAllowed: true,
    reason: 'ready',
  };
}

export async function createIyzicoAuthorization(
  apiKey: string,
  secretKey: string,
  path: string,
  jsonBody: string,
  randomKey = crypto.randomUUID(),
): Promise<SignedRequest> {
  if (!path.startsWith('/')) throw new Error('iyzico path must be absolute.');
  const signature = bytesToHex(
    await hmacSha256(secretKey, `${randomKey}${path}${jsonBody}`),
  );
  const value = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return {
    authorization: `IYZWSv2 ${bytesToBase64(encoder.encode(value))}`,
    randomKey,
  };
}

export async function verifyIyzicoHppWebhook(
  secretKey: string,
  payload: IyzicoHppWebhook,
  receivedSignature: string,
) {
  if (!secretKey || !receivedSignature) return false;
  const message =
    secretKey +
    payload.iyziEventType +
    payload.iyziPaymentId +
    payload.token +
    payload.paymentConversationId +
    payload.status;
  const expected = bytesToHex(await hmacSha256(secretKey, message));
  return timingSafeEqual(expected, receivedSignature);
}

export class IyzicoCheckoutClient {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly checkoutEnabled: boolean;
  private readonly livePaymentsEnabled: boolean;
  private readonly fetchFn: typeof fetch;

  constructor(options: IyzicoClientOptions) {
    this.apiKey = options.apiKey;
    this.secretKey = options.secretKey;
    this.baseUrl = (options.baseUrl ?? IYZICO_SANDBOX_URL).replace(/\/$/, '');
    this.checkoutEnabled = options.checkoutEnabled === true;
    this.livePaymentsEnabled = options.livePaymentsEnabled === true;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private assertSafeToCall() {
    if (!this.checkoutEnabled)
      throw new Error('iyzico checkout is disabled by configuration.');
    if (this.baseUrl === IYZICO_LIVE_URL && !this.livePaymentsEnabled)
      throw new Error('Live iyzico payments are disabled.');
    if (![IYZICO_SANDBOX_URL, IYZICO_LIVE_URL].includes(this.baseUrl))
      throw new Error('Untrusted iyzico API base URL.');
  }

  async signedJsonRequest<T>(path: string, body: Record<string, unknown>) {
    this.assertSafeToCall();
    const jsonBody = JSON.stringify(body);
    const signed = await createIyzicoAuthorization(
      this.apiKey,
      this.secretKey,
      path,
      jsonBody,
    );
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: signed.authorization,
        'content-type': 'application/json',
        'x-iyzi-rnd': signed.randomKey,
      },
      body: jsonBody,
    });
    const result = (await response.json()) as T;
    if (!response.ok)
      throw new Error(`iyzico request failed (${response.status}).`);
    return result;
  }
}
