import { neon } from "@neondatabase/serverless";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rideId = params.id;
    const body = await request.json();
    const { payment_status, payment_intent_id } = body;

    if (!payment_status) {
      return Response.json(
        { error: "Payment status required" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const response = await sql`
      UPDATE rides 
      SET 
        payment_status = ${payment_status},
        ${payment_intent_id ? sql`payment_intent_id = ${payment_intent_id},` : sql``}
        updated_at = CURRENT_TIMESTAMP
      WHERE ride_id = ${rideId}
      RETURNING *;
    `;

    if (response.length === 0) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    return Response.json({
      data: response[0],
      message: "Payment status updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating payment status:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
