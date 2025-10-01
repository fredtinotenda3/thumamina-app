import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  console.log("🎯 RIDE/REQUEST API HIT - START");

  try {
    const body = await request.json();
    console.log("📦 Request body received:", body);

    const {
      origin_address,
      destination_address,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      ride_time,
      fare_price,
      driver_id,
      user_id,
    } = body;

    console.log("🔍 Validating fields...");

    if (
      !origin_address ||
      !destination_address ||
      !origin_latitude ||
      !origin_longitude ||
      !destination_latitude ||
      !destination_longitude ||
      !ride_time ||
      !fare_price ||
      !driver_id ||
      !user_id
    ) {
      console.log("❌ Missing required fields");
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("✅ All fields present");

    // FIX: Convert data types to match database schema
    const sql = neon(`${process.env.DATABASE_URL}`);

    console.log("🗄️ Executing SQL insert...");
    const response = await sql`
      INSERT INTO rides ( 
          origin_address, 
          destination_address, 
          origin_latitude, 
          origin_longitude, 
          destination_latitude, 
          destination_longitude, 
          ride_time, 
          fare_price, 
          payment_status,
          status,
          driver_id, 
          user_id
      ) VALUES (
          ${origin_address},
          ${destination_address},
          ${Number(origin_latitude)},
          ${Number(origin_longitude)},
          ${Number(destination_latitude)},
          ${Number(destination_longitude)},
          ${Math.round(Number(ride_time))},  -- FIX: Round to integer
          ${Number(fare_price)},             -- FIX: Ensure numeric
          'pending',
          'requested',
          ${Number(driver_id)},              -- FIX: Ensure integer
          ${user_id}
      )
      RETURNING *;
    `;

    console.log("✅ Database insert successful:", response[0]);
    console.log("🎯 RIDE/REQUEST API - SUCCESS");

    return Response.json({ data: response[0] }, { status: 201 });
  } catch (error) {
    console.error("❌ Error in ride/request API:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json(
    {
      error: "Method not allowed",
      message: "Use POST to create a ride request",
    },
    { status: 405 }
  );
}
