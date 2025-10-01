// app/(api)/test+api.ts
export async function POST(request: Request) {
  console.log("✅ TEST API HIT");
  return Response.json(
    {
      message: "Test API is working!",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function GET(request: Request) {
  return Response.json(
    {
      message: "Test GET is working!",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
