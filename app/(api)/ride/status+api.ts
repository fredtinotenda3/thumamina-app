import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ride_id = searchParams.get("ride_id");

    if (!ride_id) {
      return Response.json({ error: "ride_id is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // CRITICAL FIX: Convert ride_id to number
    const rideIdNum = Number(ride_id);

    if (isNaN(rideIdNum)) {
      return Response.json({ error: "Invalid ride_id" }, { status: 400 });
    }

    const response = await sql`
      SELECT 
        ride_id,
        status,
        payment_status,
        driver_id,
        user_id
      FROM rides 
      WHERE ride_id = ${rideIdNum}
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { ride_id, status, driver_id } = body;

    if (!ride_id || !status || !driver_id) {
      return Response.json(
        { error: "Missing required fields: ride_id, status, driver_id" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Convert to numbers
    const rideIdNum = Number(ride_id);
    const driverIdNum = Number(driver_id);

    if (isNaN(rideIdNum) || isNaN(driverIdNum)) {
      return Response.json(
        { error: "Invalid ride_id or driver_id" },
        { status: 400 }
      );
    }

    // FIX: Handle different status updates properly
    let response;
    switch (status) {
      case "accepted":
        response = await sql`
          UPDATE rides 
          SET 
            status = ${status},
            accepted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE ride_id = ${rideIdNum} 
            AND driver_id = ${driverIdNum}
          RETURNING *;
        `;
        break;
      case "rejected":
        response = await sql`
          UPDATE rides 
          SET 
            status = ${status},
            rejected_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE ride_id = ${rideIdNum} 
            AND driver_id = ${driverIdNum}
          RETURNING *;
        `;
        break;
      case "started":
        response = await sql`
          UPDATE rides 
          SET 
            status = ${status},
            started_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE ride_id = ${rideIdNum} 
            AND driver_id = ${driverIdNum}
          RETURNING *;
        `;
        break;
      case "completed":
        response = await sql`
          UPDATE rides 
          SET 
            status = ${status},
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE ride_id = ${rideIdNum} 
            AND driver_id = ${driverIdNum}
          RETURNING *;
        `;
        break;
      default:
        return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    if (response.length === 0) {
      return Response.json(
        { error: "Ride not found or driver mismatch" },
        { status: 404 }
      );
    }

    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("Error updating ride status:", error);
    return Response.json(
      { error: "Failed to update ride status: " + error.message },
      { status: 500 }
    );
  }
}
