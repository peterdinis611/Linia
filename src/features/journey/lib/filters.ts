import type { Itinerary, TransferFilter } from "@/lib/transit/types";

export type IndexedItinerary = {
  itinerary: Itinerary;
  index: number;
};

export function itineraryMatchesTransfers(
  itinerary: Itinerary,
  filter: TransferFilter,
): boolean {
  if (filter === "direct") return itinerary.transfers === 0;
  if (filter === "transfers") return itinerary.transfers > 0;
  return true;
}

export function countTransferKinds(itineraries: Itinerary[]) {
  if (itineraries.length === 0) return null;
  let direct = 0;
  let transfers = 0;
  for (const itinerary of itineraries) {
    if (itinerary.transfers === 0) direct += 1;
    else transfers += 1;
  }
  return { direct, transfers };
}

export function indexItineraries(itineraries: Itinerary[]): IndexedItinerary[] {
  return itineraries.map((itinerary, index) => ({ itinerary, index }));
}

export function emptyFilterCopy(
  transferFilter: TransferFilter,
  carriersFiltered: boolean,
): string {
  if (transferFilter === "direct") {
    return carriersFiltered
      ? "results.emptyDirectCarriers"
      : "results.emptyDirect";
  }
  if (transferFilter === "transfers") {
    return carriersFiltered
      ? "results.emptyTransfersCarriers"
      : "results.emptyTransfers";
  }
  return "results.emptyCarriers";
}

export function emptyBoardCopy(hasSearched: boolean) {
  if (!hasSearched) {
    return {
      kicker: "board.idleKicker",
      title: "board.idleTitle",
      body: "board.idleBody",
    };
  }
  return {
    kicker: "board.emptyKicker",
    title: "board.emptyTitle",
    body: "board.emptyBody",
  };
}

export type ResultSort = "depart" | "fastest" | "transfers";

export function sortIndexedItineraries(
  items: IndexedItinerary[],
  sort: ResultSort,
): IndexedItinerary[] {
  if (sort === "depart") return items;
  const copy = [...items];
  if (sort === "fastest") {
    copy.sort(
      (left, right) => left.itinerary.duration - right.itinerary.duration,
    );
  } else {
    copy.sort((left, right) => {
      const byTransfers =
        left.itinerary.transfers - right.itinerary.transfers;
      if (byTransfers !== 0) return byTransfers;
      return left.itinerary.duration - right.itinerary.duration;
    });
  }
  return copy;
}
