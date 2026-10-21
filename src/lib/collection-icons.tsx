import React from "react";
import {
  BookOpen,
  Bookmark,
  Boxes,
  Braces,
  Cloud,
  Code2,
  Cpu,
  Database,
  FileCode,
  Flame,
  Folder,
  FolderCode,
  FolderGit2,
  Globe,
  Layers,
  Layout,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";

export interface AvailableIcon {
  id: string;
  name: string;
  component: React.ComponentType<{ className?: string }>;
}

export const STANDARD_ICONS: AvailableIcon[] = [
  { id: "Folder", name: "Папка", component: Folder },
  { id: "FolderCode", name: "Код папка", component: FolderCode },
  { id: "Terminal", name: "Терминал", component: Terminal },
  { id: "Code2", name: "Код", component: Code2 },
  { id: "Braces", name: "Скобки", component: Braces },
  { id: "Database", name: "База данных", component: Database },
  { id: "Server", name: "Сервер", component: Server },
  { id: "Cloud", name: "Облако", component: Cloud },
  { id: "Cpu", name: "Процессор", component: Cpu },
  { id: "Layers", name: "Слои", component: Layers },
  { id: "Boxes", name: "Модули", component: Boxes },
  { id: "Sparkles", name: "AI / Магия", component: Sparkles },
  { id: "Zap", name: "Молния", component: Zap },
  { id: "Flame", name: "Огонь", component: Flame },
  { id: "Shield", name: "Безопасность", component: Shield },
  { id: "Globe", name: "Веб / Сеть", component: Globe },
  { id: "FileCode", name: "Скрипт", component: FileCode },
  { id: "BookOpen", name: "Документация", component: BookOpen },
  { id: "Bookmark", name: "Закладка", component: Bookmark },
  { id: "Layout", name: "Интерфейс", component: Layout },
  { id: "Workflow", name: "Workflow", component: Workflow },
  { id: "FolderGit2", name: "Git", component: FolderGit2 },
];

export const PRESET_COLORS = [
  "#8b5cf6", // Violet
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#ec4899", // Pink
  "#a855f7", // Purple
  "#71717a", // Zinc
];

interface CollectionIconProps {
  iconType: string;
  iconValue: string;
  color?: string | null;
  className?: string;
}

export function CollectionIcon({
  iconType,
  iconValue,
  color,
  className = "w-4 h-4",
}: CollectionIconProps) {
  if (iconType === "custom_image" && iconValue) {
    return (
      <img
        src={iconValue}
        alt="Collection"
        className={`${className} object-cover rounded flex-shrink-0`}
      />
    );
  }

  const found = STANDARD_ICONS.find((i) => i.id === iconValue);
  const IconComponent = found ? found.component : Folder;

  return (
    <IconComponent
      className={`${className} flex-shrink-0`}
      style={{ color: color || "#8b5cf6" }}
    />
  );
}
