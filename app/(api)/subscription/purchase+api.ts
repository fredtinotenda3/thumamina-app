// app/(api)/subscription/purchase+api.ts
import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driver_id, plan_id, eco_cash_number, payment_reference } = body;

    if (!driver_id || !plan_id || !eco_cash_number) {
      return Response.json(
        {
          error: "Missing required fields: driver_id, plan_id, eco_cash_number",
        },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Get plan details
    const plan = await sql`
      SELECT * FROM subscription_plans WHERE plan_id = ${plan_id} AND is_active = true
    `;

    if (plan.length === 0) {
      return Response.json(
        { error: "Invalid subscription plan" },
        { status: 400 }
      );
    }

    // Check if driver exists
    const driver = await sql`
      SELECT * FROM drivers WHERE id = ${driver_id}
    `;

    if (driver.length === 0) {
      return Response.json({ error: "Driver not found" }, { status: 404 });
    }

    // Create subscription
    const subscription = await sql`
      INSERT INTO driver_subscriptions (
        driver_id, plan_id, amount_paid, rides_purchased, rides_remaining,
        eco_cash_number, payment_reference
      ) VALUES (
        ${driver_id}, ${plan_id}, ${plan[0].amount}, ${plan[0].ride_count}, ${plan[0].ride_count},
        ${eco_cash_number}, ${payment_reference}
      )
      RETURNING *;
    `;

    // Update driver's online status to true after subscription
    await sql`
      UPDATE drivers SET is_online = true WHERE id = ${driver_id}
    `;

    return Response.json(
      {
        data: subscription[0],
        message: "Subscription activated successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
