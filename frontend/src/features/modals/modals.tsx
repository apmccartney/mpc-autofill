import React from "react";

import { useAppDispatch, useAppSelector } from "@/common/types";
import { MemoizedCardDetailedView } from "@/features/cardDetailedView/cardDetailedViewModal";
import { ChangeQueryModal } from "@/features/changeQuery/changeQueryModal";
import { InvalidIdentifiersModal } from "@/features/invalidIdentifiers/invalidIdentifiersModal";
import {
  hideModal,
  selectModalCard,
  selectModalSlots,
  selectShownModal,
} from "@/features/modals/modalsSlice";
import { SupportBackendModal } from "@/features/support/supportBackendModal";
import { SupportDeveloperModal } from "@/features/support/supportDeveloperModal";

export function Modals() {
  //# region queries and hooks

  const dispatch = useAppDispatch();
  const selectedImage = useAppSelector(selectModalCard);
  const selectedSlots = useAppSelector(selectModalSlots);
  const shownModal = useAppSelector(selectShownModal);

  //# endregion

  //# region callbacks

  const handleClose = () => dispatch(hideModal());

  //# endregion

  // TODO: move the grid selector into here

  return (
    <>
      {selectedImage != null && (
        <MemoizedCardDetailedView
          cardDocument={selectedImage}
          show={shownModal === "cardDetailedView"}
          handleClose={handleClose}
        />
      )}
      {selectedSlots != null && (
        <ChangeQueryModal
          slots={selectedSlots}
          show={shownModal === "changeQuery"}
          handleClose={handleClose}
        />
      )}
      <SupportDeveloperModal
        show={shownModal === "supportDeveloper"}
        handleClose={handleClose}
      />
      <SupportBackendModal
        show={shownModal === "supportBackend"}
        handleClose={handleClose}
      />
      <InvalidIdentifiersModal
        show={shownModal === "invalidIdentifiers"}
        handleClose={handleClose}
      />
    </>
  );
}
