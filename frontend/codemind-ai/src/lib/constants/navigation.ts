import {
  MessageSquare,
  FolderGit2,
  FolderOpen,
  History,
  Network,
  Settings,
} from "lucide-react";

import type { NavItem } from "@/lib/types/navigation";

export const APP_NAME = "CodeMind AI";

export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/chat",
    label: "Chat",
    description: "Code intelligence workspace",
    icon: MessageSquare,
  },
  {
    href: "/repositories",
    label: "Repositories",
    description: "Indexed codebases",
    icon: FolderGit2,
  },
  {
    href: "/architecture",
    label: "Architecture",
    description: "System topology graph",
    icon: Network,
  },
  {
    href: "/semantic-search",
    label: "Files",
    description: "Semantic search & explorer",
    icon: FolderOpen,
  },
  {
    href: "/history",
    label: "History",
    description: "Session timeline",
    icon: History,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Platform configuration",
    icon: Settings,
  },
];

export const DEFAULT_REPO = "main-repo";
