import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLiveRawdahProviderFromEnv,
  LiveRawdahProviderDisabled,
  LiveRawdahReadOnlyProvider,
  MockRawdahProvider,
} from '../packages/provider-rawdah/src/index.ts';
import { resolveAppRole } from '../lib/roles.ts';
import { getUmrahPackageStatus } from '../lib/commercial-gates.ts';
import { getCustomerOfferStatus } from '../lib/customer-offer.ts';
import { parsePackageInput } from '../lib/package-catalog.ts';
import { parseCustomerOrderInput } from '../lib/customer-order.ts';
import {
  createIyzicoAuthorization,
  getIyzicoConfigurationStatus,
  getPaymentQuotePolicy,
  IYZICO_SANDBOX_URL,
  verifyIyzicoHppWebhook,
} from '../packages/payment-iyzico/src/index.ts';
import { createHmac } from 'node:crypto';
import { riyadhToday } from '../lib/date-validation.ts';

void test('appointment balance uses the live account value and refreshes independently of token expiry', async () => {
  const balances = [5020, 7510.5, 0];
  const calls: string[] = [];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'test',
    fetchFn: async (input) => {
      calls.push(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      return Response.json({
        token: 'test-token',
        expiresAt: '2099-01-01T00:00:00Z',
        user: { appointmentBalance: balances.shift() },
      });
    },
  });
  assert.equal(await provider.getAppointmentBalance(), 5020);
  assert.equal(await provider.getAppointmentBalance(), 7510.5);
  assert.equal(await provider.getAppointmentBalance(), 0);
  assert.deepEqual(calls, Array(3).fill('https://example.test/api/Auth/login'));
});

void test('missing or invalid live balance never becomes a zero or demo balance', async () => {
  for (const balance of [undefined, null, '5020', -1, Number.NaN]) {
    const provider = new LiveRawdahReadOnlyProvider({
      baseUrl: 'https://example.test',
      email: 'local@example.test',
      password: 'test',
      fetchFn: async () =>
        Response.json({
          token: 'test-token',
          user: { appointmentBalance: balance },
        }),
    });
    await assert.rejects(
      () => provider.getAppointmentBalance(),
      /balance is unavailable/,
    );
  }
});

void test('a failed balance refresh never reuses an earlier successful value', async () => {
  const responses = [
    Response.json({ token: 'test-token', user: { appointmentBalance: 5020 } }),
    Response.json({ message: 'unavailable' }, { status: 503 }),
    Response.json({ token: 'test-token' }),
  ];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'test',
    fetchFn: async () => responses.shift()!,
  });
  assert.equal(await provider.getAppointmentBalance(), 5020);
  await assert.rejects(
    () => provider.getAppointmentBalance(),
    /authentication failed/,
  );
  await assert.rejects(
    () => provider.getAppointmentBalance(),
    /balance is unavailable/,
  );
});

void test('calendar dates follow Medina at the UTC day boundary', () => {
  assert.equal(riyadhToday(new Date('2026-09-24T20:59:59Z')), '2026-09-24');
  assert.equal(riyadhToday(new Date('2026-09-24T21:00:00Z')), '2026-09-25');
});

void test('calendar counts preserve quantities greater than fifty and isolate the requested date and gender', async () => {
  const responses = [
    Response.json({ token: 'test-token' }),
    Response.json({
      success: true,
      hasBalance: true,
      dataMale: {
        '2026-09-25': { '14:00': 131, '16:00': 0 },
        '2026-09-26': { '14:00': 999 },
      },
      dataFemale: { '2026-09-25': { '23:20': 189 } },
    }),
  ];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'test',
    fetchFn: async () => responses.shift()!,
  });
  const result = await provider.getAvailability('2026-09-25');
  assert.deepEqual(
    result.slots.map(({ gender, available }) => [gender, available]),
    [
      ['male', 131],
      ['male', 0],
      ['female', 189],
    ],
  );
});

void test('package catalog keeps incomplete packages as drafts only', () => {
  const draft = parsePackageInput({
    productType: 'umrah',
    name: 'Yeni Umre Paketi',
    slug: 'yeni-umre-paketi',
    status: 'draft',
    makkahNights: 4,
    medinaNights: 4,
  });
  assert.equal(draft.ok, true);
  if (draft.ok) {
    assert.equal(draft.value.currency, 'USD');
    assert.equal(draft.value.priceMinor, null);
  }

  const attemptedPublish = parsePackageInput({
    productType: 'umrah',
    name: 'Yeni Umre Paketi',
    slug: 'yeni-umre-paketi',
    status: 'published',
    makkahNights: 4,
    medinaNights: 4,
  });
  assert.equal(attemptedPublish.ok, false);
});

void test('complete USD Hajj package can be published', () => {
  const result = parsePackageInput({
    productType: 'hajj',
    id: 'PKG-2026-01',
    name: 'Ekim Umre Yolculuğu',
    slug: 'ekim-umre-yolculugu',
    status: 'published',
    departureCity: 'İstanbul',
    departureDate: '2026-10-10',
    returnDate: '2026-10-19',
    makkahNights: 4,
    medinaNights: 4,
    priceMinor: 189_000,
    includedServices: ['Uçuş', 'Konaklama'],
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.priceMinor, 189_000);
    assert.equal(result.value.currency, 'USD');
    assert.equal(result.value.status, 'published');
    assert.equal(result.value.productType, 'hajj');
  }
});

void test('customer order requires passenger-group Ravza selections', () => {
  const base = {
    packageSlug: 'ekim-umre-yolculugu',
    contactEmail: 'customer@example.test',
    contactPhone: '+905551112233',
    residenceCountry: 'Türkiye',
    residenceCity: 'İstanbul',
    departureLocation: 'İstanbul Havalimanı',
    passengers: [
      {
        firstName: 'Ali',
        lastName: 'Örnek',
        gender: 'male',
        birthDate: '1988-02-15',
        nationality: 'T.C.',
      },
      {
        firstName: 'Ayşe',
        lastName: 'Örnek',
        gender: 'female',
        birthDate: '1992-08-03',
        nationality: 'T.C.',
      },
    ],
    ravzaVisitDate: '2026-10-15',
    idempotencyKey: 'booking-session-123456',
  };
  const incomplete = parseCustomerOrderInput({
    ...base,
    selectedSlots: { male: { timeSlot: '18:01', window: '18:00-18:20' } },
  });
  assert.equal(incomplete.ok, false);

  const complete = parseCustomerOrderInput({
    ...base,
    selectedSlots: {
      male: { timeSlot: '18:01', window: '18:00-18:20' },
      female: { timeSlot: '20:01', window: '20:00-20:20' },
    },
  });
  assert.equal(complete.ok, true);
  if (complete.ok) {
    assert.equal(complete.value.passengers.length, 2);
    assert.equal(complete.value.selectedSlots.female?.timeSlot, '20:01');
  }

  const invalidCalendarDate = parseCustomerOrderInput({
    ...base,
    ravzaVisitDate: '2026-13-45',
    selectedSlots: {
      male: { timeSlot: '18:01', window: '18:00-18:20' },
      female: { timeSlot: '20:01', window: '20:00-20:20' },
    },
  });
  assert.equal(invalidCalendarDate.ok, false);

  const futureBirthDate = parseCustomerOrderInput({
    ...base,
    passengers: [
      { ...base.passengers[0], birthDate: '2099-01-01' },
      base.passengers[1],
    ],
    selectedSlots: {
      male: { timeSlot: '18:01', window: '18:00-18:20' },
      female: { timeSlot: '20:01', window: '20:00-20:20' },
    },
  });
  assert.equal(futureBirthDate.ok, false);
});

void test('mock provider returns irregular API-driven slots', async () => {
  const provider = new MockRawdahProvider();
  const availability = await provider.getAvailability('2026-09-05');
  assert.equal(
    availability.slots.some((slot) => slot.window === '11:20-11:40'),
    true,
  );
  assert.equal(
    availability.slots.some((slot) => slot.available === 0),
    true,
  );
  assert.equal(availability.hasBalance, true);
});

void test('same idempotency key returns the same transaction', async () => {
  const provider = new MockRawdahProvider();
  const command = {
    agencyId: 'a1',
    idempotencyKey: 'same-command',
    dateKey: '2026-09-05',
    timeSlot: '08:00',
    gender: 'female' as const,
    count: 2,
  };
  const first = await provider.purchase(command);
  const second = await provider.purchase(command);
  assert.deepEqual(second, first);
});

void test('live provider is hard-disabled before Phase -1', async () => {
  const provider = new LiveRawdahProviderDisabled();
  await assert.rejects(
    () => provider.getAvailability('2026-09-05'),
    /disabled until Phase -1/,
  );
});

void test('read-only provider maps live calendar values without enabling purchase', async () => {
  const responses = [
    Response.json({ token: 'test-token' }),
    Response.json({
      success: true,
      hasBalance: false,
      dataMale: { '2026-09-05': { '13:20': 3, '13:40': -1 } },
      dataFemale: { '2026-09-05': { '21:00': 2 } },
    }),
  ];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    fetchFn: async () =>
      responses.shift() ?? Response.json({}, { status: 500 }),
  });

  const availability = await provider.getAvailability('2026-09-05');
  assert.equal(availability.hasBalance, false);
  assert.deepEqual(availability.slots, [
    {
      date: '2026-09-05',
      timeSlot: '13:20',
      window: '13:20-13:40',
      gender: 'male',
      available: 3,
    },
    {
      date: '2026-09-05',
      timeSlot: '13:40',
      window: '13:40-14:00',
      gender: 'male',
      available: 0,
    },
    {
      date: '2026-09-05',
      timeSlot: '21:00',
      window: '21:00-21:20',
      gender: 'female',
      available: 2,
    },
  ]);
  await assert.rejects(
    () =>
      provider.purchase({
        agencyId: 'a1',
        idempotencyKey: 'k1',
        dateKey: '2026-09-05',
        timeSlot: '13:20',
        gender: 'male',
        count: 1,
      }),
    /write operations are disabled/,
  );
});

void test('partner authentication uses the official path and caches only until expiry', async () => {
  const calls: string[] = [];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    fetchFn: async (input) => {
      const inputUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push(inputUrl);
      if (inputUrl.endsWith('/api/Auth/login')) {
        return Response.json({
          token: 'test-token',
          expiresAt: '2099-01-01T00:00:00Z',
        });
      }
      return Response.json({
        success: true,
        hasBalance: true,
        dataMale: {},
        dataFemale: {},
      });
    },
  });

  await provider.getAvailability('2026-09-05');
  await provider.getAvailability('2026-09-06');

  assert.equal(
    calls.filter((url) => url.endsWith('/api/Auth/login')).length,
    1,
  );
  assert.equal(
    calls.filter((url) => url.includes('/GetBookedAppointments?')).length,
    2,
  );
});

void test('environment factory sends credentials only to the allowlisted HTTPS origin', () => {
  const credentials = {
    NODE_ENV: 'test' as const,
    RAWDAH_EMAIL: 'local@example.test',
    RAWDAH_PASSWORD: 'not-a-real-password',
  };

  assert.doesNotThrow(() =>
    createLiveRawdahProviderFromEnv({
      ...credentials,
      RAWDAH_BASE_URL: 'https://rawdahbooking.com/',
    }),
  );
  for (const baseUrl of [
    'http://rawdahbooking.com',
    'https://example.test',
    'https://rawdahbooking.com.evil.test',
    'https://user:password@rawdahbooking.com',
    'https://rawdahbooking.com/api',
  ]) {
    assert.throws(
      () =>
        createLiveRawdahProviderFromEnv({
          ...credentials,
          RAWDAH_BASE_URL: baseUrl,
        }),
      /Untrusted Rawdah base URL/,
    );
  }
});

void test('live purchase maps the verified contract without an automatic retry', async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const responses = [
    Response.json({ token: 'test-token' }),
    Response.json({
      success: true,
      purchasedCount: 2,
      remainingBalance: 23,
      orderId: 9001,
      balanceCharged: 2,
      discountApplied: false,
      discountCampaignName: null,
    }),
  ];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    writeEnabled: true,
    fetchFn: async (input, init) => {
      const inputUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push({ input: inputUrl, init });
      return responses.shift() ?? Response.json({}, { status: 500 });
    },
  });

  const result = await provider.purchase({
    agencyId: 'a1',
    idempotencyKey: 'local-correlation-1',
    dateKey: '2026-07-05',
    timeSlot: '18:01',
    gender: 'male',
    count: 2,
    groupCode: 'GRP-DEMO',
  });

  assert.equal(calls.length, 2);
  assert.equal(
    calls[1]?.input,
    'https://example.test/api/AppointmentQueue/PurchaseAppointments',
  );
  const purchaseBody = calls[1]?.init?.body;
  assert.equal(typeof purchaseBody, 'string');
  assert.deepEqual(JSON.parse(purchaseBody as string), {
    dateKey: '2026-07-05',
    timeSlot: '18:01',
    genderId: 'Male',
    quantity: 2,
    groupCode: 'GRP-DEMO',
  });
  assert.equal(
    new Headers(calls[1]?.init?.headers).has('idempotency-key'),
    false,
  );
  assert.equal(
    new Headers(calls[1]?.init?.headers).get('authorization'),
    'Bearer test-token',
  );
  assert.equal(new Headers(calls[1]?.init?.headers).has('cookie'), false);
  assert.deepEqual(result, {
    transactionId: '9001',
    status: 'completed',
    purchasedCount: 2,
    remainingBalance: 23,
    balanceCharged: 2,
    discountApplied: false,
    discountCampaignName: null,
  });
});

void test('live purchase marks server ambiguity unknown and does not retry', async () => {
  let callCount = 0;
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    writeEnabled: true,
    fetchFn: async () => {
      callCount += 1;
      return callCount === 1
        ? Response.json({ token: 'test-token' })
        : Response.json({}, { status: 500 });
    },
  });

  const result = await provider.purchase({
    agencyId: 'a1',
    idempotencyKey: 'local-correlation-2',
    dateKey: '2026-07-05',
    timeSlot: '18:01',
    gender: 'female',
    count: 1,
  });

  assert.equal(callCount, 2);
  assert.deepEqual(result, {
    transactionId: 'local-correlation-2',
    status: 'unknown',
  });
});

void test('live QR groups preserve stable provider filter keys', async () => {
  const responses = [
    Response.json({ token: 'test-token' }),
    Response.json({
      success: true,
      count: 1,
      data: [
        {
          dateKey: '2026-07-05',
          groupCode: 'GRP-DEMO',
          appointmentTime: '18:00-18:20',
          genderId: 8,
          gender: 'Male',
          purchaseId: 501,
          printGuid: null,
          confirmedCount: 2,
          printedCount: 0,
          totalCount: 2,
          groupKey: '2026-07-05_GRP-DEMO_18:00-18:20_8_501_null',
        },
      ],
    }),
  ];
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    fetchFn: async (input, init) => {
      const inputUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push({ input: inputUrl, init });
      return responses.shift() ?? Response.json({}, { status: 500 });
    },
  });

  const groups = await provider.getQrGroups();

  assert.equal(calls.length, 2);
  assert.equal(
    calls[1]?.input,
    'https://example.test/api/QRCode/GetPrintGroups',
  );
  assert.equal(calls[1]?.init?.method, 'GET');
  assert.deepEqual(groups, [
    {
      dateKey: '2026-07-05',
      groupCode: 'GRP-DEMO',
      appointmentTime: '18:00-18:20',
      genderId: 8,
      gender: 'Male',
      purchaseId: '501',
      printGuid: null,
      confirmedCount: 2,
      printedCount: 0,
      totalCount: 2,
      groupKey: '2026-07-05_GRP-DEMO_18:00-18:20_8_501_null',
    },
  ]);
});

void test('live QR passengers use the documented filters and parse status metadata', async () => {
  const responses = [
    Response.json({ token: 'test-token' }),
    Response.json({
      success: true,
      count: 1,
      withQrCount: 1,
      data: [
        {
          id: 10001,
          name: 'Ali',
          surname: 'Demo',
          groupCode: 'GRP-DEMO',
          appointmentDate: '2026-07-05T00:00:00Z',
          appointmentTime: '18:00-18:20',
          appointmentStatus: 2,
          genderId: 8,
          gender: 'Male',
          purchaseId: 501,
          printGuid: null,
          hasQr: true,
          isDisabled: false,
          isAppointmentPast: false,
          ravzaReservationId: 'RES-12345',
          nusukStatus: 'Confirmed',
        },
      ],
    }),
  ];
  const calls: string[] = [];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    fetchFn: async (input) => {
      const inputUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push(inputUrl);
      return responses.shift() ?? Response.json({}, { status: 500 });
    },
  });

  const result = await provider.getQrPassengers({
    date: '2026-07-05',
    groupCode: 'GRP-DEMO',
    appointmentTime: '18:00-18:20',
    genderId: 8,
    purchaseId: 501,
    printGuid: null,
    status: 'WithQr',
  });

  const requestUrl = new URL(calls[1] ?? 'https://invalid.test');
  assert.equal(requestUrl.pathname, '/api/QRCode/GetPrintListPassengers');
  assert.equal(requestUrl.searchParams.get('date'), '2026-07-05');
  assert.equal(requestUrl.searchParams.get('groupCode'), 'GRP-DEMO');
  assert.equal(requestUrl.searchParams.get('appointmentTime'), '18:00-18:20');
  assert.equal(requestUrl.searchParams.get('genderId'), '8');
  assert.equal(requestUrl.searchParams.get('purchaseId'), '501');
  assert.equal(requestUrl.searchParams.has('printGuid'), false);
  assert.equal(requestUrl.searchParams.get('status'), 'WithQr');
  assert.equal(result.count, 1);
  assert.equal(result.withQrCount, 1);
  assert.deepEqual(result.passengers[0], {
    id: '10001',
    name: 'Ali',
    surname: 'Demo',
    groupCode: 'GRP-DEMO',
    appointmentDate: '2026-07-05T00:00:00Z',
    appointmentTime: '18:00-18:20',
    appointmentStatus: 2,
    genderId: 8,
    gender: 'Male',
    purchaseId: '501',
    printGuid: null,
    hasQr: true,
    isDisabled: false,
    isAppointmentPast: false,
    ravzaReservationId: 'RES-12345',
    nusukStatus: 'Confirmed',
  });
});

void test('QR PDF export validates the binary response and marked count', async () => {
  const responses = [
    Response.json({ token: 'test-token' }),
    new Response('%PDF-1.4 fake', {
      headers: {
        'content-type': 'application/pdf',
        'x-marked-count': '2',
      },
    }),
  ];
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    pdfExportEnabled: true,
    fetchFn: async (input, init) => {
      const inputUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push({ input: inputUrl, init });
      return responses.shift() ?? Response.json({}, { status: 500 });
    },
  });

  const result = await provider.exportQrPdf({
    passengerIds: [101, 102],
    groupName: null,
  });

  assert.equal(calls.length, 2);
  assert.equal(
    calls[1]?.input,
    'https://example.test/api/QRCode/ExportPrintListPdf',
  );
  assert.equal(calls[1]?.init?.method, 'POST');
  const exportBody = calls[1]?.init?.body;
  assert.equal(typeof exportBody, 'string');
  assert.deepEqual(JSON.parse(exportBody as string), {
    passengerIds: [101, 102],
    groupName: null,
    template: 'New',
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.markedCount, 2);
  assert.equal(
    result.pdf ? new TextDecoder().decode(result.pdf) : '',
    '%PDF-1.4 fake',
  );
});

void test('QR PDF export remains disabled independently from purchase', async () => {
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    writeEnabled: true,
    fetchFn: async () => Response.json({ token: 'unused' }),
  });

  await assert.rejects(
    () => provider.exportQrPdf({ passengerIds: [101] }),
    /PDF export is disabled/,
  );
});

void test('share-link creation validates the anonymous destination', async () => {
  const responses = [
    Response.json({ token: 'test-token' }),
    Response.json({
      success: true,
      code: 'Ab3xY',
      url: 'https://rwdh.link/Ab3xY',
      passengerCount: 2,
    }),
  ];
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    shareLinkEnabled: true,
    fetchFn: async (input, init) => {
      const inputUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push({ input: inputUrl, init });
      return responses.shift() ?? Response.json({}, { status: 500 });
    },
  });

  const result = await provider.createShareLink({
    date: '2026-07-05',
    groupCode: 'GRP-DEMO',
    appointmentTime: '18:00-18:20',
    genderId: 8,
    purchaseId: 501,
    printGuid: null,
    personCount: 2,
    shareGroupName: null,
  });

  assert.equal(calls.length, 2);
  assert.equal(
    calls[1]?.input,
    'https://example.test/api/QRCode/CreatePrintShareLink',
  );
  const shareBody = calls[1]?.init?.body;
  assert.equal(typeof shareBody, 'string');
  assert.deepEqual(JSON.parse(shareBody as string), {
    date: '2026-07-05',
    groupCode: 'GRP-DEMO',
    appointmentTime: '18:00-18:20',
    genderId: 8,
    purchaseId: 501,
    personCount: 2,
    shareGroupName: null,
  });
  assert.deepEqual(result, {
    status: 'completed',
    code: 'Ab3xY',
    url: 'https://rwdh.link/Ab3xY',
    passengerCount: 2,
  });
});

void test('share-link creation rejects an untrusted response URL', async () => {
  const responses = [
    Response.json({ token: 'test-token' }),
    Response.json({
      success: true,
      code: 'Ab3xY',
      url: 'https://example.test/Ab3xY',
      passengerCount: 2,
    }),
  ];
  const provider = new LiveRawdahReadOnlyProvider({
    baseUrl: 'https://example.test',
    email: 'local@example.test',
    password: 'not-a-real-password',
    shareLinkEnabled: true,
    fetchFn: async () =>
      responses.shift() ?? Response.json({}, { status: 500 }),
  });

  assert.deepEqual(await provider.createShareLink({ date: '2026-07-05' }), {
    status: 'unknown',
  });
});

void test('role resolution is deny-by-default and super admin takes precedence', () => {
  const env = {
    APP_ADMIN_EMAILS: 'admin@example.test, shared@example.test',
    APP_SUPER_ADMIN_EMAILS: 'owner@example.test, shared@example.test',
  };

  assert.equal(resolveAppRole('staff@example.test', env), 'STAFF');
  assert.equal(resolveAppRole('ADMIN@example.test', env), 'AGENCY_ADMIN');
  assert.equal(resolveAppRole('shared@example.test', env), 'SUPER_ADMIN');
});

void test('Umrah package sales require every documentary gate', () => {
  const blocked = getUmrahPackageStatus({
    UMRAH_PACKAGE_ENABLED: 'true',
    UMRAH_PACKAGE_MODEL: 'own',
    TRAVEL_AGENCY_AUTHORITY_VERIFIED: 'true',
    DIYANET_UMRAH_AUTHORITY_VERIFIED: 'false',
    PACKAGE_TOUR_CONTRACT_APPROVED: 'true',
    PACKAGE_TOUR_INSURANCE_VERIFIED: 'true',
  });
  assert.equal(blocked.requested, true);
  assert.equal(blocked.packageModel, 'own');
  assert.equal(blocked.enabled, false);

  const ready = getUmrahPackageStatus({
    UMRAH_PACKAGE_ENABLED: 'true',
    UMRAH_PACKAGE_MODEL: 'own',
    TRAVEL_AGENCY_AUTHORITY_VERIFIED: 'true',
    DIYANET_UMRAH_AUTHORITY_VERIFIED: 'true',
    PACKAGE_TOUR_CONTRACT_APPROVED: 'true',
    PACKAGE_TOUR_INSURANCE_VERIFIED: 'true',
  });
  assert.equal(ready.enabled, true);

  const missingModel = getUmrahPackageStatus({
    UMRAH_PACKAGE_ENABLED: 'true',
    TRAVEL_AGENCY_AUTHORITY_VERIFIED: 'true',
    DIYANET_UMRAH_AUTHORITY_VERIFIED: 'true',
    PACKAGE_TOUR_CONTRACT_APPROVED: 'true',
    PACKAGE_TOUR_INSURANCE_VERIFIED: 'true',
  });
  assert.equal(missingModel.packageModel, 'undecided');
  assert.equal(missingModel.enabled, false);
});

void test('customer USD checkout requires a positive price and every sales gate', () => {
  const base = {
    UMRAH_PACKAGE_ENABLED: 'true',
    UMRAH_PACKAGE_MODEL: 'own',
    TRAVEL_AGENCY_AUTHORITY_VERIFIED: 'true',
    DIYANET_UMRAH_AUTHORITY_VERIFIED: 'true',
    PACKAGE_TOUR_CONTRACT_APPROVED: 'true',
    PACKAGE_TOUR_INSURANCE_VERIFIED: 'true',
    IYZICO_BASE_URL: 'https://sandbox-api.iyzipay.com',
    IYZICO_API_KEY: 'test-key',
    IYZICO_SECRET_KEY: 'test-secret',
    PAYMENT_DEFAULT_CURRENCY: 'USD',
    PAYMENT_CHECKOUT_ENABLED: 'true',
    PAYMENT_DOMESTIC_USD_REQUIRED: 'true',
  };

  const missingPrice = getCustomerOfferStatus(base);
  assert.equal(missingPrice.priceReady, false);
  assert.equal(missingPrice.checkoutReady, false);

  const foreignReady = getCustomerOfferStatus({
    ...base,
    UMRAH_PACKAGE_PRICE_USD: '1490',
  });
  assert.equal(foreignReady.currency, 'USD');
  assert.equal(foreignReady.pricePerPersonUsd, 1490);
  assert.equal(foreignReady.checkoutReady, true);
  assert.equal(foreignReady.domesticCheckoutReady, false);

  const domesticReady = getCustomerOfferStatus({
    ...base,
    UMRAH_PACKAGE_PRICE_USD: '1490',
    PAYMENT_DOMESTIC_USD_LEGAL_APPROVED: 'true',
  });
  assert.equal(domesticReady.domesticCheckoutReady, true);
});

void test('iyzico authorization uses the documented IYZWSv2 HMAC payload', async () => {
  const body = JSON.stringify({ locale: 'tr', conversationId: 'conv-1' });
  const signed = await createIyzicoAuthorization(
    'sandbox-api-key',
    'sandbox-secret',
    '/payment/bin/check',
    body,
    'fixed-random',
  );
  const signature = createHmac('sha256', 'sandbox-secret')
    .update(`fixed-random/payment/bin/check${body}`)
    .digest('hex');
  const expected = Buffer.from(
    `apiKey:sandbox-api-key&randomKey:fixed-random&signature:${signature}`,
  ).toString('base64');

  assert.equal(signed.randomKey, 'fixed-random');
  assert.equal(signed.authorization, `IYZWSv2 ${expected}`);
});

void test('iyzico hosted payment webhook signature is validated', async () => {
  const payload = {
    iyziEventType: 'CHECKOUT_FORM_AUTH',
    iyziPaymentId: 'payment-1',
    token: 'token-1',
    paymentConversationId: 'conversation-1',
    status: 'SUCCESS',
  };
  const message =
    'sandbox-secret' +
    payload.iyziEventType +
    payload.iyziPaymentId +
    payload.token +
    payload.paymentConversationId +
    payload.status;
  const signature = createHmac('sha256', 'sandbox-secret')
    .update(message)
    .digest('hex');

  assert.equal(
    await verifyIyzicoHppWebhook('sandbox-secret', payload, signature),
    true,
  );
  assert.equal(
    await verifyIyzicoHppWebhook('sandbox-secret', payload, 'wrong'),
    false,
  );
});

void test('payment checkout remains closed unless credentials and flag exist', () => {
  const closed = getIyzicoConfigurationStatus({
    IYZICO_BASE_URL: IYZICO_SANDBOX_URL,
  });
  assert.equal(closed.configured, false);
  assert.equal(closed.checkoutEnabled, false);
  assert.equal(closed.defaultCurrency, 'USD');

  const sandbox = getIyzicoConfigurationStatus({
    IYZICO_BASE_URL: IYZICO_SANDBOX_URL,
    IYZICO_API_KEY: 'key',
    IYZICO_SECRET_KEY: 'secret',
    PAYMENT_CHECKOUT_ENABLED: 'true',
  });
  assert.equal(sandbox.configured, true);
  assert.equal(sandbox.checkoutEnabled, true);
  assert.equal(sandbox.livePaymentsEnabled, false);
  assert.equal(sandbox.defaultCurrency, 'USD');
  assert.equal(sandbox.domesticCheckoutEnabled, false);

  const domesticBlocked = getPaymentQuotePolicy('TR', {
    IYZICO_BASE_URL: IYZICO_SANDBOX_URL,
    IYZICO_API_KEY: 'key',
    IYZICO_SECRET_KEY: 'secret',
    PAYMENT_DEFAULT_CURRENCY: 'USD',
    CUSTOMER_TURKISH_SHARE_PERCENT: '80',
    TURKISH_CUSTOMER_TURKEY_RESIDENT_SHARE_PERCENT: '99',
    PAYMENT_DOMESTIC_USD_REQUIRED: 'true',
    PAYMENT_CHECKOUT_ENABLED: 'true',
  });
  assert.deepEqual(domesticBlocked, {
    currency: 'USD',
    checkoutAllowed: false,
    reason: 'domestic_usd_legal_review',
  });

  const internationalReady = getPaymentQuotePolicy('NON_TR', {
    IYZICO_BASE_URL: IYZICO_SANDBOX_URL,
    IYZICO_API_KEY: 'key',
    IYZICO_SECRET_KEY: 'secret',
    PAYMENT_DEFAULT_CURRENCY: 'USD',
    CUSTOMER_TURKISH_SHARE_PERCENT: '80',
    TURKISH_CUSTOMER_TURKEY_RESIDENT_SHARE_PERCENT: '99',
    PAYMENT_DOMESTIC_USD_REQUIRED: 'true',
    PAYMENT_CHECKOUT_ENABLED: 'true',
  });
  assert.deepEqual(internationalReady, {
    currency: 'USD',
    checkoutAllowed: true,
    reason: 'ready',
  });
  const audience = getIyzicoConfigurationStatus({
    CUSTOMER_TURKISH_SHARE_PERCENT: '80',
    TURKISH_CUSTOMER_TURKEY_RESIDENT_SHARE_PERCENT: '99',
  });
  assert.equal(audience.turkishCustomerSharePercent, 80);
  assert.equal(audience.turkishCustomerTurkeyResidentSharePercent, 99);

  const domesticApproved = getPaymentQuotePolicy('TR', {
    IYZICO_BASE_URL: IYZICO_SANDBOX_URL,
    IYZICO_API_KEY: 'key',
    IYZICO_SECRET_KEY: 'secret',
    PAYMENT_DEFAULT_CURRENCY: 'USD',
    PAYMENT_DOMESTIC_USD_REQUIRED: 'true',
    PAYMENT_CHECKOUT_ENABLED: 'true',
    PAYMENT_DOMESTIC_USD_LEGAL_APPROVED: 'true',
  });
  assert.deepEqual(domesticApproved, {
    currency: 'USD',
    checkoutAllowed: true,
    reason: 'ready',
  });

  const domesticTryFallbackRejected = getIyzicoConfigurationStatus({
    IYZICO_BASE_URL: IYZICO_SANDBOX_URL,
    IYZICO_API_KEY: 'key',
    IYZICO_SECRET_KEY: 'secret',
    PAYMENT_DEFAULT_CURRENCY: 'TRY',
    PAYMENT_DOMESTIC_USD_REQUIRED: 'true',
    PAYMENT_CHECKOUT_ENABLED: 'true',
  });
  assert.equal(domesticTryFallbackRejected.domesticUsdRequired, true);
  assert.equal(domesticTryFallbackRejected.configured, false);
  assert.equal(domesticTryFallbackRejected.checkoutEnabled, false);

  const unsupportedCurrency = getIyzicoConfigurationStatus({
    IYZICO_BASE_URL: IYZICO_SANDBOX_URL,
    IYZICO_API_KEY: 'key',
    IYZICO_SECRET_KEY: 'secret',
    PAYMENT_DEFAULT_CURRENCY: 'SAR',
    PAYMENT_CHECKOUT_ENABLED: 'true',
  });
  assert.equal(unsupportedCurrency.configured, false);
  assert.equal(unsupportedCurrency.checkoutEnabled, false);
  assert.equal(unsupportedCurrency.defaultCurrency, 'USD');

  const untrusted = getIyzicoConfigurationStatus({
    IYZICO_BASE_URL: 'https://payments.example.test',
    IYZICO_API_KEY: 'key',
    IYZICO_SECRET_KEY: 'secret',
    PAYMENT_CHECKOUT_ENABLED: 'true',
  });
  assert.equal(untrusted.trustedBaseUrl, false);
  assert.equal(untrusted.configured, false);
  assert.equal(untrusted.checkoutEnabled, false);
});

void test('Rawdah appointment gate mapping distinguishes gender rules', () => {
  const maleGate = (gender: 'male' | 'female') =>
    gender === 'female' ? 'Kapı 25 (Bab-ı Osman)' : 'Kapı 38 (Bab-ül Baki)';

  assert.equal(maleGate('male'), 'Kapı 38 (Bab-ül Baki)');
  assert.equal(maleGate('female'), 'Kapı 25 (Bab-ı Osman)');
});
