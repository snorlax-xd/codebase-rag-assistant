import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type BreadcrumbItem = {
  label: string;
  href?: string;
};
