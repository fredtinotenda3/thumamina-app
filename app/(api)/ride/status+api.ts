import { neon } from "@neondatabase/serverless";

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

    const response = await sql`
      UPDATE rides 
      SET 
        ${sql(updateFields)},
        updated_at = CURRENT_TIMESTAMP
      WHERE ride_id = ${ride_id} 
        AND driver_id = ${driver_id}
      RETURNING *;
    `;

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ride_id = searchParams.get("ride_id");

    if (!ride_id) {
      return Response.json({ error: "ride_id is required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const response = await sql`
      SELECT 
        r.*,
        json_build_object(
          'driver_id', d.id,
          'first_name', d.first_name,
          'last_name', d.last_name,
          'profile_image_url', d.profile_image_url,
          'car_image_url', d.car_image_url,
          'car_seats', d.car_seats,
          'rating', d.rating,
          'latitude', d.latitude,
          'longitude', d.longitude
        ) AS driver,
        json_build_object(
          'user_id', u.id,
          'name', u.name,
          'email', u.email
        ) AS user
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.ride_id = ${ride_id}
    `;

    if (response.length === 0) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("Error fetching ride:", error);
    return Response.json(
      { error: "Failed to fetch ride: " + error.message },
      { status: 500 }
    );
  }
}
