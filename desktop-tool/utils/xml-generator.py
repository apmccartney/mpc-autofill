#!/usr/bin/env python

import argparse
import bisect
import io
import json
import os
import requests
import sys
import xml.etree.ElementTree

from PIL import Image, ImageOps, ImageDraw, ImageFont

element = xml.etree.ElementTree.Element
element_tree = xml.etree.ElementTree.ElementTree
indent = xml.etree.ElementTree.indent
subelement = xml.etree.ElementTree.SubElement

# chunk: Int -> [e] -> [[e]]
def chunk(n, iterable):
    def inner_range(element, iterable):
        yield element

        for i in range(1, n):
            try:
                yield next(iterable)
            except StopIteration:
                return

        return

    while True:
        try:
            element = next(iterable)
            yield inner_range(element, iterable)
        except:
            return

# join: [[e]] -> [e]
def join(iterable):
    for nested_iterable in iterable:
        for element in nested_iterable:
            yield element

    return

# consecutive_duplicates: [e] -> [(Int, e)]
def run_lengths(iterable):
    try:
        reference = next(iterable)
        while True:
            quantity = 1
            while True:
                try:
                    probe = next(iterable)
                    if (probe == reference):
                        quantity += 1
                    else:
                        yield (quantity, reference)
                        reference = probe
                        break
                except StopIteration:
                    yield (quantity, reference)
                    return
    except StopIteration:
        return

def partial(fn, *args, **kwargs):
    class _Result:
        def __init__(self, fn, args, kwargs):
            self.fn = fn
            self.args = args
            self.kwargs = kwargs

        def __call__(self, *args, **kwargs):
            return self.fn(*self.args, *args, **(self.kwargs), **kwargs)

    return _Result(fn, args, kwargs)

def lines_of(path):
    try:
        with open(path, 'r') as lines:
            for line in lines:
                yield line
    except:
        pass

    return

class Watermark:
    def __init__(self, text, font, width, height):
        self.__face = Watermark.__make_face(text, font, width, height)
        self.__back = Watermark.__make_back(text, font, width, height)

    @staticmethod
    def __prepare_textbox(text, font, width, height):
        layer = Image.new("RGBA", (width, height), (255, 255, 255, 0))
        draw = ImageDraw.Draw(layer)
        _, _, textbox_width, textbox_height = draw.textbbox((0, 0), text, font=font)

        class _Result:
            def __init__(self, layer, draw, width, height):
                self.layer = layer
                self.draw = draw
                self.width = width
                self.height = height

        return _Result(layer, draw, textbox_width, textbox_height)

    @staticmethod
    def __make_face(text, font, width, height):
        textbox = Watermark.__prepare_textbox(text, font, width, height)
        text_position = ((width - textbox.width) / 2, height / 3 - textbox.height / 2)
        textbox.draw.text(text_position, text, font=font, fill=(255, 255, 255, 255))
        return textbox.layer

    @staticmethod
    def __make_back(text, font, width, height):
        textbox = Watermark.__prepare_textbox(text, font, width, height)
        text_position = ((width - textbox.width) / 2, (height - textbox.height) / 2)
        textbox.draw.text(text_position, text, font=font, fill=(255, 255, 255, 255))
        return textbox.layer

    def face(self, image):
        assert image.size == self.__face.size
        return Image.alpha_composite(image, self.__face)

    def back(self, image):
        assert image.size == self.__back.size
        return Image.alpha_composite(image, self.__back)

def resize(width, height, image):
    return image.resize((width, height))

def expand_border(image):
    width, _ = image.size
    return ImageOps.expand(image, border=int(width * 0.0425), fill='black')

def make_order(image_cache_path, remote, entries):
    order = element("order")
    image_path_template = os.path.join(image_cache_path, "{}.png")
    image_path = image_path_template.format("cardback")

    if not os.path.exists(image_path):
        url = remote[".card-back"]
        response = requests.get(url, stream=True)
        response.raw.decode_content = True
        expand_border(make_order.watermark.back(resize(make_order.width, make_order.height, Image.open(response.raw).convert("RGBA")))).save(image_path)

    subelement(order, 'cardback').text = image_path

    fronts = subelement(order, "fronts")
    index = 0

    for entry in entries:
        card = subelement(fronts, "card")

        quantity = entry[0]
        name = entry[1]
        image_path = image_path_template.format(name)

        if not os.path.exists(image_path):
            url = remote[name]
            response = requests.get(url, stream=True)
            response.raw.decode_content = True
            expand_border(make_order.watermark.face(resize(make_order.width, make_order.height, Image.open(response.raw).convert("RGBA")))).convert("RGB").save(image_path)

        subelement(card, "id").text = image_path
        subelement(card, "slots").text = ", ".join(
                (str(i) for i in range(index, index + quantity)))

        index += quantity

    bracket = make_order.brackets[bisect.bisect_left(make_order.brackets, index)]

    details = subelement(order, "details")
    subelement(details, "bracket").text = str(bracket)
    subelement(details, "foil").text = 'false'
    subelement(details, "quantity").text = str(index)
    subelement(details, "stock").text = '(S30) Standard Smooth'

    return element_tree(order)

make_order.width = 848
make_order.height = 1130
make_order.watermark = Watermark("PROXY", ImageFont.truetype('arial.ttf', 140), make_order.width, make_order.height)
make_order.brackets = [18, 36, 55, 72, 90, 108, 126, 144, 162, 180, 198, 216, 234, 396, 504, 612]

def main():
    installation_root = os.path.dirname(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))

    parser = argparse.ArgumentParser(
            prog = "xml-generator",
            description = "Generate xml-format inputs for the mpc-autofill desktop client.")

    parser.add_argument("-o", "--output-directory",
            default=os.getcwd())

    parser.add_argument("-i", "--image-cache-directory",
            default=os.path.join(os.getcwd(), "image-cache"))

    parser.add_argument("-l", "--deck-list-directory",
            default=os.path.join(os.getcwd(), "deck-lists"))

    args = parser.parse_args()
    output_xml = os.path.join(args.output_directory, "order-{}.xml")

    if not os.path.exists(args.image_cache_directory):
        sys.exit("image cache directory, '{}', does not exist".format(args.image_cache_directory))

    database_path = os.path.join(args.image_cache_directory, "cards.json")

    try:
      with open(database_path) as file:
          cards = json.load(file)
    except FileNotFoundError:
        sys.exit("image database, '{}', does not exist".format(database_path))

    if not os.path.isabs(args.image_cache_directory):
        args.image_cache_directory = os.path.join(os.getcwd(), args.image_cache_directory)

    if not os.path.exists(args.deck_list_directory):
        sys.exit("deck list directory, '{}', does not exist".format(args.deck_list_directory))

    try:
        os.mkdir(args.output_directory)
    except FileExistsError:
        pass

    for index, order in \
            enumerate(
            map(partial(make_order, args.image_cache_directory, cards),
            map(run_lengths,
            chunk(612,
            join(
            map(lambda pair: (pair[1] for i in range(int(pair[0]))),
            map(lambda line: line.split(None, 1),
            filter(lambda line: bool(line),
            map(lambda line: line.rstrip(),
            join(
            map(lines_of,
            map(lambda path: os.path.join(args.deck_list_directory, path),
            os.listdir(args.deck_list_directory))))))))))))):
        indent(order)
        order.write(output_xml.format(index))

if __name__ == "__main__":
    main()
