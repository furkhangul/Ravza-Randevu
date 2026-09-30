import { getUmrahPackageStatus } from './commercial-gates.ts';
import { getIyzicoConfigurationStatus } from '../packages/payment-iyzico/src/index.ts';

export type CustomerOfferStatus = {
  currency: 'USD';
  pricePerPersonUsd: number | null;
  priceReady: boolean;
  packageReady: boolean;
  paymentReady: boolean;
  domesticPaymentReady: boolean;
  checkoutReady: boolean;
  domesticCheckoutReady: boolean;
};

export function getCustomerOfferStatus(
  env: Record<string, string | undefined> = process.env,
): CustomerOfferStatus {
  const parsedPrice = Number(env.UMRAH_PACKAGE_PRICE_USD ?? '');
  const priceReady = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const packageStatus = getUmrahPackageStatus(env);
  const paymentStatus = getIyzicoConfigurationStatus(env);

  return {
    currency: 'USD',
    pricePerPersonUsd: priceReady ? parsedPrice : null,
    priceReady,
    packageReady: packageStatus.enabled,
    paymentReady: paymentStatus.checkoutEnabled,
    domesticPaymentReady: paymentStatus.domesticCheckoutEnabled,
    checkoutReady:
      priceReady && packageStatus.enabled && paymentStatus.checkoutEnabled,
    domesticCheckoutReady:
      priceReady &&
      packageStatus.enabled &&
      paymentStatus.domesticCheckoutEnabled,
  };
}
