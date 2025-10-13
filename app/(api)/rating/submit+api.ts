// app/(api)/rating/submit+api.ts
import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ride_id, driver_id, user_id, rating, comment } = body;

    if (!ride_id || !driver_id || !user_id || !rating) {
      return Response.json(
        {
          error: "Missing required fields: ride_id, driver_id, user_id, rating",
        },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Check if rating already exists for this ride
    const existingRating = await sql`
      SELECT * FROM ride_ratings 
      WHERE ride_id = ${ride_id} AND user_id = ${user_id}
    `;

    if (existingRating.length > 0) {
      return Response.json(
        { error: "Rating already submitted for this ride" },
        { status: 409 }
      );
    }

    // Create rating
    const newRating = await sql`
      INSERT INTO ride_ratings (ride_id, driver_id, user_id, rating, comment)
      VALUES (${ride_id}, ${driver_id}, ${user_id}, ${rating}, ${comment || null})
      RETURNING *
    `;

    // Update driver's average rating
    const driverRatings = await sql`
      SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count
      FROM ride_ratings 
      WHERE driver_id = ${driver_id}
    `;

    if (driverRatings.length > 0) {
      await sql`
        UPDATE drivers 
        SET rating = ${parseFloat(driverRatings[0].avg_rating).toFixed(1)} 
        WHERE id = ${driver_id}
      `;
    }

    return Response.json(
      {
        data: newRating[0],
        message: "Rating submitted successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error submitting rating:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
