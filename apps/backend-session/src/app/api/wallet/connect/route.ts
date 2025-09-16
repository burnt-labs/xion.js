import { NextRequest, NextResponse } from "next/server";
import { getAbstraxionBackend } from "@/lib/abstraxion-backend";
import { connectWalletSchema } from "@/lib/validation";
import { prisma } from "@/lib/database";
import { checkStrictRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = await checkStrictRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests from this IP, please try again later.",
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validatedData = connectWalletSchema.parse(body);

    const { username, permissions } = validatedData;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { username },
      });
    }

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Initiate wallet connection
    const result = await abstraxionBackend.connectInit(user.id, permissions);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Connect wallet error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
