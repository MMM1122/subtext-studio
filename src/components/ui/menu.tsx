"use client";
import * as M from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/text";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ children, align = "end" }: { children: ReactNode; align?: "start" | "end" | "center" }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={4}
        className="z-50 min-w-[180px] rounded-md border border-line bg-bg p-1 text-sm shadow-lg"
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  danger,
  disabled,
  icon,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <M.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface",
        danger ? "text-danger" : "text-ink",
      )}
    >
      {icon && <span className="text-muted">{icon}</span>}
      {children}
    </M.Item>
  );
}

export function MenuSeparator() {
  return <M.Separator className="my-1 h-px bg-line" />;
}
