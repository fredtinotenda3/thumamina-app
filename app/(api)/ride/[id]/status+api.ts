import { neon } from "@neondatabase/serverless";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return Response.json({ error: "Ride ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const response = await sql`
      SELECT 
        ride_id,
        status,
        payment_status,
        driver_id,
        user_id
      FROM rides 
      WHERE ride_id = ${Number(id)}
    `;

    if (response.length === 0) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("Error fetching ride status:", error);
    return Response.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!id) {
      return Response.json({ error: "Ride ID is required" }, { status: 400 });
    }

    if (!status) {
      return Response.json({ error: "Status is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    let updateFields: any = { status };
    let timestampField = "";

    switch (status) {
      case "accepted":
        timestampField = "accepted_at";
        break;
      case "rejected":
        timestampField = "rejected_at";
        break;
      case "started":
        timestampField = "started_at";
        break;
      case "completed":
        timestampField = "completed_at";
        break;
    }

    if (timestampField) {
      updateFields[timestampField] = new Date();
    }

    updateFields.updated_at = new Date();

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
    console.error("Error updating ride status:", error);
    return Response.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
