import urllib.request
import os

fonts_dir = os.path.join(os.path.dirname(__file__), 'app', 'static', 'fonts')
os.makedirs(fonts_dir, exist_ok=True)

regular_url = "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf"
bold_url = "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf"

urllib.request.urlretrieve(regular_url, os.path.join(fonts_dir, "DejaVuSans.ttf"))
urllib.request.urlretrieve(bold_url, os.path.join(fonts_dir, "DejaVuSans-Bold.ttf"))

print("Fonts downloaded successfully.")
