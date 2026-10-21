import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    const collections = await prisma.collection.findMany({
      where: currentUser
        ? {
            OR: [{ userId: currentUser.id }, { userId: null }],
          }
        : undefined,
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { snippets: true },
        },
      },
    });

    return NextResponse.json({ success: true, collections });
  } catch (error: any) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { name, description, iconType, iconValue, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Укажите название коллекции" },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        iconType: iconType === "custom_image" ? "custom_image" : "lucide",
        iconValue: iconValue || "Folder",
        color: color || "#8b5cf6",
        userId: currentUser?.id || null,
      },
      include: {
        _count: {
          select: { snippets: true },
        },
      },
    });

    return NextResponse.json({ success: true, collection }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create collection" },
      { status: 500 }
    );
  }
}
