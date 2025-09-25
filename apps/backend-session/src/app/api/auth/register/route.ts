import { prisma } from "@/lib/xion/database";
import { hashPassword, registerSchema } from "@/lib/auth";
import { createStandardApiHandler } from "@/lib/api-wrapper";
import { ApiException } from "@/lib/api-response";

export const POST = createStandardApiHandler(
  async (context) => {
    const { validatedData } = context;
    const { username, email, password } = validatedData;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ApiException("Username already exists", 400, "USERNAME_EXISTS");
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new ApiException("Email already exists", 400, "EMAIL_EXISTS");
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: "User registered successfully",
      user,
    };
  },
  {
    schema: registerSchema,
    schemaType: "body",
    rateLimit: "strict",
    allowedMethods: ["POST"],
  },
);
