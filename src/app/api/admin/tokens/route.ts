import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generatePat, getPatPolicies, validatePatExpiration } from "@/lib/pat";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const [tokens, policies] = await Promise.all([
      prisma.personalAccessToken.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isBanned: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getPatPolicies(),
    ]);

    return NextResponse.json({
      success: true,
      tokens,
      policies,
    });
  } catch (error: any) {
    console.error("Admin get tokens error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка получения токенов" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, name, expiresInDays } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "Укажите пользователя, для которого создается токен" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Укажите название токена" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    let parsedDays: number | null = null;
    if (expiresInDays !== undefined && expiresInDays !== null && expiresInDays !== "never") {
      const num = Number(expiresInDays);
      if (!isNaN(num) && num > 0) {
        parsedDays = num;
      }
    }

    // Validate against PAT policies
    const policies = await getPatPolicies();
    const validation = validatePatExpiration(parsedDays, policies);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { rawToken, pat } = await generatePat({
      userId: targetUser.id,
      name: name.trim(),
      expiresInDays: parsedDays,
    });

    // Log admin action to integration log
    await prisma.integrationLog
      .create({
        data: {
          client: "Admin Console",
          action: `Выпуск токена для ${targetUser.email}`,
          method: "POST",
          path: "/api/admin/tokens",
          status: 201,
          tokenPrefix: pat.tokenPrefix,
          userId: targetUser.id,
          details: `Создан токен "${pat.name}" администратором ${admin.email}`,
        },
      })
      .catch(() => {});

    await logAuditEvent({
      event: "TOKEN_CREATE",
      category: "SECURITY",
      status: "SUCCESS",
      actorId: admin.id,
      actorEmail: admin.email,
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      details: `Выпущен токен "${pat.name}" (${pat.tokenPrefix}) для ${targetUser.email}`,
      request,
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        token: rawToken,
        pat: {
          ...pat,
          user: targetUser,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Admin create token error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка создания токена" },
      { status: 500 }
    );
  }
}
