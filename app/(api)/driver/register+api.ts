import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      profile_image_url,
      car_image_url,
      car_seats,
      latitude,
      longitude,
    } = body;

    if (!first_name || !last_name || !car_seats) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // First, check if driver with same first_name and last_name already exists
    const existingDriver = await sql`
      SELECT * FROM drivers 
      WHERE first_name = ${first_name} 
      AND last_name = ${last_name}
      LIMIT 1
    `;

    if (existingDriver.length > 0) {
      return Response.json(
        {
          error: "Driver already exists",
          existingDriver: existingDriver[0],
          exists: true,
        },
        { status: 409 }
      );
    }

    // If no existing driver, create new one
    const response = await sql`
      INSERT INTO drivers (
        first_name, 
        last_name, 
        profile_image_url,
        car_image_url,
        car_seats,
        latitude,
        longitude,
        rating,
        is_online
      ) VALUES (
        ${first_name},
        ${last_name},
        ${profile_image_url || null},
        ${car_image_url || null},
        ${car_seats},
        ${latitude || null},
        ${longitude || null},
        4.5,
        false
      )
      RETURNING *;
    `;

    return Response.json(
      {
        data: response[0],
        exists: false,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating driver:", error);

    if (error.code === "23505") {
      // Unique violation
      return Response.json(
        { error: "Driver registration already exists" },
        { status: 409 }
      );
    }

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// NEW: Add GET endpoint to check driver existence
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const first_name = searchParams.get("first_name");
    const last_name = searchParams.get("last_name");

    if (!first_name || !last_name) {
      return Response.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const existingDriver = await sql`
      SELECT * FROM drivers 
      WHERE first_name = ${first_name} 
      AND last_name = ${last_name}
      LIMIT 1
    `;

    if (existingDriver.length > 0) {
      return Response.json({
        exists: true,
        driver: existingDriver[0],
      });
    }

    return Response.json({
      exists: false,
    });
  } catch (error: any) {
    console.error("Error checking driver existence:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
