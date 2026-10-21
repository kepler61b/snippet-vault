export interface SnippetFileItem {
  id?: string;
  snippetId?: string;
  filename: string;
  language: string;
  content: string;
  order?: number;
}

export interface SnippetItem {
  id: string;
  title: string;
  description: string | null;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  shareToken: string;
  isFavorite: boolean;
  tags: string;
  createdAt: string;
  updatedAt: string;
  files: SnippetFileItem[];
}
