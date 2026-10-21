import { NextRequest, NextResponse } from "next/server";
import {
  generateSnippetMeta,
  explainSnippet,
  refactorSnippet,
  documentSnippet,
} from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, files, code, language } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    if (action === "meta") {
      if (!Array.isArray(files) || files.length === 0) {
        return NextResponse.json(
          { success: false, error: "Files are required for metadata generation" },
          { status: 400 }
        );
      }
      const meta = await generateSnippetMeta(files);
      return NextResponse.json({ success: true, meta });
    }

    if (action === "explain") {
      if (!code) {
        return NextResponse.json(
          { success: false, error: "Code is required" },
          { status: 400 }
        );
      }
      const result = await explainSnippet(code, language || "plaintext");
      return NextResponse.json({ success: true, result });
    }

    if (action === "refactor") {
      if (!code) {
        return NextResponse.json(
          { success: false, error: "Code is required" },
          { status: 400 }
        );
      }
      const result = await refactorSnippet(code, language || "plaintext");
      return NextResponse.json({ success: true, result });
    }

    if (action === "document") {
      if (!code) {
        return NextResponse.json(
          { success: false, error: "Code is required" },
          { status: 400 }
        );
      }
      const result = await documentSnippet(code, language || "plaintext");
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process AI request",
      },
      { status: 500 }
    );
  }
}
