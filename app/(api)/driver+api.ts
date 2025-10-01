import { neon } from "@neondatabase/serverless";

// GET: return an array of drivers with numeric latitude/longitude
export async function GET() {
  try {
    console.log("🚗 Fetching drivers from database...");

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Add more detailed error handling
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL is missing");
      return Response.json(
        { error: "Database configuration error" },
        { status: 500 }
      );
    }

    const rows = await sql /* sql */ `
      SELECT
        id,
        first_name,
        last_name,
        profile_image_url,
        car_image_url,
        car_seats,
        rating,
        is_online,
        CAST(latitude  AS DOUBLE PRECISION) AS latitude,
        CAST(longitude AS DOUBLE PRECISION) AS longitude
      FROM drivers
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND (is_online = true OR is_online IS NULL)
      ORDER BY id DESC
    `;

    console.log(`✅ Successfully fetched ${rows.length} drivers`);

    return Response.json({ data: rows });
  } catch (error: any) {
    // ADD DETAILED ERROR LOGGING
    console.error("❌ Error fetching drivers:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL ? "Set" : "Missing",
    });

    return Response.json(
      {
        error: "Internal Server Error",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// PUT: update a driver's coordinates and online status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { driver_id, latitude, longitude, is_online } = body;

    if (
      (!driver_id && driver_id !== 0) ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return Response.json(
        { error: "Missing required fields: driver_id, latitude, longitude" },
        { status: 400 }
      );
    }

    const idNum = Number(driver_id);
    const latNum = parseFloat(String(latitude));
    const lngNum = parseFloat(String(longitude));

    if (Number.isNaN(idNum) || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return Response.json(
        { error: "Invalid ID or coordinate values" },
        { status: 400 }
      );
    }

    console.log("🔄 Updating driver location via PUT:", {
      driver_id: idNum,
      latitude: latNum,
      longitude: lngNum,
      is_online,
    });

    const sql = neon(`${process.env.DATABASE_URL}`);

    const response = await sql /* sql */ `
      UPDATE drivers 
      SET 
        latitude = ${latNum},
        longitude = ${lngNum},
        is_online = ${is_online !== undefined ? is_online : true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${idNum}
      RETURNING
        id,
        first_name,
        last_name,
        profile_image_url,
        car_image_url,
        car_seats,
        rating,
        is_online,
        CAST(latitude  AS DOUBLE PRECISION) AS latitude,
        CAST(longitude AS DOUBLE PRECISION) AS longitude
    `;

    if (response.length === 0) {
      return Response.json(
        { error: "Driver not found with ID: " + idNum },
        { status: 404 }
      );
    }

    console.log(
      "✅ Driver location updated successfully via PUT:",
      response[0]
    );
    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("❌ Error updating driver location via PUT:", error);
    return Response.json(
      {
        error: "Failed to update driver location",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
