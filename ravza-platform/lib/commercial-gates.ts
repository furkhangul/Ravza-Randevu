export type UmrahPackageGate = {
  key:
    | 'travel_agency_authority'
    | 'diyanet_umrah_authority'
    | 'package_tour_contract'
    | 'package_tour_insurance';
  ready: boolean;
};

export type UmrahPackageStatus = {
  targetProduct: 'umrah-package';
  packageModel: 'own' | 'authorized-reseller' | 'undecided';
  requested: boolean;
  enabled: boolean;
  gates: UmrahPackageGate[];
};

export function getUmrahPackageStatus(
  env: Record<string, string | undefined> = process.env,
): UmrahPackageStatus {
  const gates: UmrahPackageGate[] = [
    {
      key: 'travel_agency_authority',
      ready: env.TRAVEL_AGENCY_AUTHORITY_VERIFIED === 'true',
    },
    {
      key: 'diyanet_umrah_authority',
      ready: env.DIYANET_UMRAH_AUTHORITY_VERIFIED === 'true',
    },
    {
      key: 'package_tour_contract',
      ready: env.PACKAGE_TOUR_CONTRACT_APPROVED === 'true',
    },
    {
      key: 'package_tour_insurance',
      ready: env.PACKAGE_TOUR_INSURANCE_VERIFIED === 'true',
    },
  ];
  const requested = env.UMRAH_PACKAGE_ENABLED === 'true';
  const packageModel =
    env.UMRAH_PACKAGE_MODEL === 'own' ||
    env.UMRAH_PACKAGE_MODEL === 'authorized-reseller'
      ? env.UMRAH_PACKAGE_MODEL
      : 'undecided';

  return {
    targetProduct: 'umrah-package',
    packageModel,
    requested,
    enabled:
      requested &&
      packageModel !== 'undecided' &&
      gates.every((gate) => gate.ready),
    gates,
  };
}
