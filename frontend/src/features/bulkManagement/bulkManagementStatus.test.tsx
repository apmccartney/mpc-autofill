// TODO: add tests for double-click behaviour - both card fronts and backs
//       (particularly test double-clicking cardbacks to select them all)

import { screen, waitFor } from "@testing-library/react";

import App from "@/app/app";
import { Back, Front } from "@/common/constants";
import {
  cardDocument1,
  cardDocument2,
  cardDocument5,
} from "@/common/test-constants";
import {
  changeImageForSelectedImages,
  changeQueryForSelectedImages,
  clearQueriesForSelectedImages,
  deleteSelectedImages,
  deselectSlot,
  expectCardbackSlotState,
  expectCardGridSlotState,
  expectCardSlotToNotExist,
  importText,
  renderWithProviders,
  selectSlot,
} from "@/common/test-utils";
import {
  cardbacksOneOtherResult,
  cardbacksOneResult,
  cardbacksTwoResults,
  cardDocumentsOneResult,
  cardDocumentsSixResults,
  cardDocumentsThreeResults,
  defaultHandlers,
  searchResultsOneResult,
  searchResultsSixResults,
  searchResultsThreeResults,
  sourceDocumentsOneResult,
  sourceDocumentsThreeResults,
} from "@/mocks/handlers";
import { server } from "@/mocks/server";

test("selecting a single card and changing its query", async () => {
  server.use(
    cardDocumentsSixResults,
    cardbacksOneResult,
    sourceDocumentsThreeResults,
    searchResultsSixResults,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("query 1");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);

  await selectSlot(1, Front);
  await changeQueryForSelectedImages("query 2");
  await expectCardGridSlotState(1, Front, cardDocument2.name, 1, 1);
});

test("selecting multiple cards and changing both of their queries", async () => {
  server.use(
    cardDocumentsSixResults,
    cardbacksOneResult,
    sourceDocumentsThreeResults,
    searchResultsSixResults,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("2x query 1");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);
  await expectCardGridSlotState(2, Front, cardDocument1.name, 1, 1);

  await selectSlot(1, Front);
  await selectSlot(2, Front);
  await changeQueryForSelectedImages("query 2");
  await expectCardGridSlotState(1, Front, cardDocument2.name, 1, 1);
  await expectCardGridSlotState(2, Front, cardDocument2.name, 1, 1);
});

test("selecting a single card and changing its selected image", async () => {
  server.use(
    cardDocumentsThreeResults,
    cardbacksOneResult,
    sourceDocumentsOneResult,
    searchResultsThreeResults,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 3);

  await selectSlot(1, Front);
  await changeImageForSelectedImages(cardDocument2.name);
  await expectCardGridSlotState(1, Front, cardDocument2.name, 2, 3);
});

test("selecting multiple cards with the same query and changing both of their selected images", async () => {
  server.use(
    cardDocumentsThreeResults,
    cardbacksOneResult,
    sourceDocumentsOneResult,
    searchResultsThreeResults,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("2x my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 3);
  await expectCardGridSlotState(2, Front, cardDocument1.name, 1, 3);

  await selectSlot(1, Front);
  await selectSlot(2, Front);
  await changeImageForSelectedImages(cardDocument2.name);
  await expectCardGridSlotState(1, Front, cardDocument2.name, 2, 3);
  await expectCardGridSlotState(2, Front, cardDocument2.name, 2, 3);
});

test("selecting multiple cardbacks and changing both of their selected images", async () => {
  server.use(
    cardDocumentsThreeResults,
    cardbacksTwoResults,
    sourceDocumentsOneResult,
    searchResultsThreeResults,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument1.identifier,
      },
    },
  });

  await importText("2x my search query");
  await expectCardGridSlotState(1, Back, cardDocument1.name, 1, 2);
  await expectCardGridSlotState(2, Back, cardDocument1.name, 1, 2);

  await selectSlot(1, Back);
  await selectSlot(2, Back);
  await changeImageForSelectedImages(cardDocument2.name);
  await expectCardGridSlotState(1, Back, cardDocument2.name, 2, 2);
  await expectCardGridSlotState(2, Back, cardDocument2.name, 2, 2);
});

test("cannot change the images of multiple selected images when they don't share the same query", async () => {
  server.use(
    cardDocumentsSixResults,
    cardbacksOneResult,
    sourceDocumentsThreeResults,
    searchResultsSixResults,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("query 1\nquery 2");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);
  await expectCardGridSlotState(2, Front, cardDocument2.name, 1, 1);

  await selectSlot(1, Front);
  await selectSlot(2, Front);

  screen.getByText("Modify").click();
  await waitFor(() =>
    expect(screen.queryByText("Change Version")).not.toBeInTheDocument()
  );
});

test("selecting a single card and clearing its front query", async () => {
  server.use(
    cardDocumentsOneResult,
    cardbacksOneResult,
    sourceDocumentsOneResult,
    searchResultsOneResult,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);

  await selectSlot(1, Front);
  await clearQueriesForSelectedImages();
  await expectCardGridSlotState(1, Front, null, null, null);
});

test("selecting a single card and clearing its back query", async () => {
  server.use(
    cardDocumentsSixResults,
    cardbacksOneOtherResult,
    sourceDocumentsOneResult,
    searchResultsOneResult,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("my search query | my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);
  await expectCardGridSlotState(1, Back, cardDocument1.name, 1, 1);
  await expectCardbackSlotState(cardDocument5.name, 1, 1);

  await selectSlot(1, Back);
  await clearQueriesForSelectedImages();
  // after its query is cleared, slot 1's back has reverted to the project's cardback
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);
  await expectCardGridSlotState(1, Back, cardDocument5.name, 1, 1);
});

test("selecting multiple cards and clearing their front queries", async () => {
  server.use(
    cardDocumentsOneResult,
    cardbacksOneResult,
    sourceDocumentsOneResult,
    searchResultsOneResult,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("2x my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);
  await expectCardGridSlotState(2, Front, cardDocument1.name, 1, 1);

  await selectSlot(1, Front);
  await selectSlot(2, Front);
  await clearQueriesForSelectedImages();
  await expectCardGridSlotState(1, Front, null, null, null);
  await expectCardGridSlotState(2, Front, null, null, null);
});

test("selecting a single card and deleting it", async () => {
  server.use(
    cardDocumentsOneResult,
    cardbacksOneResult,
    sourceDocumentsOneResult,
    searchResultsOneResult,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);

  await selectSlot(1, Front);
  await deleteSelectedImages();
  await expectCardSlotToNotExist(1);
});

test("selecting multiple cards and deleting them", async () => {
  server.use(
    cardDocumentsOneResult,
    cardbacksOneResult,
    sourceDocumentsOneResult,
    searchResultsOneResult,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("2x my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);
  await expectCardGridSlotState(2, Front, cardDocument1.name, 1, 1);

  await selectSlot(1, Front);
  await selectSlot(2, Front);
  await deleteSelectedImages();
  await expectCardSlotToNotExist(1);
  await expectCardSlotToNotExist(2);
});

test("selecting then clearing the selection", async () => {
  server.use(
    cardDocumentsOneResult,
    cardbacksOneResult,
    sourceDocumentsOneResult,
    searchResultsOneResult,
    ...defaultHandlers
  );
  renderWithProviders(<App />, {
    preloadedState: {
      project: {
        members: [],
        cardback: cardDocument5.identifier,
      },
    },
  });

  await importText("my search query");
  await expectCardGridSlotState(1, Front, cardDocument1.name, 1, 1);

  await selectSlot(1, Front);
  await deselectSlot(1, Front);
});
