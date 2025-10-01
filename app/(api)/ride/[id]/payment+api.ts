import { neon } from "@neondatabase/serverless";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { payment_status, payment_method } = body;

    if (!id) {
      return Response.json({ error: "Ride ID is required" }, { status: 400 });
    }

    if (!payment_status) {
      return Response.json(
        { error: "Payment status is required" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const updateFields: any = {
      payment_status,
      updated_at: new Date(),
    };

    if (payment_method) {
      updateFields.payment_method = payment_method;
    }

    const response = await sql`
      UPDATE rides 
      SET ${sql(updateFields)}
      WHERE ride_id = ${Number(id)}
      RETURNING *;
    `;

    if (response.length === 0) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("Error updating payment:", error);
    return Response.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
