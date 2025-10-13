// app/(api)/subscription/plans+api.ts
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);

    const plans = await sql`
      SELECT * FROM subscription_plans 
      WHERE is_active = true 
      ORDER BY amount ASC
    `;

    return Response.json({ data: plans });
  } catch (error: any) {
    console.error("Error fetching subscription plans:", error);
    // Return default plans if table doesn't exist yet
    return Response.json({
      data: [
        {
          plan_id: 1,
          name: "Basic",
          amount: 5.0,
          ride_count: 12,
          description: "12 rides for $5",
        },
        {
          plan_id: 2,
          name: "Standard",
          amount: 10.0,
          ride_count: 25,
          description: "25 rides for $10",
        },
        {
          plan_id: 3,
          name: "Premium",
          amount: 20.0,
          ride_count: 55,
          description: "55 rides for $20",
        },
        {
          plan_id: 4,
          name: "Professional",
          amount: 50.0,
          ride_count: 150,
          description: "150 rides for $50",
        },
      ],
    });
  }
}
