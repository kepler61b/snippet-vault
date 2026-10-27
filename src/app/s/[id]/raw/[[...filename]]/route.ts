import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  logIntegrationActivity,
  detectIntegrationClient,
  extractClientIp,
} from "@/lib/integration-log";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename?: string[] }> }
) {
  try {
    const { id, filename: filenameSegments } = await params;

    const snippet = await prisma.snippet.findFirst({
      where: {
        OR: [{ shareToken: id }, { id: id }],
      },
      include: {
        files: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!snippet) {
      return new NextResponse("Snippet not found\n", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    if (!snippet.files || snippet.files.length === 0) {
      return new NextResponse("Snippet has no files\n", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    let targetFile = snippet.files[0];

    if (filenameSegments && filenameSegments.length > 0) {
      const requestedName = filenameSegments.join("/");
      const lowerRequested = requestedName.toLowerCase();
      const baseRequested = requestedName.split("/").pop()?.toLowerCase();

      const matched = snippet.files.find((f) => {
        if (f.filename === requestedName) return true;
        if (f.filename.toLowerCase() === lowerRequested) return true;
        if (baseRequested && f.filename.split("/").pop()?.toLowerCase() === baseRequested) {
          return true;
        }
        return false;
      });

      if (!matched) {
        return new NextResponse(`File "${requestedName}" not found in snippet\n`, {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

      targetFile = matched;
    }

    const safeFilename = targetFile.filename || "snippet.txt";

    logIntegrationActivity({
      client: detectIntegrationClient(request),
      action: `Raw файл: ${safeFilename}`,
      method: "GET",
      path: request.nextUrl.pathname,
      status: 200,
      details: `Сниппет: "${snippet.title}" (${targetFile.language})`,
      userId: snippet.userId,
      ip: extractClientIp(request),
      userAgent: request.headers.get("user-agent"),
    }).catch(() => {});

    return new NextResponse(targetFile.content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeFilename)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error("Error serving raw snippet:", error);
    return new NextResponse("Internal Server Error\n", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
