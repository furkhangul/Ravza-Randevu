import { containsSensitiveText, demoId, ensureDemoDatabase } from '@/db/demo';
import { authorizeApi } from '@/lib/app-auth';

const allowedWindows = new Set(['08:00–08:20', '16:00–16:20', '21:20–21:40']);
const allowedCategories = new Set(['appointment', 'qr', 'payment', 'other']);

function textField(value: unknown) {
  return typeof value === 'string' ? value : '';
}

async function readState() {
  const db = await ensureDemoDatabase();
  const [orders, passengers, tickets, agencies, ledger, audits, balance] =
    await Promise.all([
      db
        .prepare(
          'SELECT id, group_code AS groupCode, visit_window AS visitWindow, gender, passenger_count AS passengerCount, status, created_at AS createdAt FROM demo_orders ORDER BY created_at DESC',
        )
        .all(),
      db
        .prepare(
          'SELECT id, display_name AS displayName, source, status, created_at AS createdAt FROM demo_passengers ORDER BY created_at DESC',
        )
        .all(),
      db
        .prepare(
          'SELECT id, category, subject, status, created_at AS createdAt FROM demo_tickets ORDER BY created_at DESC',
        )
        .all(),
      db
        .prepare(
          'SELECT id, name, contact_masked AS contactMasked, city, status, created_at AS createdAt FROM demo_agencies ORDER BY created_at DESC',
        )
        .all(),
      db
        .prepare(
          'SELECT id, order_id AS orderId, amount, type, reference_key AS referenceKey, created_at AS createdAt FROM demo_ledger ORDER BY created_at DESC',
        )
        .all(),
      db
        .prepare(
          'SELECT id, actor_user_id AS actorUserId, action, target_type AS targetType, target_id AS targetId, correlation_id AS correlationId, created_at AS createdAt FROM demo_audit_logs ORDER BY created_at DESC LIMIT 20',
        )
        .all(),
      db
        .prepare('SELECT COALESCE(SUM(amount), 0) AS credits FROM demo_ledger')
        .first<{ credits: number }>(),
    ]);

  return {
    mode: 'local_synthetic',
    liveProviderEnabled: false,
    credits: balance?.credits ?? 0,
    orders: orders.results,
    passengers: passengers.results,
    tickets: tickets.results,
    agencies: agencies.results,
    ledger: ledger.results,
    audits: audits.results,
  };
}

export async function GET() {
  const authorization = await authorizeApi();
  if (!authorization.ok)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  try {
    return Response.json(await readState());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Demo state unavailable',
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi();
  if (!authorization.ok)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  if (!origin || origin !== requestUrl.origin) {
    return Response.json({ error: 'same_origin_required' }, { status: 403 });
  }
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    return Response.json(
      { error: 'json_content_type_required' },
      { status: 415 },
    );
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Geçersiz JSON.' }, { status: 400 });
  }

  try {
    const db = await ensureDemoDatabase();
    const action = textField(body.action);
    const now = Date.now();

    if (action === 'create_order') {
      const groupCode = textField(body.groupCode).trim().toUpperCase();
      const visitWindow = textField(body.visitWindow);
      const gender = textField(body.gender);
      const passengerCount = Number(body.passengerCount);
      const idempotencyKey = textField(body.idempotencyKey);
      if (
        !/^[A-Z0-9-]{1,24}$/.test(groupCode) ||
        !allowedWindows.has(visitWindow) ||
        !['Kadın', 'Erkek'].includes(gender) ||
        !Number.isInteger(passengerCount) ||
        passengerCount < 1 ||
        passengerCount > 10 ||
        idempotencyKey.length < 8
      ) {
        return Response.json(
          { error: 'Randevu alanları doğrulanamadı.' },
          { status: 400 },
        );
      }
      const balance = await db
        .prepare('SELECT COALESCE(SUM(amount), 0) AS credits FROM demo_ledger')
        .first<{ credits: number }>();
      if ((balance?.credits ?? 0) < passengerCount)
        return Response.json(
          { error: 'Yetersiz demo randevu hakkını.' },
          { status: 409 },
        );
      const existing = await db
        .prepare('SELECT id FROM demo_orders WHERE idempotency_key = ?')
        .bind(idempotencyKey)
        .first<{ id: string }>();
      if (existing)
        return Response.json({
          ok: true,
          orderId: existing.id,
          replayed: true,
          state: await readState(),
        });
      const orderId = demoId('ORD-DEMO');
      const correlationId = demoId('CORR');
      await db.batch([
        db
          .prepare(
            'INSERT INTO demo_orders (id, group_code, visit_window, gender, passenger_count, status, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            orderId,
            groupCode,
            `5 Eylül 2026 · ${visitWindow}`,
            gender,
            passengerCount,
            'provider_pending',
            idempotencyKey,
            now,
          ),
        db
          .prepare(
            'INSERT INTO demo_ledger (id, order_id, amount, type, reference_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .bind(
            demoId('LED-DEMO'),
            orderId,
            -passengerCount,
            'reservation',
            `reserve-${idempotencyKey}`,
            now,
          ),
        db
          .prepare(
            'INSERT INTO demo_audit_logs (id, actor_user_id, action, target_type, target_id, correlation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            demoId('AUD-DEMO'),
            authorization.user.userId,
            'demo.order.created',
            'order',
            orderId,
            correlationId,
            now,
          ),
      ]);
      return Response.json(
        { ok: true, orderId, replayed: false, state: await readState() },
        { status: 201 },
      );
    }

    if (action === 'import_passengers') {
      const count = Math.min(20, Math.max(1, Number(body.count) || 18));
      const statements = Array.from({ length: count }, (_, index) => {
        const id = demoId('PSG-DEMO');
        return db
          .prepare(
            'INSERT INTO demo_passengers (id, display_name, source, status, created_at) VALUES (?, ?, ?, ?, ?)',
          )
          .bind(
            id,
            `Yolcu ${String(index + 1).padStart(3, '0')}`,
            'excel_demo',
            'validated',
            now + index,
          );
      });
      statements.push(
        db
          .prepare(
            'INSERT INTO demo_audit_logs (id, actor_user_id, action, target_type, target_id, correlation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            demoId('AUD-DEMO'),
            authorization.user.userId,
            'demo.passengers.imported',
            'passenger_batch',
            `${count}-rows`,
            demoId('CORR'),
            now,
          ),
      );
      await db.batch(statements);
      return Response.json(
        { ok: true, imported: count, state: await readState() },
        { status: 201 },
      );
    }

    if (action === 'create_ticket') {
      const category = textField(body.category);
      const subject = textField(body.subject).trim();
      const message = textField(body.message).trim();
      if (
        !allowedCategories.has(category) ||
        subject.length < 3 ||
        subject.length > 100 ||
        message.length < 5 ||
        message.length > 1000
      )
        return Response.json(
          { error: 'Destek alanları doğrulanamadı.' },
          { status: 400 },
        );
      if (containsSensitiveText(`${subject} ${message}`))
        return Response.json(
          {
            error:
              'Mesaj hassas veri içeriyor olabilir. Yalnız demo işlem kimliği kullanın.',
          },
          { status: 422 },
        );
      const ticketId = demoId('TKT-DEMO');
      await db.batch([
        db
          .prepare(
            'INSERT INTO demo_tickets (id, category, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .bind(ticketId, category, subject, message, 'open', now),
        db
          .prepare(
            'INSERT INTO demo_audit_logs (id, actor_user_id, action, target_type, target_id, correlation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            demoId('AUD-DEMO'),
            authorization.user.userId,
            'demo.ticket.created',
            'ticket',
            ticketId,
            demoId('CORR'),
            now,
          ),
      ]);
      return Response.json(
        { ok: true, ticketId, state: await readState() },
        { status: 201 },
      );
    }

    if (action === 'review_agency') {
      const agencyId = textField(body.agencyId);
      const status = textField(body.status);
      if (
        !agencyId.startsWith('AGN-DEMO-') ||
        !['active', 'rejected'].includes(status)
      )
        return Response.json(
          { error: 'Acente kararı doğrulanamadı.' },
          { status: 400 },
        );
      const result = await db
        .prepare('UPDATE demo_agencies SET status = ? WHERE id = ?')
        .bind(status, agencyId)
        .run();
      if (!result.meta.changes)
        return Response.json({ error: 'Acente bulunamadı.' }, { status: 404 });
      await db
        .prepare(
          'INSERT INTO demo_audit_logs (id, actor_user_id, action, target_type, target_id, correlation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          demoId('AUD-DEMO'),
          authorization.user.userId,
          `demo.agency.${status}`,
          'agency',
          agencyId,
          demoId('CORR'),
          now,
        )
        .run();
      return Response.json({ ok: true, state: await readState() });
    }

    if (action === 'advance_order') {
      const orderId = textField(body.orderId);
      if (!orderId.startsWith('ORD-DEMO-'))
        return Response.json(
          { error: 'Sipariş kimliği doğrulanamadı.' },
          { status: 400 },
        );
      const current = await db
        .prepare('SELECT status FROM demo_orders WHERE id = ?')
        .bind(orderId)
        .first<{ status: string }>();
      if (!current)
        return Response.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
      const nextStatus =
        current.status === 'provider_pending'
          ? 'qr_pending'
          : current.status === 'qr_pending'
            ? 'qr_ready'
            : null;
      if (!nextStatus)
        return Response.json(
          { error: 'Bu sipariş demo akışında ilerletilemez.' },
          { status: 409 },
        );
      await db.batch([
        db
          .prepare('UPDATE demo_orders SET status = ? WHERE id = ?')
          .bind(nextStatus, orderId),
        db
          .prepare(
            'INSERT INTO demo_audit_logs (id, actor_user_id, action, target_type, target_id, correlation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            demoId('AUD-DEMO'),
            authorization.user.userId,
            `demo.order.${nextStatus}`,
            'order',
            orderId,
            demoId('CORR'),
            now,
          ),
      ]);
      return Response.json({
        ok: true,
        status: nextStatus,
        state: await readState(),
      });
    }

    return Response.json({ error: 'Bilinmeyen demo işlemi.' }, { status: 400 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Demo işlemi başarısız.',
      },
      { status: 500 },
    );
  }
}

