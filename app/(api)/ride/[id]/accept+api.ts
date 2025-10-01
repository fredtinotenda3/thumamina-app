import { neon } from "@neondatabase/serverless";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // FIX: Properly extract the id from params
    const { id } = params;
    const body = await request.json();
    const { accepted } = body;

    if (!id) {
      return Response.json({ error: "Ride ID is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const status = accepted ? "accepted" : "rejected";
    const timestampField = accepted ? "accepted_at" : "rejected_at";

    // Convert ride_id to number
    const rideIdNum = Number(id);
    if (isNaN(rideIdNum)) {
      return Response.json({ error: "Invalid ride ID" }, { status: 400 });
    }

    // FIX: Handle the dynamic timestamp field properly
    let response;
    if (accepted) {
      response = await sql`
        UPDATE rides 
        SET 
          status = ${status},
          accepted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE ride_id = ${rideIdNum}
        RETURNING *;
      `;
    } else {
      response = await sql`
        UPDATE rides 
        SET 
          status = ${status},
          rejected_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE ride_id = ${rideIdNum}
        RETURNING *;
      `;
    }

    if (response.length === 0) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    return Response.json({
      data: response[0],
      message: `Ride ${accepted ? "accepted" : "rejected"} successfully`,
    });
  } catch (error: any) {
    console.error("Error updating ride acceptance:", error);
    return Response.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
