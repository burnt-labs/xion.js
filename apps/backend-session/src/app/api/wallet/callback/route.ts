import { NextRequest, NextResponse } from "next/server";
import { getAbstraxionBackend } from "@/lib/abstraxion-backend";
import { callbackSchema } from "@/lib/validation";
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
    const validatedData = callbackSchema.parse(body);

    const { code, state, username } = validatedData;

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
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

    // Handle callback
    const result = await abstraxionBackend.handleCallback({
      code,
      state,
      userId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Callback error:", error);

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
