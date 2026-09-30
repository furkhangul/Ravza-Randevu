import { getPortalUser } from '@/lib/current-user';
import { createCustomerOrder, listCustomerOrders } from '@/db/customer-orders';
import { parseCustomerOrderInput } from '@/lib/customer-order';
import { onOrderCreated } from '@/lib/notification-events';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

async function requireCustomer() {
  const user = await getPortalUser();
  return user
    ? { ok: true as const, user }
    : {
        ok: false as const,
        response: Response.json(
          { error: 'authentication_required' },
          { status: 401, headers: NO_STORE },
        ),
      };
}

export async function GET() {
  const authorization = await requireCustomer();
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json(
      { orders: await listCustomerOrders(authorization.user.userId) },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'customer_orders_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await requireCustomer();
  if (!authorization.ok) return authorization.response;
  const requestUrl = new URL(request.url);
  if (request.headers.get('origin') !== requestUrl.origin)
    return Response.json(
      { error: 'same_origin_required' },
      { status: 403, headers: NO_STORE },
    );
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    return Response.json(
      { error: 'json_content_type_required' },
      { status: 415, headers: NO_STORE },
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
  const parsed = parseCustomerOrderInput(body);
  if (!parsed.ok)
    return Response.json(
      { error: parsed.error },
      { status: 400, headers: NO_STORE },
    );

  try {
    const order = await createCustomerOrder(parsed.value, {
      userId: authorization.user.userId,
      email: authorization.user.email,
    });

    // Bildirim takvimi kurulur. Başarısız olursa rezervasyon yine geçerlidir;
    // hata kuyrukta görünür, müşterinin işlemi kesilmez.
    await onOrderCreated({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      packageName: order.packageName,
      contactEmail: order.contactEmail,
      contactPhone: order.contactPhone,
      customerName: authorization.user.displayName,
      passengerCount: order.passengerCount,
      amountMinor: order.amountMinor,
      departureDate: order.departureDate,
      returnDate: order.returnDate,
      ravzaVisitDate: order.ravzaVisitDate,
      hasMissingPassengerData: order.passengers.some(
        (passenger) => !passenger.birthDate || !passenger.nationality,
      ),
      marketingOptIn: false,
    });

    return Response.json(
      { ok: true, order },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'PACKAGE_NOT_AVAILABLE')
      return Response.json(
        { error: 'Seçilen paket artık satışta değil.' },
        { status: 409, headers: NO_STORE },
      );
    return Response.json(
      { error: 'customer_order_create_failed' },
      { status: 500, headers: NO_STORE },
    );
  }
}
