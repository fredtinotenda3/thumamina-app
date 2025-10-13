// app/(api)/subscription/status+api.ts
import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driver_id = searchParams.get("driver_id");

    if (!driver_id) {
      return Response.json({ error: "Driver ID required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Check if subscription table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'driver_subscriptions'
      ) as exists;
    `;

    const hasSubscriptionTable = tableCheck[0]?.exists;

    if (!hasSubscriptionTable) {
      return Response.json({
        hasActiveSubscription: false,
        subscription: null,
        canReceiveRides: false,
      });
    }

    const activeSubscription = await sql`
      SELECT ds.*, sp.name as plan_name, sp.description
      FROM driver_subscriptions ds
      JOIN subscription_plans sp ON ds.plan_id = sp.plan_id
      WHERE ds.driver_id = ${Number(driver_id)} 
        AND ds.status = 'active'
        AND ds.rides_remaining > 0
        AND (ds.expires_at IS NULL OR ds.expires_at > CURRENT_TIMESTAMP)
      ORDER BY ds.created_at DESC
      LIMIT 1
    `;

    const hasActiveSubscription = activeSubscription.length > 0;

    return Response.json({
      hasActiveSubscription,
      subscription: hasActiveSubscription ? activeSubscription[0] : null,
      canReceiveRides: hasActiveSubscription,
    });
  } catch (error: any) {
    console.error("Error checking subscription status:", error);
    return Response.json({
      hasActiveSubscription: false,
      subscription: null,
      canReceiveRides: false,
    });
  }
}
