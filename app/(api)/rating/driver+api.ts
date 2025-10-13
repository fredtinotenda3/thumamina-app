// app/(api)/rating/driver+api.ts
import { neon } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driver_id = searchParams.get("driver_id");

    if (!driver_id) {
      return Response.json({ error: "Driver ID required" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const ratings = await sql`
      SELECT rr.*, 
             CONCAT('User ', SUBSTRING(rr.user_id, 1, 8)) as user_display_name
      FROM ride_ratings rr
      WHERE rr.driver_id = ${Number(driver_id)}
      ORDER BY rr.created_at DESC
      LIMIT 50
    `;

    const ratingStats = await sql`
      SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM ride_ratings 
      WHERE driver_id = ${Number(driver_id)}
    `;

    return Response.json({
      data: ratings,
      stats: ratingStats[0] || {
        total_ratings: 0,
        average_rating: 0,
        five_star: 0,
        four_star: 0,
        three_star: 0,
        two_star: 0,
        one_star: 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching driver ratings:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
