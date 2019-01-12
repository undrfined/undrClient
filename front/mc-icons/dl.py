from bs4 import BeautifulSoup
from requests import get
from PIL import Image

# To generate images you need to install these:
# pip install bs4
# pip install requests
# pip install pil


# Where to save pics?
path = "pics/[file].png"
# File name format
file_name = "[id]_[name]"

soup = BeautifulSoup(get("https://minecraft.gamepedia.com/Bedrock_Edition_data_values").text, "html.parser")

items = soup.find_all("table", {"data-description": "Block IDs"})
img = Image.open(get("https://d1u5p3l4wpay3k.cloudfront.net/minecraft_gamepedia/f/f5/ItemCSS.png?version=1546268589452", stream=True).raw)

for a in items:
    q = a.find_all("tr")
    for i in q:
        tds = i.find_all("td")
        if len(tds) <= 2:
            continue
        id = int(tds[1].getText())
        f = tds[0].find("span")
        if f is None:
            f = tds[0].find("img")
            continue
        else:
            offset = list(map(abs, map(int, f.get("style").split(":")[-1].replace("px", "").split(" "))))
            x = offset[0]
            y = offset[1]
            print(str(id) + " " + str(offset))
            img.crop((x, y, x + 16, y + 16)).save(str(id) + ".png")
