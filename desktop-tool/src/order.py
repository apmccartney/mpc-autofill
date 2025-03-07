import os
import sys
from concurrent.futures import ThreadPoolExecutor
from glob import glob
from queue import Queue
from typing import Optional
from xml.etree.ElementTree import Element, ParseError

import attr
import enlighten
import InquirerPy
from defusedxml.ElementTree import parse as defused_parse
from sanitize_filename import sanitize

from src import constants
from src.exc import ValidationException
from src.io import (
    CURRDIR,
    download_google_drive_file,
    file_exists,
    get_google_drive_file_name,
    image_directory,
)
from src.processing import ImagePostProcessingConfig
from src.utils import bold, text_to_list, unpack_element


@attr.s
class CardImage:
    drive_id: str = attr.ib(default="")
    slots: list[int] = attr.ib(default=[])
    name: Optional[str] = attr.ib(default="")
    file_path: Optional[str] = attr.ib(default="")
    query: Optional[str] = attr.ib(default=None)

    downloaded: bool = attr.ib(init=False, default=False)
    uploaded: bool = attr.ib(init=False, default=False)
    errored: bool = attr.ib(init=False, default=False)

    # region file system interactions

    def file_exists(self) -> bool:
        """
        Determines whether this image has been downloaded successfully.
        """

        return file_exists(self.file_path)

    def retrieve_card_name(self) -> None:
        """
        Retrieves the file's name based on Google Drive ID. `None` indicates that the file on GDrive is invalid.
        """

        if not self.name:
            self.name = get_google_drive_file_name(drive_id=self.drive_id)

    def generate_file_path(self) -> None:
        """
        Sets `self.file_path` according to the following logic:
        * If `self.drive_id` points to a valid file in the user's file system, use it as the file path
        * If a file with `self.name` exists in the `cards` directory, use the path to that file as the file path
        * Otherwise, use `self.name` with `self.drive_id` in parentheses in the `cards` directory as the file path.
        """

        if file_exists(self.drive_id):
            self.file_path = self.drive_id
            self.name = os.path.basename(self.file_path)
            return

        if not self.name:
            self.retrieve_card_name()

        if self.name is None:
            if self.drive_id:
                # assume png
                print(
                    f"The name of the image {bold(self.drive_id)} could not be determined, meaning that its "
                    f"file extension is unknown. As a result, an assumption is made that the file extension "
                    f"is {bold('.png')}."
                )
                self.name = f"{self.drive_id}.png"
                self.file_path = os.path.join(image_directory(), sanitize(self.name))
            else:
                self.file_path = None
        else:
            file_path = os.path.join(image_directory(), sanitize(self.name))
            if not os.path.isfile(file_path) or os.path.getsize(file_path) <= 0:
                # The filepath without ID in parentheses doesn't exist - change the filepath to contain the ID instead
                name_split = self.name.rsplit(".", 1)
                file_path = os.path.join(
                    image_directory(), sanitize(f"{name_split[0]} ({self.drive_id}).{name_split[1]}")
                )
            self.file_path = file_path

    # endregion

    # region initialisation

    def validate(self) -> None:
        self.errored = any([self.errored, self.name is None, self.file_path is None])

    def __attrs_post_init__(self) -> None:
        self.generate_file_path()
        self.validate()

    # endregion

    # region public

    @classmethod
    def from_element(cls, element: Element) -> "CardImage":
        card_dict = unpack_element(element, [x.value for x in constants.DetailsTags])
        drive_id = ""
        if (drive_id_text := card_dict[constants.CardTags.id].text) is not None:
            drive_id = drive_id_text.strip(' "')
        slots = []
        if (slots_text := card_dict[constants.CardTags.slots].text) is not None:
            slots = text_to_list(slots_text)
        name = None
        if constants.CardTags.name in card_dict.keys():
            name = card_dict[constants.CardTags.name].text
        query = None
        if constants.CardTags.query in card_dict.keys():
            query = card_dict[constants.CardTags.query].text
        card_image = cls(drive_id=drive_id, slots=slots, name=name, query=query)
        return card_image

    def download_image(
        self,
        queue: Queue["CardImage"],
        download_bar: enlighten.Counter,
        post_processing_config: Optional[ImagePostProcessingConfig],
    ) -> None:
        try:
            if not self.file_exists() and not self.errored and self.file_path is not None:
                self.errored = not download_google_drive_file(
                    drive_id=self.drive_id, file_path=self.file_path, post_processing_config=post_processing_config
                )

            if self.file_exists() and not self.errored:
                self.downloaded = True
            else:
                print(
                    f"Failed to download '{bold(self.name)}' - allocated to slot/s {bold(self.slots)}.\n"
                    f"Download link - {bold(f'https://drive.google.com/uc?id={self.drive_id}&export=download')}\n"
                )
        except Exception as e:
            # note: python threads die silently if they encounter an exception. if an exception does occur,
            # log it, but still put the card onto the queue so the main thread doesn't spin its wheels forever waiting.
            print(
                f"An uncaught exception occurred when attempting to download '{bold(self.name)}':\n{bold(e)}\n"
                f"Download link - {bold(f'https://drive.google.com/uc?id={self.drive_id}&export=download')}\n"
            )
        finally:
            queue.put(self)
            download_bar.update()

    # endregion


@attr.s
class CardImageCollection:
    """
    A collection of CardImages for one face of a CardOrder.
    """

    cards: list[CardImage] = attr.ib(default=[])
    queue: Queue[CardImage] = attr.ib(init=False, default=attr.Factory(Queue))
    num_slots: int = attr.ib(default=0)
    face: constants.Faces = attr.ib(default=constants.Faces.front)

    # region initialisation

    def all_slots(self) -> set[int]:
        return set(range(0, self.num_slots))

    def slots(self) -> set[int]:
        return {y for x in self.cards for y in x.slots}

    def validate(self) -> None:
        if self.num_slots == 0 or not self.cards:
            raise ValidationException(f"{self.face} has no images!")
        slots_missing = self.all_slots() - self.slots()
        if slots_missing:
            print(
                f"Warning - the following slots are empty in your order for the {self.face} face: "
                f"{bold(sorted(slots_missing))}"
            )

    # endregion

    # region public

    @classmethod
    def from_element(
        cls, element: Element, num_slots: int, face: constants.Faces, fill_image_id: Optional[str] = None
    ) -> "CardImageCollection":
        card_images = []
        if element:
            for x in element:
                card_images.append(CardImage.from_element(x))
        card_image_collection = cls(cards=card_images, num_slots=num_slots, face=face)
        if fill_image_id:
            # fill the remaining slots in this card image collection with a new card image based off the given id
            missing_slots = card_image_collection.all_slots() - card_image_collection.slots()
            if missing_slots:
                card_image_collection.cards.append(
                    CardImage(drive_id=fill_image_id.strip(' "'), slots=list(missing_slots))
                )

        # postponing validation from post-init so we don't error for missing slots that `fill_image_id` would fill
        try:
            card_image_collection.validate()
        except ValidationException as e:
            input(f"There was a problem with your order file:\n{bold(e)}\nPress Enter to exit.")
            sys.exit(0)
        return card_image_collection

    def download_images(
        self,
        pool: ThreadPoolExecutor,
        download_bar: enlighten.Counter,
        post_processing_config: Optional[ImagePostProcessingConfig],
    ) -> None:
        """
        Set up the provided ThreadPoolExecutor to download this collection's images, updating the given progress
        bar with each image. Async function.
        """

        pool.map(lambda x: x.download_image(self.queue, download_bar, post_processing_config), self.cards)

    # endregion


@attr.s
class Details:
    quantity: int = attr.ib(default=0)
    bracket: int = attr.ib(default=0)
    stock: str = attr.ib(default=constants.Cardstocks.S30.value)
    foil: bool = attr.ib(default=False)

    # region initialisation

    def validate(self) -> None:
        if not 0 < self.quantity <= self.bracket:
            raise ValidationException(
                f"Order quantity {self.quantity} outside allowable range of {bold(f'[0, {self.bracket}]')}!"
            )
        if self.bracket not in constants.BRACKETS:
            raise ValidationException(f"Order bracket {self.bracket} not supported!")
        if self.stock not in [x.value for x in constants.Cardstocks]:
            raise ValidationException(f"Order cardstock {self.stock} not supported!")
        if self.stock == constants.Cardstocks.P10 and self.foil is True:
            raise ValidationException(f"Order cardstock {self.stock} is not supported in foil!")

    def __attrs_post_init__(self) -> None:
        try:
            self.validate()
        except ValidationException as e:
            input(f"There was a problem with your order file:\n\n{bold(e)}\n\nPress Enter to exit.")
            sys.exit(0)

    # endregion

    # region public

    @classmethod
    def from_element(cls, element: Element) -> "Details":
        details_dict = unpack_element(element, [x.value for x in constants.DetailsTags])
        quantity = 0
        if (quantity_text := details_dict[constants.DetailsTags.quantity].text) is not None:
            quantity = int(quantity_text)
        bracket = 0
        if (bracket_text := details_dict[constants.DetailsTags.bracket].text) is not None:
            bracket = int(bracket_text)
        stock = details_dict[constants.DetailsTags.stock].text or constants.Cardstocks.S30
        foil: bool = details_dict[constants.DetailsTags.foil].text == "true"

        details = cls(quantity=quantity, bracket=bracket, stock=stock, foil=foil)
        return details

    # endregion


@attr.s
class CardOrder:
    name: Optional[str] = attr.ib(default=None)
    details: Details = attr.ib(default=None)
    fronts: CardImageCollection = attr.ib(default=None)
    backs: CardImageCollection = attr.ib(default=None)

    # region logging

    def print_order_overview(self) -> None:
        if self.name is not None:
            print(f"Successfully parsed card order: {bold(self.name)}")
        print(
            f"Your order has a total of {bold(self.details.quantity)} cards, in the bracket of up "
            f"to {bold(self.details.bracket)} cards.\n{bold(self.details.stock)} "
            f"cardstock ({bold('foil' if self.details.foil else 'nonfoil')}.\n "
        )

    # endregion

    # region initialisation

    def validate(self) -> None:
        for collection in [self.fronts, self.backs]:
            for image in collection.cards:
                if not image.file_path:
                    raise ValidationException(
                        f"The file path for the image in slots {bold(image.slots or image.drive_id)} "
                        f"of face {bold(collection.face)} could not be determined."
                    )

    def __attrs_post_init__(self) -> None:
        try:
            self.validate()
        except ValidationException as e:
            input(f"There was a problem with your order file:\n\n{bold(e)}\n\nPress Enter to exit.")
            sys.exit(0)

    @classmethod
    def from_element(cls, element: Element, name: Optional[str] = None) -> "CardOrder":
        root_dict = unpack_element(element, [x.value for x in constants.BaseTags])
        details = Details.from_element(root_dict[constants.BaseTags.details])
        fronts = CardImageCollection.from_element(
            element=root_dict[constants.BaseTags.fronts], num_slots=details.quantity, face=constants.Faces.front
        )
        cardback_elem = root_dict[constants.BaseTags.cardback]
        if cardback_elem.text is not None:
            backs = CardImageCollection.from_element(
                element=root_dict[constants.BaseTags.backs],
                num_slots=details.quantity,
                face=constants.Faces.back,
                fill_image_id=cardback_elem.text,
            )
        else:
            print(f"{bold('Warning')}: Your order file did not contain a common cardback image.")
            backs = CardImageCollection.from_element(
                element=root_dict[constants.BaseTags.backs], num_slots=details.quantity, face=constants.Faces.back
            )
        # If the order has a single cardback, set its slots to [0], as it will only be uploaded and inserted into
        # a single slot
        if len(backs.cards) == 1:
            backs.cards[0].slots = [0]
        order = cls(name=name, details=details, fronts=fronts, backs=backs)
        return order

    @classmethod
    def from_file_name(cls, file_name: str) -> "CardOrder":
        try:
            xml = defused_parse(file_name)
        except ParseError:
            input("Your XML file contains a syntax error so it can't be processed. Press Enter to exit.")
            sys.exit(0)
        print(f"Parsing XML file {bold(file_name)}...")
        order = cls.from_element(xml.getroot(), name=file_name)
        return order

    # endregion

    # region public

    @classmethod
    def from_xml_in_folder(cls) -> "CardOrder":
        """
        Reads an XML from the current directory, offering a choice if multiple are detected, and populates this
        object with the contents of the file.
        """

        xml_glob = list(glob(os.path.join(CURRDIR, "*.xml")))
        if len(xml_glob) <= 0:
            input("No XML files found in this directory. Press enter to exit.")
            sys.exit(0)
        elif len(xml_glob) == 1:
            file_name = xml_glob[0]
        else:
            xml_select_string = "Multiple XML files found. Please select one for this order: "
            questions = {"type": "list", "name": "xml_choice", "message": xml_select_string, "choices": xml_glob}
            answers = InquirerPy.prompt(questions)
            file_name = answers["xml_choice"]
        return cls.from_file_name(file_name)

    # endregion
