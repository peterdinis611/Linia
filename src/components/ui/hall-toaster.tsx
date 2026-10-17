"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme/ThemeProvider";

/** Paper-hall Sonner mount — one per app, next to ThemeProvider. */
export function HallToaster() {
  const { resolved } = useTheme();

  return (
    <Toaster
      theme={resolved}
      position="bottom-center"
      closeButton
      duration={3200}
      gap={10}
      offset={{ bottom: "1.25rem" }}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "hall-toast",
          title: "hall-toast-title",
          description: "hall-toast-body",
          actionButton: "hall-toast-action",
          cancelButton: "hall-toast-cancel",
          closeButton: "hall-toast-close",
          success: "hall-toast-success",
          error: "hall-toast-error",
          info: "hall-toast-info",
          warning: "hall-toast-warning",
        },
      }}
    />
  );
}
