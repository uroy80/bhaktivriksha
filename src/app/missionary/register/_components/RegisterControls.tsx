"use client";

import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { Icon } from "@/components/icons";

export function RegisterControls({ month }: { month: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="month"
        aria-label="Register month"
        defaultValue={month}
        className="w-44"
        onChange={(e) => {
          const value = e.target.value;
          if (value) router.push(`/missionary/register?month=${value}`);
        }}
      />
      <Button type="button" variant="secondary" onClick={() => window.print()}>
        <Icon.download className="h-4 w-4" />
        Print / Save PDF
      </Button>
    </div>
  );
}
