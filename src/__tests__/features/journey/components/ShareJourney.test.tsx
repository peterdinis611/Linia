import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ShareJourney } from "@/features/journey/components/ShareJourney";
import { railItinerary } from "@/test/fixtures";
import { renderHall } from "@/test/render";

describe("ShareJourney", () => {
  it("prints a station board stub instead of a ticket", () => {
    renderHall(
      <ShareJourney
        kind="board"
        url="http://localhost:3000/en?board=1"
        itinerary={null}
        fromName="Bardejov"
      />,
    );

    expect(screen.getByTestId("share-open")).toHaveTextContent("Share the board");
    const dialog = screen.getByTestId("share-dialog");
    expect(dialog).toHaveAttribute("data-kind", "board");
    expect(dialog).toHaveTextContent("Share this board");
    expect(screen.getByTestId("share-board-stub")).toHaveTextContent("Bardejov");
    expect(screen.getByTestId("share-url")).toHaveValue(
      "http://localhost:3000/en?board=1",
    );
  });

  it("offers a multi-sheet PDF stamp when several routes are selected", async () => {
    const user = userEvent.setup();
    renderHall(
      <ShareJourney
        url="http://localhost:3000/en"
        itinerary={railItinerary()}
        printCount={2}
        fromName="Berlin Hbf"
        toName="Praha hl.n."
      />,
    );

    await user.click(screen.getByTestId("share-open"));
    expect(screen.getByTestId("share-print")).toHaveTextContent(
      "Print 2 sheets / PDF",
    );
    expect(screen.getByTestId("share-dialog")).toHaveTextContent(
      "Each selected route prints on its own page",
    );
  });
});
