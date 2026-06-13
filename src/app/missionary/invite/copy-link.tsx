"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — selection fallback
      const input = document.getElementById("invite-url") as HTMLInputElement | null;
      input?.select();
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Bhakti Vriksha group", url });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          id="invite-url"
          readOnly
          value={url}
          className="block w-full rounded-lg border-0 bg-saffron-50 px-3 py-2 text-sm text-saffron-950 ring-1 ring-inset ring-saffron-900/15"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button variant="secondary" onClick={copy} className="shrink-0">
          <Icon.check className={copied ? "h-4 w-4" : "hidden"} />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Button onClick={share} className="w-full">
        <Icon.invite className="h-4 w-4" />
        Share invite link
      </Button>
    </div>
  );
}
