import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const agencies = sqliteTable('agencies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status', { enum: ['pending', 'active', 'suspended'] })
    .notNull()
    .default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id').references(() => agencies.id),
    email: text('email').notNull(),
    role: text('role', {
      enum: ['SUPER_ADMIN', 'AGENCY_ADMIN', 'STAFF'],
    }).notNull(),
    status: text('status', { enum: ['active', 'suspended'] })
      .notNull()
      .default('active'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_users_email').on(table.email),
    index('idx_users_agency').on(table.agencyId),
  ],
);

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    idempotencyKey: text('idempotency_key').notNull(),
    providerTransactionId: text('provider_transaction_id'),
    status: text('status', {
      enum: [
        'created',
        'credits_reserved',
        'provider_pending',
        'completed',
        'failed',
        'unknown',
        'reconciled',
        'qr_pending',
        'qr_ready',
        'qr_missed',
      ],
    })
      .notNull()
      .default('created'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_orders_agency_idempotency').on(
      table.agencyId,
      table.idempotencyKey,
    ),
    index('idx_orders_agency_status').on(table.agencyId, table.status),
  ],
);

export const creditLedger = sqliteTable(
  'credit_ledger',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    orderId: text('order_id').references(() => orders.id),
    amount: integer('amount').notNull(),
    type: text('type', {
      enum: [
        'purchase',
        'reservation',
        'release',
        'consumption',
        'refund',
        'adjustment',
      ],
    }).notNull(),
    referenceKey: text('reference_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_credit_ledger_reference').on(table.referenceKey),
    index('idx_credit_ledger_agency_created').on(
      table.agencyId,
      table.createdAt,
    ),
  ],
);

export const paymentAttempts = sqliteTable(
  'payment_attempts',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider', { enum: ['iyzico'] }).notNull(),
    environment: text('environment', { enum: ['sandbox', 'live'] }).notNull(),
    packageCode: text('package_code').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency', {
      enum: ['USD', 'TRY', 'EUR', 'GBP', 'NOK', 'CHF'],
    })
      .notNull()
      .default('USD'),
    conversationId: text('conversation_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    providerPaymentId: text('provider_payment_id'),
    checkoutTokenHash: text('checkout_token_hash'),
    status: text('status', {
      enum: [
        'created',
        'session_created',
        'pending',
        'succeeded',
        'failed',
        'cancelled',
        'reconciled',
      ],
    })
      .notNull()
      .default('created'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_payment_attempts_conversation').on(table.conversationId),
    uniqueIndex('uq_payment_attempts_agency_idempotency').on(
      table.agencyId,
      table.idempotencyKey,
    ),
    index('idx_payment_attempts_agency_status').on(
      table.agencyId,
      table.status,
    ),
  ],
);

export const paymentWebhookEvents = sqliteTable(
  'payment_webhook_events',
  {
    id: text('id').primaryKey(),
    paymentAttemptId: text('payment_attempt_id').references(
      () => paymentAttempts.id,
    ),
    providerEventKey: text('provider_event_key').notNull(),
    eventType: text('event_type').notNull(),
    status: text('status').notNull(),
    payloadHash: text('payload_hash').notNull(),
    receivedAt: integer('received_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_payment_webhook_event_key').on(table.providerEventKey),
    index('idx_payment_webhook_attempt').on(table.paymentAttemptId),
  ],
);

export const umrahPackages = sqliteTable(
  'umrah_packages',
  {
    id: text('id').primaryKey(),
    productType: text('product_type', { enum: ['hajj', 'umrah'] })
      .notNull()
      .default('umrah'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('draft'),
    departureCity: text('departure_city'),
    departureDate: text('departure_date'),
    returnDate: text('return_date'),
    makkahNights: integer('makkah_nights').notNull().default(0),
    medinaNights: integer('medina_nights').notNull().default(0),
    priceMinor: integer('price_minor'),
    currency: text('currency', { enum: ['USD'] })
      .notNull()
      .default('USD'),
    includedServicesJson: text('included_services_json')
      .notNull()
      .default('[]'),
    updatedBy: text('updated_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_umrah_packages_slug').on(table.slug),
    index('idx_umrah_packages_status_departure').on(
      table.status,
      table.departureDate,
    ),
  ],
);

export const customerOrders = sqliteTable(
  'customer_orders',
  {
    id: text('id').primaryKey(),
    customerUserId: text('customer_user_id').notNull(),
    customerEmail: text('customer_email').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone').notNull(),
    residenceCountry: text('residence_country').notNull().default(''),
    residenceCity: text('residence_city').notNull().default(''),
    departureLocation: text('departure_location').notNull().default(''),
    packageId: text('package_id')
      .notNull()
      .references(() => umrahPackages.id),
    packageName: text('package_name').notNull(),
    productType: text('product_type', { enum: ['hajj', 'umrah'] })
      .notNull()
      .default('umrah'),
    status: text('status', {
      enum: ['awaiting_payment', 'payment_pending', 'confirmed', 'cancelled'],
    })
      .notNull()
      .default('awaiting_payment'),
    passengerCount: integer('passenger_count').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency', { enum: ['USD'] })
      .notNull()
      .default('USD'),
    departureCity: text('departure_city').notNull(),
    departureDate: text('departure_date').notNull(),
    returnDate: text('return_date').notNull(),
    ravzaVisitDate: text('ravza_visit_date').notNull(),
    ravzaSelectionsJson: text('ravza_selections_json').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_customer_orders_user_idempotency').on(
      table.customerUserId,
      table.idempotencyKey,
    ),
    index('idx_customer_orders_user_created').on(
      table.customerUserId,
      table.createdAt,
    ),
    index('idx_customer_orders_status').on(table.status),
  ],
);

export const customerOrderPassengers = sqliteTable(
  'customer_order_passengers',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => customerOrders.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    gender: text('gender', { enum: ['male', 'female'] }).notNull(),
    birthDate: text('birth_date').notNull().default(''),
    nationality: text('nationality').notNull().default(''),
    visaStatus: text('visa_status', {
      enum: ['pending', 'applied', 'approved', 'rejected'],
    })
      .notNull()
      .default('pending'),
    visaNumber: text('visa_number').notNull().default(''),
    appointmentStatus: text('appointment_status', {
      enum: ['pending', 'booked', 'qr_ready', 'failed'],
    })
      .notNull()
      .default('pending'),
    appointmentDate: text('appointment_date').notNull().default(''),
    appointmentTime: text('appointment_time').notNull().default(''),
    appointmentGate: text('appointment_gate').notNull().default(''),
    qrPayload: text('qr_payload').notNull().default(''),
    rawdahPermitId: text('rawdah_permit_id').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('idx_customer_order_passengers_order').on(table.orderId)],
);

export const qrGroups = sqliteTable(
  'qr_groups',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id),
    groupCode: text('group_code').notNull(),
    appointmentWindowStart: integer('appointment_window_start', {
      mode: 'timestamp',
    }).notNull(),
    appointmentWindowEnd: integer('appointment_window_end', {
      mode: 'timestamp',
    }).notNull(),
    sourceTimezone: text('source_timezone').notNull().default('Asia/Riyadh'),
    status: text('status', {
      enum: ['scheduled', 'pending', 'ready', 'missed'],
    }).notNull(),
    providerLinkRef: text('provider_link_ref'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_qr_groups_order').on(table.orderId),
    index('idx_qr_groups_status_window').on(
      table.status,
      table.appointmentWindowStart,
    ),
  ],
);

export const supportTickets = sqliteTable(
  'support_tickets',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    category: text('category', {
      enum: ['payment', 'appointment', 'qr', 'other'],
    }).notNull(),
    subject: text('subject').notNull(),
    status: text('status', { enum: ['open', 'waiting', 'resolved'] })
      .notNull()
      .default('open'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_support_agency_status').on(table.agencyId, table.status),
  ],
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id').references(() => agencies.id),
    actorUserId: text('actor_user_id').references(() => users.id),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    correlationId: text('correlation_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_audit_agency_created').on(table.agencyId, table.createdAt),
  ],
);

export const creativeBriefs = sqliteTable('creative_briefs', {
  id: text('id').primaryKey(),
  version: text('version').notNull(),
  schemaJson: text('schema_json').notNull(),
  status: text('status', {
    enum: [
      'draft',
      'policy_review',
      'human_review',
      'approved',
      'published',
      'retired',
      'rejected',
    ],
  }).notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const creativeJobs = sqliteTable(
  'creative_jobs',
  {
    id: text('id').primaryKey(),
    briefId: text('brief_id')
      .notNull()
      .references(() => creativeBriefs.id),
    provider: text('provider').notNull(),
    modelSnapshot: text('model_snapshot').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    budgetCents: integer('budget_cents').notNull(),
    status: text('status', {
      enum: [
        'draft',
        'generating',
        'human_review',
        'approved',
        'published',
        'failed',
        'cancelled',
      ],
    }).notNull(),
    errorCode: text('error_code'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_creative_jobs_idempotency').on(table.idempotencyKey),
    index('idx_creative_jobs_brief').on(table.briefId),
  ],
);

export const demoAgencies = sqliteTable('demo_agencies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactMasked: text('contact_masked').notNull(),
  city: text('city').notNull(),
  status: text('status', { enum: ['pending', 'active', 'rejected'] }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const demoOrders = sqliteTable(
  'demo_orders',
  {
    id: text('id').primaryKey(),
    groupCode: text('group_code').notNull(),
    visitWindow: text('visit_window').notNull(),
    gender: text('gender', { enum: ['Kadın', 'Erkek'] }).notNull(),
    passengerCount: integer('passenger_count').notNull(),
    status: text('status', {
      enum: [
        'provider_pending',
        'qr_pending',
        'qr_ready',
        'unknown',
        'completed',
      ],
    }).notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_demo_orders_idempotency').on(table.idempotencyKey),
    index('idx_demo_orders_status_created').on(table.status, table.createdAt),
  ],
);

export const demoPassengers = sqliteTable(
  'demo_passengers',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    source: text('source', { enum: ['manual', 'excel_demo'] }).notNull(),
    status: text('status', { enum: ['validated', 'needs_review'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_demo_passengers_status_created').on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const demoTickets = sqliteTable(
  'demo_tickets',
  {
    id: text('id').primaryKey(),
    category: text('category', {
      enum: ['appointment', 'qr', 'payment', 'other'],
    }).notNull(),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    status: text('status', { enum: ['open', 'waiting', 'resolved'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_demo_tickets_status_created').on(table.status, table.createdAt),
  ],
);

export const demoLedger = sqliteTable(
  'demo_ledger',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id'),
    amount: integer('amount').notNull(),
    type: text('type', {
      enum: [
        'purchase',
        'reservation',
        'release',
        'consumption',
        'refund',
        'adjustment',
      ],
    }).notNull(),
    referenceKey: text('reference_key').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_demo_ledger_reference').on(table.referenceKey),
    index('idx_demo_ledger_created').on(table.createdAt),
  ],
);

export const demoAuditLogs = sqliteTable(
  'demo_audit_logs',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').notNull().default('system'),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    correlationId: text('correlation_id').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_demo_audit_created').on(table.createdAt)],
);

/**
 * Google (veya ileride başka bir sağlayıcı) ile giriş yapan hesabın kimliği.
 * Burada yalnız sağlayıcının döndürdüğü profil bilgisi tutulur; sağlayıcı
 * parolası ne alınır ne saklanır.
 */
export const authIdentities = sqliteTable(
  'auth_identities',
  {
    id: text('id').primaryKey(),
    provider: text('provider', { enum: ['google'] }).notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    fullName: text('full_name').notNull().default(''),
    givenName: text('given_name').notNull().default(''),
    familyName: text('family_name').notNull().default(''),
    pictureUrl: text('picture_url').notNull().default(''),
    locale: text('locale').notNull().default(''),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_auth_identities_provider_account').on(
      table.provider,
      table.providerAccountId,
    ),
    index('idx_auth_identities_email').on(table.email),
  ],
);

/**
 * Panel yöneticisinin kullanıcı adı + parola girişi. Parola düz metin olarak
 * hiçbir yerde tutulmaz: PBKDF2-SHA256 türetilmiş anahtar ve rastgele tuz
 * saklanır.
 */
export const adminCredentials = sqliteTable(
  'admin_credentials',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull().default(''),
    passwordHash: text('password_hash').notNull(),
    passwordSalt: text('password_salt').notNull(),
    iterations: integer('iterations').notNull().default(210000),
    status: text('status', { enum: ['active', 'suspended'] })
      .notNull()
      .default('active'),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: integer('locked_until', { mode: 'timestamp' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_admin_credentials_username').on(table.username),
    index('idx_admin_credentials_email').on(table.email),
  ],
);

/** Çerezle taşınan oturum. Çerezde yalnız rastgele jeton, tabloda SHA-256'sı durur. */
export const authSessions = sqliteTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    userId: text('user_id').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull().default(''),
    provider: text('provider', { enum: ['google', 'password'] }).notNull(),
    audience: text('audience', { enum: ['customer', 'staff', 'agency'] })
      .notNull()
      .default('customer'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_auth_sessions_token').on(table.tokenHash),
    index('idx_auth_sessions_user').on(table.userId),
    index('idx_auth_sessions_expiry').on(table.expiresAt),
  ],
);

/**
 * Müşterinin kalıcı profili. Google ile girişte ad, e-posta ve görsel otomatik
 * dolar; telefon, doğum tarihi, uyruk ve pasaport gibi seyahat için zorunlu
 * alanlar müşteriden istenir.
 */
export const customerProfiles = sqliteTable(
  'customer_profiles',
  {
    userId: text('user_id').primaryKey(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    birthDate: text('birth_date').notNull().default(''),
    gender: text('gender', { enum: ['male', 'female', ''] })
      .notNull()
      .default(''),
    nationality: text('nationality').notNull().default(''),
    passportNumber: text('passport_number').notNull().default(''),
    residenceCountry: text('residence_country').notNull().default(''),
    residenceCity: text('residence_city').notNull().default(''),
    preferredLocale: text('preferred_locale').notNull().default('tr'),
    source: text('source', { enum: ['google', 'manual'] })
      .notNull()
      .default('manual'),
    marketingOptIn: integer('marketing_opt_in', { mode: 'boolean' })
      .notNull()
      .default(false),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('idx_customer_profiles_email').on(table.email)],
);

/**
 * Giden bildirim kuyruğu.
 *
 * Bildirimler doğrudan gönderilmez, önce buraya yazılır. Kuyruk sayesinde:
 * gönderim hatası kaybolmaz (tekrar denenir), aynı bildirim iki kez gitmez
 * (`dedupe_key` benzersizdir) ve yönetici neyin ne zaman gittiğini görebilir.
 */
export const notificationOutbox = sqliteTable(
  'notification_outbox',
  {
    id: text('id').primaryKey(),
    dedupeKey: text('dedupe_key').notNull(),
    notificationKey: text('notification_key').notNull(),
    channel: text('channel', { enum: ['email', 'sms'] }).notNull(),
    audience: text('audience', { enum: ['customer', 'admin', 'agency'] })
      .notNull()
      .default('customer'),
    recipient: text('recipient').notNull(),
    recipientName: text('recipient_name').notNull().default(''),
    subject: text('subject').notNull().default(''),
    body: text('body').notNull(),
    relatedOrderId: text('related_order_id').notNull().default(''),
    status: text('status', {
      enum: ['queued', 'sent', 'failed', 'cancelled', 'skipped'],
    })
      .notNull()
      .default('queued'),
    sendAfter: integer('send_after', { mode: 'timestamp' }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error').notNull().default(''),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_notification_outbox_dedupe').on(
      table.dedupeKey,
      table.channel,
    ),
    index('idx_notification_outbox_due').on(table.status, table.sendAfter),
    index('idx_notification_outbox_order').on(table.relatedOrderId),
  ],
);

/** Parola yenileme jetonu. Tabloda yalnız jetonun SHA-256 özeti tutulur. */
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    adminId: text('admin_id')
      .notNull()
      .references(() => adminCredentials.id),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_password_reset_token').on(table.tokenHash),
    index('idx_password_reset_admin').on(table.adminId),
  ],
);

/**
 * Randevu paketleri: kişi sayısına göre toplu satış katmanları.
 * Çok dilli alanlar JSON olarak tutulur; D1 üzerinde ayrı çeviri tablosu
 * bu ölçek için gereksiz karmaşıklık olurdu.
 */
export const appointmentPackages = sqliteTable(
  'appointment_packages',
  {
    id: text('id').primaryKey(),
    code: text('code', {
      enum: ['solo', 'family', 'group', 'kafile', 'agency', 'custom'],
    }).notNull(),
    nameJson: text('name_json').notNull(),
    personCount: integer('person_count').notNull(),
    pricePerPersonMinor: integer('price_per_person_minor'),
    currency: text('currency').notNull().default('USD'),
    includedJson: text('included_json').notNull().default('[]'),
    excludedJson: text('excluded_json').notNull().default('[]'),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('draft'),
    highlight: integer('highlight').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_appointment_packages_code').on(table.code),
    index('idx_appointment_packages_status').on(table.status, table.sortOrder),
  ],
);

/**
 * Talep kayıtları. Tahsilat site üzerinden yapılmadığı için sipariş
 * yerine "talep" tutulur: fiyat ve ödeme WhatsApp/telefon görüşmesinde
 * konuşulur, sonuç operasyon tarafından bu kayda işlenir.
 */
export const quoteRequests = sqliteTable(
  'quote_requests',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    service: text('service', { enum: ['rawdah', 'umrah', 'bulk'] }).notNull(),
    packageCode: text('package_code').notNull(),
    personCount: integer('person_count').notNull(),
    femaleCount: integer('female_count').notNull(),
    maleCount: integer('male_count').notNull(),
    dateFrom: text('date_from').notNull(),
    dateTo: text('date_to').notNull(),
    flexible: integer('flexible').notNull().default(0),
    timePreference: text('time_preference').notNull().default('any'),
    fullName: text('full_name').notNull(),
    phoneE164: text('phone_e164').notNull(),
    email: text('email'),
    note: text('note'),
    locale: text('locale').notNull().default('tr'),
    channel: text('channel', {
      enum: ['whatsapp', 'email', 'phone', 'panel'],
    })
      .notNull()
      .default('whatsapp'),
    sourcePath: text('source_path'),
    status: text('status', {
      enum: [
        'new',
        'contacted',
        'quoted',
        'confirmed',
        'scheduled',
        'qr_ready',
        'delivered',
        'closed',
        'cancelled',
        'expired',
      ],
    })
      .notNull()
      .default('new'),
    assignedTo: text('assigned_to'),
    quotedAmountMinor: integer('quoted_amount_minor'),
    quotedCurrency: text('quoted_currency'),
    paymentMethod: text('payment_method'),
    paymentNote: text('payment_note'),
    kvkkConsentVersion: text('kvkk_consent_version').notNull(),
    kvkkConsentAt: integer('kvkk_consent_at').notNull(),
    marketingConsent: integer('marketing_consent').notNull().default(0),
    ipHash: text('ip_hash'),
    userAgentHash: text('user_agent_hash'),
    anonymizedAt: integer('anonymized_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_quote_requests_code').on(table.code),
    index('idx_quote_requests_status_created').on(table.status, table.createdAt),
    index('idx_quote_requests_ip_created').on(table.ipHash, table.createdAt),
  ],
);

export const quoteRequestEvents = sqliteTable(
  'quote_request_events',
  {
    id: text('id').primaryKey(),
    quoteRequestId: text('quote_request_id')
      .notNull()
      .references(() => quoteRequests.id),
    type: text('type', {
      enum: ['status_change', 'note', 'contact'],
    }).notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    body: text('body'),
    actor: text('actor').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_quote_events_request').on(table.quoteRequestId, table.createdAt),
  ],
);

/** Geri bildirim. Davet jetonu yalnız SHA-256 özetiyle saklanır. */
export const feedback = sqliteTable(
  'feedback',
  {
    id: text('id').primaryKey(),
    quoteRequestId: text('quote_request_id').references(() => quoteRequests.id),
    quoteCode: text('quote_code'),
    rating: integer('rating').notNull(),
    ratingCommunication: integer('rating_communication'),
    ratingClarity: integer('rating_clarity'),
    ratingTimeliness: integer('rating_timeliness'),
    body: text('body').notNull().default(''),
    displayName: text('display_name').notNull(),
    displayNameMode: text('display_name_mode', {
      enum: ['full', 'initials', 'anonymous'],
    })
      .notNull()
      .default('initials'),
    status: text('status', { enum: ['pending', 'published', 'rejected'] })
      .notNull()
      .default('pending'),
    rejectReason: text('reject_reason'),
    businessReply: text('business_reply'),
    repliedAt: integer('replied_at'),
    tokenHash: text('token_hash'),
    tokenExpiresAt: integer('token_expires_at'),
    submittedAt: integer('submitted_at'),
    publishedAt: integer('published_at'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_feedback_token').on(table.tokenHash),
    index('idx_feedback_status_created').on(table.status, table.createdAt),
  ],
);
