"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useSettings } from "@/hooks/data";
import { updateSettings } from "@/lib/repositories/settings";
import { Button } from "@/components/ui/button";
import type { ThemeMode } from "@/types";

const NEXT: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "system", system: "light" };

export function ThemeToggle() {
  const settings = useSettings();
  const theme = settings?.theme ?? "system";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => updateSettings({ theme: NEXT[theme] })}
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}
      title={`Theme: ${theme}`}
    >
      <Icon size={15} />
    </Button>
  );
}
