import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrintTicket } from "@/features/journey/components/PrintTicket";
import { berlin, prague, railItinerary } from "@/test/fixtures";
import { renderHall } from "@/test/render";

describe("PrintTicket", () => {
  it("inks a QR for the live share URL", () => {
    const url =
      "http://localhost:3000/en?from=52.52500*13.36900*STOP*stop-berlin*Berlin%20Hbf*Berlin&to=50.08300*14.43500*STOP*stop-prague*Praha%20hl.n.*Prague";
    renderHall(
      <PrintTicket
        itinerary={railItinerary()}
        from={berlin}
        to={prague}
        url={url}
      />,
    );
    const qr = screen.getByTestId("print-qr");
    expect(qr).toHaveTextContent("Scan for the live ticket");
    expect(qr.querySelector("svg")).toHaveAttribute(
      "aria-label",
      "Scan for the live ticket",
    );
    expect(qr.querySelector("path")).toBeTruthy();
  });

  it("prints without a mark when the share URL is missing", () => {
    renderHall(
      <PrintTicket itinerary={railItinerary()} from={berlin} to={prague} />,
    );
    expect(screen.queryByTestId("print-qr")).not.toBeInTheDocument();
  });
});
