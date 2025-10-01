import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driver_id");

    if (!driverId) {
      return Response.json({ error: "Driver ID required" }, { status: 400 });
    }

    // ADD PROPER VALIDATION
    const driverIdNum = parseInt(driverId);
    if (isNaN(driverIdNum) || driverIdNum <= 0) {
      return Response.json({ error: "Invalid Driver ID" }, { status: 400 });
    }

    console.log(`🔄 Fetching rides for driver ID: ${driverIdNum}`);

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Get pending ride requests for this driver
    const pendingRides = await sql`
      SELECT 
        ride_id,
        origin_address,
        destination_address,
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
        ride_time,
        fare_price,
        created_at,
        status,
        user_id
      FROM rides
      WHERE driver_id = ${driverIdNum}
      AND status = 'requested'
      ORDER BY created_at DESC
    `;

    console.log(
      `✅ Found ${pendingRides.length} pending rides for driver ${driverIdNum}`
    );

    return Response.json({
      data: pendingRides,
      count: pendingRides.length,
    });
  } catch (error: any) {
    console.error("❌ Error fetching driver rides:", error);
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
