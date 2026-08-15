"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/status/StatusScreen";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
};

export default function GlobalError({ error, retry, reset }: GlobalErrorProps) {
  const recover = retry ?? reset;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden font-sans text-ink">
        <StatusScreen
          mark="Fault"
          kicker="The hall is closed"
          title="The root board failed"
          body={
            error.digest
              ? `The station layout itself jammed. Reference ${error.digest}.`
              : "The station layout itself jammed. Try printing the hall again."
          }
          actions={
            recover ? (
              <button type="button" className="search-cta max-w-xs" onClick={() => recover()}>
                Try again
              </button>
            ) : null
          }
        />
      </body>
    </html>
  );
}
