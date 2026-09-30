export type Gender = 'female' | 'male';

export type AvailabilitySlot = {
  date: string;
  timeSlot: string;
  window: string;
  gender: Gender;
  available: number | '50+';
};

export type AvailabilityResult = {
  slots: AvailabilitySlot[];
  hasBalance: boolean | null;
};

export type QrGroup = {
  dateKey: string;
  groupCode: string;
  appointmentTime: string;
  genderId: 8 | 9;
  gender: 'Male' | 'Female';
  purchaseId: string | null;
  printGuid: string | null;
  confirmedCount: number;
  printedCount: number;
  totalCount: number;
  groupKey: string;
};

export type QrPassengerStatus = 'All' | 'WithQr' | 'WithoutQr' | 'Printed';

export type QrPassengerFilter = {
  date: string;
  groupCode?: string;
  appointmentTime?: string;
  genderId?: 8 | 9;
  purchaseId?: string | number;
  printGuid?: string | null;
  status?: QrPassengerStatus;
};

export type QrPassenger = {
  id: string;
  name: string;
  surname: string;
  groupCode: string | null;
  appointmentDate: string;
  appointmentTime: string;
  appointmentStatus: number;
  genderId: 8 | 9;
  gender: 'Male' | 'Female';
  purchaseId: string | null;
  printGuid: string | null;
  hasQr: boolean;
  isDisabled: boolean;
  isAppointmentPast: boolean;
  ravzaReservationId: string | null;
  nusukStatus: string | null;
};

export type QrPassengerResult = {
  count: number;
  withQrCount: number;
  passengers: QrPassenger[];
};

export type QrPdfExportCommand = {
  passengerIds: number[];
  groupName?: string | null;
  template?: 'New' | 'Old';
};

export type QrPdfExportResult = {
  status: 'completed' | 'failed' | 'unknown';
  markedCount?: number;
  pdf?: Uint8Array;
};

export type ShareLinkCommand = {
  date: string;
  groupCode?: string;
  appointmentTime?: string;
  genderId?: 8 | 9;
  purchaseId?: number;
  printGuid?: string | null;
  personCount?: number;
  shareGroupName?: string | null;
};

export type ShareLinkResult = {
  status: 'completed' | 'failed' | 'unknown';
  code?: string;
  url?: string;
  passengerCount?: number;
};

export type PurchaseCommand = {
  agencyId: string;
  idempotencyKey: string;
  dateKey: string;
  timeSlot: string;
  gender: Gender;
  count: number;
  groupCode?: string;
};

export type PurchaseResult = {
  transactionId: string;
  status: 'completed' | 'failed' | 'unknown';
  purchasedCount?: number;
  remainingBalance?: number;
  balanceCharged?: number;
  discountApplied?: boolean;
  discountCampaignName?: string | null;
};

export interface RawdahProvider {
  getAvailability(date: string): Promise<AvailabilityResult>;
  getQrGroups(): Promise<QrGroup[]>;
  getQrPassengers(filter: QrPassengerFilter): Promise<QrPassengerResult>;
  createShareLink(command: ShareLinkCommand): Promise<ShareLinkResult>;
  exportQrPdf(command: QrPdfExportCommand): Promise<QrPdfExportResult>;
  purchase(command: PurchaseCommand): Promise<PurchaseResult>;
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type RawdahProviderOptions = {
  baseUrl: string;
  authPath?: string;
  email: string;
  password: string;
  requestTimeoutMs?: number;
  writeEnabled?: boolean;
  pdfExportEnabled?: boolean;
  shareLinkEnabled?: boolean;
  fetchFn?: FetchLike;
};

type LoginResponse = {
  token?: unknown;
  expiresAt?: unknown;
};

type CalendarResponse = {
  success?: unknown;
  hasBalance?: unknown;
  dataMale?: unknown;
  dataFemale?: unknown;
};

type PurchaseResponse = {
  success?: unknown;
  purchasedCount?: unknown;
  quantity?: unknown;
  remainingBalance?: unknown;
  orderId?: unknown;
  balanceCharged?: unknown;
  discountApplied?: unknown;
  discountCampaignName?: unknown;
};

type QrGroupsResponse = {
  success?: unknown;
  data?: unknown;
};

type QrPassengersResponse = {
  success?: unknown;
  count?: unknown;
  withQrCount?: unknown;
  data?: unknown;
};

type ShareLinkResponse = {
  success?: unknown;
  code?: unknown;
  url?: unknown;
  passengerCount?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jwtExpiryMs(token: string) {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const parsed = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof parsed.exp === 'number' && Number.isFinite(parsed.exp)
      ? parsed.exp * 1000
      : null;
  } catch {
    return null;
  }
}

function toNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function mapQrGroup(value: unknown): QrGroup | null {
  if (!isRecord(value)) return null;
  const genderId =
    value.genderId === 8 || value.genderId === 9 ? value.genderId : null;
  const gender =
    value.gender === 'Male' || value.gender === 'Female' ? value.gender : null;
  const confirmedCount = toNonNegativeNumber(value.confirmedCount);
  const printedCount = toNonNegativeNumber(value.printedCount);
  const totalCount = toNonNegativeNumber(value.totalCount);
  if (
    typeof value.dateKey !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.dateKey) ||
    typeof value.groupCode !== 'string' ||
    typeof value.appointmentTime !== 'string' ||
    genderId === null ||
    gender === null ||
    confirmedCount === null ||
    printedCount === null ||
    totalCount === null ||
    typeof value.groupKey !== 'string'
  ) {
    return null;
  }
  const purchaseId =
    typeof value.purchaseId === 'string' || typeof value.purchaseId === 'number'
      ? String(value.purchaseId)
      : null;
  const printGuid =
    typeof value.printGuid === 'string' && value.printGuid.length > 0
      ? value.printGuid
      : null;
  return {
    dateKey: value.dateKey,
    groupCode: value.groupCode,
    appointmentTime: value.appointmentTime,
    genderId,
    gender,
    purchaseId,
    printGuid,
    confirmedCount,
    printedCount,
    totalCount,
    groupKey: value.groupKey,
  };
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function mapQrPassenger(value: unknown): QrPassenger | null {
  if (!isRecord(value)) return null;
  const id =
    typeof value.id === 'string' || typeof value.id === 'number'
      ? String(value.id)
      : null;
  const genderId =
    value.genderId === 8 || value.genderId === 9 ? value.genderId : null;
  const gender =
    value.gender === 'Male' || value.gender === 'Female' ? value.gender : null;
  if (
    id === null ||
    typeof value.name !== 'string' ||
    typeof value.surname !== 'string' ||
    typeof value.appointmentDate !== 'string' ||
    typeof value.appointmentTime !== 'string' ||
    typeof value.appointmentStatus !== 'number' ||
    genderId === null ||
    gender === null ||
    typeof value.hasQr !== 'boolean' ||
    typeof value.isDisabled !== 'boolean' ||
    typeof value.isAppointmentPast !== 'boolean'
  ) {
    return null;
  }
  return {
    id,
    name: value.name,
    surname: value.surname,
    groupCode: nullableString(value.groupCode),
    appointmentDate: value.appointmentDate,
    appointmentTime: value.appointmentTime,
    appointmentStatus: value.appointmentStatus,
    genderId,
    gender,
    purchaseId:
      typeof value.purchaseId === 'string' ||
      typeof value.purchaseId === 'number'
        ? String(value.purchaseId)
        : null,
    printGuid: nullableString(value.printGuid),
    hasQr: value.hasQr,
    isDisabled: value.isDisabled,
    isAppointmentPast: value.isAppointmentPast,
    ravzaReservationId: nullableString(value.ravzaReservationId),
    nusukStatus: nullableString(value.nusukStatus),
  };
}

function nextTwentyMinuteWindow(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const total =
    (((hours * 60 + minutes + 20) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function mapCalendarBucket(
  date: string,
  gender: Gender,
  value: unknown,
): AvailabilitySlot[] {
  if (!isRecord(value)) return [];
  const slots: AvailabilitySlot[] = [];
  for (const [time, count] of Object.entries(value)) {
    if (!/^\d{2}:\d{2}$/.test(time) || typeof count !== 'number') continue;
    slots.push({
      date,
      timeSlot: time,
      window: `${time}-${nextTwentyMinuteWindow(time)}`,
      gender,
      available: count < 0 ? 0 : count,
    });
  }
  return slots;
}

export class LiveRawdahReadOnlyProvider implements RawdahProvider {
  private readonly baseUrl: string;
  private readonly authPath: string;
  private readonly email: string;
  private readonly password: string;
  private readonly requestTimeoutMs: number;
  private readonly writeEnabled: boolean;
  private readonly pdfExportEnabled: boolean;
  private readonly shareLinkEnabled: boolean;
  private readonly fetchFn: FetchLike;
  private cachedToken: { value: string; expiresAtMs: number } | null = null;

  constructor(options: RawdahProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.authPath = options.authPath ?? '/api/Auth/login';
    this.email = options.email;
    this.password = options.password;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
    this.writeEnabled = options.writeEnabled === true;
    this.pdfExportEnabled = options.pdfExportEnabled === true;
    this.shareLinkEnabled = options.shareLinkEnabled === true;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private async request(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
      if (response.status === 401) this.cachedToken = null;
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async login() {
    if (
      this.cachedToken &&
      Date.now() < this.cachedToken.expiresAtMs - 30_000
    ) {
      return this.cachedToken.value;
    }
    const response = await this.request(this.authPath, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    if (!response.ok)
      throw new Error(`Rawdah authentication failed (${response.status}).`);
    const payload = (await response.json()) as LoginResponse;
    if (typeof payload.token !== 'string' || payload.token.length === 0) {
      throw new Error('Rawdah authentication returned no token.');
    }
    const reportedExpiry =
      typeof payload.expiresAt === 'string'
        ? Date.parse(payload.expiresAt)
        : Number.NaN;
    const claimExpiry = jwtExpiryMs(payload.token);
    const validExpiries = [
      Number.isFinite(reportedExpiry) ? reportedExpiry : null,
      claimExpiry,
    ].filter((value): value is number => value !== null);
    if (validExpiries.length > 0) {
      this.cachedToken = {
        value: payload.token,
        expiresAtMs: Math.min(...validExpiries),
      };
    }
    return payload.token;
  }

  async getAvailability(date: string): Promise<AvailabilityResult> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new Error('Invalid Rawdah availability date.');
    const token = await this.login();
    const query = new URLSearchParams({ startDate: date, endDate: date });
    const response = await this.request(
      `/api/AppointmentQueue/GetBookedAppointments?${query}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok)
      throw new Error(`Rawdah availability failed (${response.status}).`);
    const payload = (await response.json()) as CalendarResponse;
    if (payload.success !== true)
      throw new Error('Rawdah availability returned an unsuccessful response.');

    const male = isRecord(payload.dataMale)
      ? payload.dataMale[date]
      : undefined;
    const female = isRecord(payload.dataFemale)
      ? payload.dataFemale[date]
      : undefined;
    const slots = [
      ...mapCalendarBucket(date, 'male', male),
      ...mapCalendarBucket(date, 'female', female),
    ].sort(
      (a, b) =>
        a.window.localeCompare(b.window) || a.gender.localeCompare(b.gender),
    );
    return {
      slots,
      hasBalance:
        typeof payload.hasBalance === 'boolean' ? payload.hasBalance : null,
    };
  }

  async getQrGroups(): Promise<QrGroup[]> {
    const token = await this.login();
    const response = await this.request('/api/QRCode/GetPrintGroups', {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok)
      throw new Error(`Rawdah QR groups failed (${response.status}).`);
    const payload = (await response.json()) as QrGroupsResponse;
    if (payload.success !== true || !Array.isArray(payload.data)) {
      throw new Error('Rawdah QR groups returned an unsuccessful response.');
    }
    return payload.data
      .map(mapQrGroup)
      .filter((group): group is QrGroup => group !== null)
      .sort(
        (a, b) =>
          a.dateKey.localeCompare(b.dateKey) ||
          a.appointmentTime.localeCompare(b.appointmentTime) ||
          a.genderId - b.genderId ||
          a.groupCode.localeCompare(b.groupCode),
      );
  }

  async getQrPassengers(filter: QrPassengerFilter): Promise<QrPassengerResult> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filter.date)) {
      throw new Error('Invalid Rawdah QR passenger date.');
    }
    if (filter.genderId !== undefined && ![8, 9].includes(filter.genderId)) {
      throw new Error('Invalid Rawdah QR passenger genderId.');
    }
    const query = new URLSearchParams({
      date: filter.date,
      status: filter.status ?? 'All',
    });
    if (filter.groupCode) query.set('groupCode', filter.groupCode);
    if (filter.appointmentTime) {
      query.set('appointmentTime', filter.appointmentTime);
    }
    if (filter.genderId !== undefined) {
      query.set('genderId', String(filter.genderId));
    }
    if (filter.purchaseId !== undefined) {
      query.set('purchaseId', String(filter.purchaseId));
    }
    if (filter.printGuid) query.set('printGuid', filter.printGuid);

    const token = await this.login();
    const response = await this.request(
      `/api/QRCode/GetPrintListPassengers?${query}`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Rawdah QR passengers failed (${response.status}).`);
    }
    const payload = (await response.json()) as QrPassengersResponse;
    if (payload.success !== true || !Array.isArray(payload.data)) {
      throw new Error(
        'Rawdah QR passengers returned an unsuccessful response.',
      );
    }
    const passengers = payload.data
      .map(mapQrPassenger)
      .filter((passenger): passenger is QrPassenger => passenger !== null);
    return {
      count:
        typeof payload.count === 'number' ? payload.count : passengers.length,
      withQrCount:
        typeof payload.withQrCount === 'number'
          ? payload.withQrCount
          : passengers.filter((passenger) => passenger.hasQr).length,
      passengers,
    };
  }

  async createShareLink(command: ShareLinkCommand): Promise<ShareLinkResult> {
    if (!this.shareLinkEnabled) {
      throw new Error('Live Rawdah share links are disabled.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(command.date)) {
      throw new Error('Invalid Rawdah share-link date.');
    }
    if (
      command.genderId !== undefined &&
      command.genderId !== 8 &&
      command.genderId !== 9
    ) {
      throw new Error('Invalid Rawdah share-link genderId.');
    }
    if (
      command.purchaseId !== undefined &&
      (!Number.isInteger(command.purchaseId) || command.purchaseId <= 0)
    ) {
      throw new Error('Invalid Rawdah share-link purchaseId.');
    }
    if (
      command.personCount !== undefined &&
      (!Number.isInteger(command.personCount) || command.personCount < 0)
    ) {
      throw new Error('Invalid Rawdah share-link personCount.');
    }
    if (
      command.printGuid &&
      command.printGuid !== 'null' &&
      !/^[A-Za-z0-9]{5}$/.test(command.printGuid)
    ) {
      throw new Error('Invalid Rawdah share-link printGuid.');
    }

    const token = await this.login();
    let response: Response;
    try {
      response = await this.request('/api/QRCode/CreatePrintShareLink', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          date: command.date,
          ...(command.groupCode ? { groupCode: command.groupCode } : {}),
          ...(command.appointmentTime
            ? { appointmentTime: command.appointmentTime }
            : {}),
          ...(command.genderId === undefined
            ? {}
            : { genderId: command.genderId }),
          ...(command.purchaseId === undefined
            ? {}
            : { purchaseId: command.purchaseId }),
          ...(command.printGuid && command.printGuid !== 'null'
            ? { printGuid: command.printGuid }
            : {}),
          personCount: command.personCount ?? 0,
          shareGroupName: command.shareGroupName ?? null,
        }),
      });
    } catch {
      // The call creates an anonymous bearer link and may rename a group.
      // Network ambiguity must not create a second link automatically.
      return { status: 'unknown' };
    }

    if (!response.ok) {
      return { status: response.status >= 500 ? 'unknown' : 'failed' };
    }
    let payload: ShareLinkResponse;
    try {
      payload = (await response.json()) as ShareLinkResponse;
    } catch {
      return { status: 'unknown' };
    }
    if (
      payload.success !== true ||
      typeof payload.code !== 'string' ||
      !/^[A-Za-z0-9]{5}$/.test(payload.code) ||
      typeof payload.url !== 'string' ||
      typeof payload.passengerCount !== 'number' ||
      !Number.isInteger(payload.passengerCount) ||
      payload.passengerCount < 0
    ) {
      return { status: 'unknown' };
    }
    let shareUrl: URL;
    try {
      shareUrl = new URL(payload.url);
    } catch {
      return { status: 'unknown' };
    }
    if (
      shareUrl.protocol !== 'https:' ||
      shareUrl.hostname !== 'rwdh.link' ||
      shareUrl.pathname !== `/${payload.code}` ||
      shareUrl.search !== '' ||
      shareUrl.hash !== ''
    ) {
      return { status: 'unknown' };
    }
    return {
      status: 'completed',
      code: payload.code,
      url: shareUrl.href,
      passengerCount: payload.passengerCount,
    };
  }

  async exportQrPdf(command: QrPdfExportCommand): Promise<QrPdfExportResult> {
    if (!this.pdfExportEnabled) {
      throw new Error('Live Rawdah PDF export is disabled.');
    }
    if (
      command.passengerIds.length === 0 ||
      command.passengerIds.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      throw new Error('Invalid Rawdah PDF passengerIds.');
    }

    const token = await this.login();
    let response: Response;
    try {
      response = await this.request('/api/QRCode/ExportPrintListPdf', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          passengerIds: command.passengerIds,
          groupName: command.groupName ?? null,
          template: command.template ?? 'New',
        }),
      });
    } catch {
      // Success mutates Printed/group state, so network ambiguity must never
      // trigger an automatic retry.
      return { status: 'unknown' };
    }

    if (!response.ok) {
      return { status: response.status >= 500 ? 'unknown' : 'failed' };
    }
    const contentType = response.headers.get('content-type')?.toLowerCase();
    if (!contentType?.includes('application/pdf')) {
      return { status: 'unknown' };
    }
    const markedHeader = response.headers.get('x-marked-count');
    const markedCount =
      markedHeader === null ? Number.NaN : Number(markedHeader);
    const pdf = new Uint8Array(await response.arrayBuffer());
    if (!Number.isInteger(markedCount) || markedCount < 0 || pdf.length === 0) {
      return { status: 'unknown' };
    }
    return { status: 'completed', markedCount, pdf };
  }

  async purchase(command: PurchaseCommand): Promise<PurchaseResult> {
    if (!this.writeEnabled)
      throw new Error('Live Rawdah write operations are disabled.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(command.dateKey))
      throw new Error('Invalid Rawdah purchase dateKey.');
    if (!/^\d{2}:\d{2}$/.test(command.timeSlot))
      throw new Error('Invalid Rawdah purchase timeSlot.');
    if (!Number.isInteger(command.count) || command.count < 1)
      throw new Error('Invalid Rawdah purchase quantity.');

    const token = await this.login();
    let response: Response;
    try {
      response = await this.request(
        '/api/AppointmentQueue/PurchaseAppointments',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            dateKey: command.dateKey,
            timeSlot: command.timeSlot,
            genderId: command.gender === 'male' ? 'Male' : 'Female',
            quantity: command.count,
            ...(command.groupCode ? { groupCode: command.groupCode } : {}),
          }),
        },
      );
    } catch {
      // The provider explicitly documents this POST as non-idempotent. A
      // network/timeout failure is ambiguous and must never be retried here.
      return { transactionId: command.idempotencyKey, status: 'unknown' };
    }

    if (!response.ok) {
      return {
        transactionId: command.idempotencyKey,
        status: response.status >= 500 ? 'unknown' : 'failed',
      };
    }

    let payload: PurchaseResponse;
    try {
      payload = (await response.json()) as PurchaseResponse;
    } catch {
      return { transactionId: command.idempotencyKey, status: 'unknown' };
    }
    if (payload.success !== true) {
      return { transactionId: command.idempotencyKey, status: 'failed' };
    }

    const transactionId =
      typeof payload.orderId === 'string' || typeof payload.orderId === 'number'
        ? String(payload.orderId)
        : command.idempotencyKey;
    const purchasedCount =
      typeof payload.purchasedCount === 'number'
        ? payload.purchasedCount
        : typeof payload.quantity === 'number'
          ? payload.quantity
          : undefined;
    return {
      transactionId,
      status: 'completed',
      ...(purchasedCount === undefined ? {} : { purchasedCount }),
      ...(typeof payload.remainingBalance === 'number'
        ? { remainingBalance: payload.remainingBalance }
        : {}),
      ...(typeof payload.balanceCharged === 'number'
        ? { balanceCharged: payload.balanceCharged }
        : {}),
      ...(typeof payload.discountApplied === 'boolean'
        ? { discountApplied: payload.discountApplied }
        : {}),
      ...(typeof payload.discountCampaignName === 'string' ||
      payload.discountCampaignName === null
        ? { discountCampaignName: payload.discountCampaignName }
        : {}),
    };
  }
}

export function isTrustedRawdahBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'rawdahbooking.com' &&
      url.port === '' &&
      (url.pathname === '' || url.pathname === '/') &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === ''
    );
  } catch {
    return false;
  }
}

export function createLiveRawdahProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
) {
  const baseUrl = env.RAWDAH_BASE_URL ?? 'https://rawdahbooking.com';
  const email = env.RAWDAH_EMAIL;
  const password = env.RAWDAH_PASSWORD;
  if (!email || !password)
    throw new Error('Rawdah credentials are not configured.');
  if (!isTrustedRawdahBaseUrl(baseUrl)) {
    throw new Error('Untrusted Rawdah base URL.');
  }
  return new LiveRawdahReadOnlyProvider({
    baseUrl,
    authPath: env.RAWDAH_AUTH_PATH,
    email,
    password,
    requestTimeoutMs: Number(env.RAWDAH_REQUEST_TIMEOUT_MS ?? 15_000),
    writeEnabled: env.RAWDAH_WRITE_ENABLED === 'true',
    pdfExportEnabled: env.RAWDAH_PDF_EXPORT_ENABLED === 'true',
    shareLinkEnabled: env.RAWDAH_SHARE_LINK_ENABLED === 'true',
  });
}

export class MockRawdahProvider implements RawdahProvider {
  private readonly results = new Map<string, PurchaseResult>();

  async getAvailability(date: string): Promise<AvailabilityResult> {
    return {
      hasBalance: true,
      slots: [
        {
          date,
          timeSlot: '08:00',
          window: '08:00-08:20',
          gender: 'female',
          available: '50+',
        },
        {
          date,
          timeSlot: '11:20',
          window: '11:20-11:40',
          gender: 'male',
          available: 0,
        },
        {
          date,
          timeSlot: '16:00',
          window: '16:00-16:20',
          gender: 'male',
          available: 18,
        },
        {
          date,
          timeSlot: '21:20',
          window: '21:20-21:40',
          gender: 'female',
          available: 9,
        },
      ],
    };
  }

  async getQrGroups(): Promise<QrGroup[]> {
    return [
      {
        dateKey: '2026-09-05',
        groupCode: 'GRP-DEMO',
        appointmentTime: '18:00-18:20',
        genderId: 8,
        gender: 'Male',
        purchaseId: '501',
        printGuid: null,
        confirmedCount: 2,
        printedCount: 0,
        totalCount: 2,
        groupKey: '2026-09-05_GRP-DEMO_18:00-18:20_8_501_null',
      },
    ];
  }

  async getQrPassengers(filter: QrPassengerFilter): Promise<QrPassengerResult> {
    const passengers: QrPassenger[] = [
      {
        id: '10001',
        name: 'Ali',
        surname: 'Demo',
        groupCode: filter.groupCode ?? null,
        appointmentDate: `${filter.date}T00:00:00Z`,
        appointmentTime: filter.appointmentTime ?? '18:00-18:20',
        appointmentStatus: 2,
        genderId: filter.genderId ?? 8,
        gender: (filter.genderId ?? 8) === 9 ? 'Female' : 'Male',
        purchaseId:
          filter.purchaseId === undefined ? null : String(filter.purchaseId),
        printGuid: filter.printGuid ?? null,
        hasQr: true,
        isDisabled: false,
        isAppointmentPast: false,
        ravzaReservationId: 'RES-DEMO',
        nusukStatus: 'Confirmed',
      },
    ];
    const filtered = passengers.filter((passenger) => {
      if (filter.status === 'WithoutQr') return !passenger.hasQr;
      if (filter.status === 'WithQr') return passenger.hasQr;
      return true;
    });
    return {
      count: filtered.length,
      withQrCount: filtered.filter((passenger) => passenger.hasQr).length,
      passengers: filtered,
    };
  }

  async createShareLink(command: ShareLinkCommand): Promise<ShareLinkResult> {
    return {
      status: 'completed',
      code: 'Demo1',
      url: 'https://rwdh.link/Demo1',
      passengerCount: command.personCount || 1,
    };
  }

  async exportQrPdf(command: QrPdfExportCommand): Promise<QrPdfExportResult> {
    if (command.passengerIds.length === 0) return { status: 'failed' };
    return {
      status: 'completed',
      markedCount: command.passengerIds.length,
      pdf: new TextEncoder().encode('%PDF-1.4 DEMO'),
    };
  }

  async purchase(command: PurchaseCommand): Promise<PurchaseResult> {
    const existing = this.results.get(command.idempotencyKey);
    if (existing) return existing;
    if (command.count < 1 || command.count > 10) {
      return { transactionId: 'none', status: 'failed' };
    }
    const result = {
      transactionId: `DEMO-${command.idempotencyKey.slice(0, 10)}`,
      status: 'completed' as const,
    };
    this.results.set(command.idempotencyKey, result);
    return result;
  }
}

export class LiveRawdahProviderDisabled implements RawdahProvider {
  private fail(): never {
    throw new Error(
      'Live Rawdah provider is disabled until Phase -1 verification is complete.',
    );
  }

  async getAvailability(_date: string): Promise<AvailabilityResult> {
    return this.fail();
  }

  async getQrGroups(): Promise<QrGroup[]> {
    return this.fail();
  }

  async getQrPassengers(
    _filter: QrPassengerFilter,
  ): Promise<QrPassengerResult> {
    return this.fail();
  }

  async createShareLink(_command: ShareLinkCommand): Promise<ShareLinkResult> {
    return this.fail();
  }

  async exportQrPdf(_command: QrPdfExportCommand): Promise<QrPdfExportResult> {
    return this.fail();
  }

  async purchase(_command: PurchaseCommand): Promise<PurchaseResult> {
    return this.fail();
  }
}
