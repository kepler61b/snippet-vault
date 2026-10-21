import React from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { SharedSnippetClient } from "./SharedSnippetClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snippet = await prisma.snippet.findFirst({
    where: {
      OR: [{ shareToken: id }, { id: id }],
    },
    select: { title: true, description: true, visibility: true },
  });

  if (!snippet) {
    return { title: "Сниппет не найден — SnippetVault" };
  }

  return {
    title: `${snippet.title} — SnippetVault`,
    description: snippet.description || "Код сниппет в SnippetVault",
  };
}

export default async function SharedSnippetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
    notFound();
  }

  // Convert dates to string for client component serialization
  const serializedSnippet = {
    ...snippet,
    createdAt: snippet.createdAt.toISOString(),
    updatedAt: snippet.updatedAt.toISOString(),
  };

  return <SharedSnippetClient snippet={serializedSnippet as any} />;
}
