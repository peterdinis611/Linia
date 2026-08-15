import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderHall } from "@/test/render";
import { AlertStrip } from "@/features/journey/components/AlertStrip";
import type { TransitAlert } from "@/lib/transit/types";

const replacement: TransitAlert = {
  headerText: "Replacement bus",
  descriptionText: "Rail replacement between Dresden and Praha.",
  effect: "MODIFIED_SERVICE",
  url: "https://example.test/notice",
};

const delayed: TransitAlert = {
  headerText: "Long delays",
  descriptionText: "Expect 40 extra minutes.",
  effect: "SIGNIFICANT_DELAYS",
};

describe("AlertStrip", () => {
  it("prints nothing without a notice", () => {
    renderHall(<AlertStrip alerts={[]} />);
    expect(screen.queryByTestId("alert-ribbon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alert-notice")).not.toBeInTheDocument();
  });

  it("stamps a compact ribbon on a ticket", () => {
    renderHall(<AlertStrip alerts={[replacement]} compact />);
    const ribbon = screen.getByTestId("alert-ribbon");
    expect(ribbon).toHaveTextContent("Changed service");
    expect(ribbon).toHaveTextContent("Replacement bus");
    expect(screen.queryByTestId("alert-notice")).not.toBeInTheDocument();
  });

  it("opens the full notice and a source link", async () => {
    const user = userEvent.setup();
    renderHall(<AlertStrip alerts={[replacement, delayed]} />);

    const notice = screen.getByTestId("alert-notice");
    expect(notice).toHaveTextContent("Changed service");
    expect(notice).toHaveTextContent("+1");
    await user.click(screen.getByText("Replacement bus"));
    expect(screen.getByText("Rail replacement between Dresden and Praha.")).toBeVisible();
    expect(screen.getByText("Long delays")).toBeVisible();
    const link = screen.getByRole("link", { name: "Read the notice" });
    expect(link).toHaveAttribute("href", "https://example.test/notice");
  });

  it("falls back to the service stamp when the header is blank", () => {
    renderHall(
      <AlertStrip
        compact
        alerts={[{ headerText: "  ", descriptionText: "Hold the platform.", effect: "NO_SERVICE" }]}
      />,
    );
    expect(screen.getByTestId("alert-ribbon")).toHaveTextContent("No service");
  });
});
