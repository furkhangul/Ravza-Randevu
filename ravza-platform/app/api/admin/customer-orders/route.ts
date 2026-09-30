import {
  approveCustomerOrder,
  confirmRawdahBookingForPassenger,
  listAllCustomerOrdersForAdmin,
  updateCustomerOrderStatus,
  updatePassengerVisa,
} from '@/db/customer-orders';
import { authorizeApi } from '@/lib/app-auth';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

function cleanString(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

export async function GET() {
  const authorization = await authorizeApi([
    'SUPER_ADMIN',
    'AGENCY_ADMIN',
    'STAFF',
  ]);
  if (!authorization.ok) return Response.json({ error: authorization.error }, { status: authorization.status, headers: NO_STORE });
  try {
    const orders = await listAllCustomerOrdersForAdmin();
    return Response.json({ ok: true, orders }, { headers: NO_STORE });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'customer_orders_fetch_failed',
      },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi();
  if (!authorization.ok) return Response.json({ error: authorization.error }, { status: authorization.status, headers: NO_STORE });
  const requestUrl = new URL(request.url);
  if (request.headers.get('origin') !== requestUrl.origin)
    return Response.json(
      { error: 'same_origin_required' },
      { status: 403, headers: NO_STORE },
    );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'invalid_json' },
      { status: 400, headers: NO_STORE },
    );
  }

  const action = typeof body.action === 'string' ? body.action : '';

  try {
    if (action === 'update_visa') {
      const passengerId = cleanString(body.passengerId);
      const visaStatus = body.visaStatus as
        | 'pending'
        | 'applied'
        | 'approved'
        | 'rejected';
      const visaNumber = cleanString(body.visaNumber);
      if (!passengerId || !visaStatus) {
        return Response.json(
          { error: 'passengerId and visaStatus are required' },
          { status: 400, headers: NO_STORE },
        );
      }
      await updatePassengerVisa(passengerId, visaStatus, visaNumber);
      return Response.json({ ok: true }, { headers: NO_STORE });
    }

    if (action === 'book_rawdah') {
      const passengerId = cleanString(body.passengerId);
      const appointmentDate = cleanString(body.appointmentDate);
      const appointmentTime = cleanString(body.appointmentTime);
      const appointmentGate =
        typeof body.appointmentGate === 'string'
          ? body.appointmentGate
          : undefined;

      // Gerçek QR ve izin numarası RawdahBooking'den alınıp elle girilir.
      const qrPayload = cleanString(body.qrPayload).trim().slice(0, 2000);
      const permitId = cleanString(body.permitId).trim().slice(0, 80);

      if (!passengerId || !appointmentDate || !appointmentTime || !qrPayload || !permitId) {
        return Response.json(
          {
            error:
              'passengerId, appointmentDate, appointmentTime, qrPayload and permitId are required',
          },
          { status: 400, headers: NO_STORE },
        );
      }

      const result = await confirmRawdahBookingForPassenger(passengerId, {
        appointmentDate,
        appointmentTime,
        appointmentGate,
        qrPayload,
        permitId,
      });

      return Response.json({ ok: true, result }, { headers: NO_STORE });
    }

    if (action === 'update_order_status') {
      const orderId = cleanString(body.orderId);
      const status = body.status as
        | 'awaiting_payment'
        | 'payment_pending'
        | 'confirmed'
        | 'cancelled';
      if (!orderId || !status) {
        return Response.json(
          { error: 'orderId and status are required' },
          { status: 400, headers: NO_STORE },
        );
      }
      if (status === 'confirmed') {
        const order = await approveCustomerOrder(orderId);
        return Response.json(
          { ok: true, order, qrCreated: order.passengers.filter((passenger) => passenger.qrPayload).length },
          { headers: NO_STORE },
        );
      }
      await updateCustomerOrderStatus(orderId, status);
      return Response.json({ ok: true }, { headers: NO_STORE });
    }

    return Response.json(
      { error: 'unknown_action' },
      { status: 400, headers: NO_STORE },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'admin_customer_order_operation_failed',
      },
      { status: 500, headers: NO_STORE },
    );
  }
}
