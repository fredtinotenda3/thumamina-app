import { neon } from "@neondatabase/serverless";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Extract ride ID from the URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname
      .split("/")
      .filter((segment) => segment.length > 0);

    const paymentIndex = pathSegments.indexOf("payment");
    const id = paymentIndex > 0 ? pathSegments[paymentIndex - 1] : null;

    if (!id) {
      return Response.json({ error: "Ride ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { payment_status, status } = body;

    if (!payment_status) {
      return Response.json(
        { error: "Payment status is required" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const rideIdNum = Number(id);

    if (isNaN(rideIdNum) || rideIdNum <= 0) {
      return Response.json({ error: "Invalid ride ID" }, { status: 400 });
    }

    console.log(
      `🎯 Updating ride ${rideIdNum} payment status to: ${payment_status}`
    );

    let response;

    if (status) {
      // Update both payment_status and status (without updated_at)
      response = await sql`
        UPDATE rides 
        SET 
          payment_status = ${payment_status},
          status = ${status}
        WHERE ride_id = ${rideIdNum}
        RETURNING 
          ride_id,
          payment_status,
          status,
          fare_price,
          driver_id,
          user_id;
      `;
    } else {
      // Update only payment_status (without updated_at)
      response = await sql`
        UPDATE rides 
        SET 
          payment_status = ${payment_status}
        WHERE ride_id = ${rideIdNum}
        RETURNING 
          ride_id,
          payment_status,
          status,
          fare_price,
          driver_id,
          user_id;
      `;
    }

    if (response.length === 0) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const updatedRide = response[0];

    console.log("✅ Payment status updated successfully:", {
      rideId: updatedRide.ride_id,
      paymentStatus: updatedRide.payment_status,
    });

    return Response.json({
      data: updatedRide,
      message: "Payment status updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating payment:", error);
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
