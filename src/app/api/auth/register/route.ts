import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Публичная регистрация отключена. Учетные записи создаются администратором системы в панели управления.",
    },
    { status: 403 }
  );
}
