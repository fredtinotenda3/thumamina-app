import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request) {
  try {
    // Extract ride ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split("/")
      .filter((segment) => segment.length > 0);

    // Find the index of 'accept' and get the previous segment as ID
    const acceptIndex = pathSegments.indexOf("accept");
    const id = acceptIndex > 0 ? pathSegments[acceptIndex - 1] : null;

    console.log("🔄 Accept/Reject Ride Request - Debug:", {
      fullPath: url.pathname,
      pathSegments,
      acceptIndex,
      extractedId: id,
    });

    if (!id) {
      console.error("❌ No ride ID found in URL");
      return Response.json({ error: "Ride ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { accepted, driver_id } = body;

    console.log("📦 Request body:", { accepted, driver_id });

    if (accepted === undefined) {
      return Response.json(
        { error: "Accepted field is required" },
        { status: 400 }
      );
    }

    if (accepted && !driver_id) {
      return Response.json(
        { error: "Driver ID is required when accepting a ride" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    // Convert ride_id to number
    const rideIdNum = Number(id);
    if (isNaN(rideIdNum) || rideIdNum <= 0) {
      return Response.json({ error: "Invalid ride ID" }, { status: 400 });
    }

    const status = accepted ? "accepted" : "rejected";

    console.log(`🎯 Updating ride ${rideIdNum} to status: ${status}`);

    // FIX: Remove updated_at from the query since it doesn't exist
    let response;
    if (accepted) {
      response = await sql`
        UPDATE rides 
        SET 
          status = ${status},
          driver_id = ${driver_id},
          accepted_at = CURRENT_TIMESTAMP
        WHERE ride_id = ${rideIdNum}
        RETURNING *;
      `;
    } else {
      response = await sql`
        UPDATE rides 
        SET 
          status = ${status},
          rejected_at = CURRENT_TIMESTAMP
        WHERE ride_id = ${rideIdNum}
        RETURNING *;
      `;
    }

    if (response.length === 0) {
      console.error(`❌ Ride not found with ID: ${rideIdNum}`);
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    console.log(
      `✅ Ride ${accepted ? "accepted" : "rejected"} successfully:`,
      response[0]
    );

    return Response.json({
      data: response[0],
      message: `Ride ${accepted ? "accepted" : "rejected"} successfully`,
      success: true,
    });
  } catch (error: any) {
    console.error("❌ Error updating ride acceptance:", error);

    return Response.json(
      { error: "Internal Server Error: " + error.message },
      { status: 500 }
    );
  }
}
