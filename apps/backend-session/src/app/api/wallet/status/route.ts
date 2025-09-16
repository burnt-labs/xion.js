import { NextRequest, NextResponse } from "next/server";
import { getAbstraxionBackend } from "@/lib/abstraxion-backend";
import { statusSchema } from "@/lib/validation";
import { prisma } from "@/lib/database";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests from this IP, please try again later.",
        },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required",
        },
        { status: 400 },
      );
    }

    const validatedData = statusSchema.parse({ username });

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 },
      );
    }

    // Get AbstraxionBackend instance
    const abstraxionBackend = getAbstraxionBackend();

    // Check status
    const result = await abstraxionBackend.checkStatus(user.id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Status check error:", error);

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
