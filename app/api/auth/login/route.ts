import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { message: "Missing email or password" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return NextResponse.json(
      { message: "Invalid email or password.." },
      { status: 401 }
    );
  }

  // Demo: set cookie đơn giản  
  (await
        // Demo: set cookie đơn giản
        cookies()).set("user_id", String(user.id), {
    httpOnly: true,
    sameSite: "lax",
  });

  return NextResponse.json({
    message: "Login successful",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
