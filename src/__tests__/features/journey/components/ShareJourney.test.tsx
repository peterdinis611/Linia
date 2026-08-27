import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShareJourney } from "@/features/journey/components/ShareJourney";
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
});
