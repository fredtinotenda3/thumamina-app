import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");
    const driver_id = searchParams.get("driver_id");

    if (!user_id && !driver_id) {
      return Response.json(
        { error: "user_id or driver_id is required" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    let query;
    if (user_id) {
      query = sql`
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
          ) AS driver
        FROM rides r
        LEFT JOIN drivers d ON r.driver_id = d.id
        WHERE r.user_id = ${user_id} 
          AND r.status IN ('accepted', 'started', 'completed')
          AND r.payment_status IS NOT NULL
          AND r.payment_status != 'pending'
        ORDER BY r.created_at DESC
        LIMIT 1
      `;
    } else {
      query = sql`
        SELECT 
          r.*,
          json_build_object(
            'user_id', u.id,
            'name', u.name,
            'email', u.email
          ) AS user
        FROM rides r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.driver_id = ${driver_id} 
          AND r.status IN ('accepted', 'started', 'completed')
          AND r.payment_status IS NOT NULL
        ORDER BY r.created_at DESC
        LIMIT 1
      `;
    }

    const response = await query;

    if (response.length === 0) {
      return Response.json({ data: null });
    }

    return Response.json({ data: response[0] });
  } catch (error: any) {
    console.error("Error fetching active ride:", error);
    return Response.json(
      { error: "Failed to fetch active ride: " + error.message },
      { status: 500 }
    );
  }
}
