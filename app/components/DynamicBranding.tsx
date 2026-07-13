"use client";

import { useEffect } from "react";
import { createClient } from "../lib/supabase/client";

export default function DynamicBranding() {
  useEffect(() => {
    async function loadBranding() {
      const supabase = createClient();

      const { data } = await supabase
        .from("site_settings")
        .select("site_name, favicon_url")
        .eq("id", 1)
        .single();

      if (data?.site_name) {
        document.title = data.site_name;
      }

      if (data?.favicon_url) {
        let icon = document.querySelector(
          "link[rel='icon']"
        ) as HTMLLinkElement | null;

        if (!icon) {
          icon = document.createElement("link");
          icon.rel = "icon";
          document.head.appendChild(icon);
        }

        icon.href = data.favicon_url;
      }
    }

    loadBranding();
  }, []);

  return null;
}