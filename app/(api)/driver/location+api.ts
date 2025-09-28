import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { driver_id, latitude, longitude, is_online } = body;

    // Validate required fields
    if (!driver_id || latitude === undefined || longitude === undefined) {
      return Response.json(
        { error: "Missing required fields: driver_id, latitude, longitude" },
        { status: 400 }
      );
    }

    // Validate numeric values - driver_id should be a number (integer)
    if (isNaN(Number(driver_id)) || isNaN(latitude) || isNaN(longitude)) {
      return Response.json(
        { error: "Invalid ID or coordinate values" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    console.log("Updating driver location:", {
      driver_id,
      latitude,
      longitude,
      is_online,
    });

    const response = await sql`
      UPDATE drivers 
      SET 
        latitude = ${latitude},
        longitude = ${longitude},
        is_online = ${is_online !== undefined ? is_online : true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number(driver_id)}  -- Convert to number
      RETURNING *;
    `;

    if (response.length === 0) {
      return Response.json(
        { error: "Driver not found with ID: " + driver_id },
        { status: 404 }
      );
    }

    console.log("Driver location updated successfully:", response[0]);
    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("Error updating driver location:", error);

    return Response.json(
      { error: "Failed to update driver location: " + error.message },
      { status: 500 }
    );
  }
}
