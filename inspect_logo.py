
from PIL import Image
import numpy as np

source_path = r"C:/Users/jmrod/.gemini/antigravity/brain/74cb5051-ff8a-46f1-a221-95c2114a1685/uploaded_image_1766343260579.png"

def inspect():
    img = Image.open(source_path).convert("RGBA")
    w, h = img.size
    print(f"Size: {w}x{h}")
    
    # Check corners
    corners = [
        (0, 0), (w-1, 0), (0, h-1), (w-1, h-1)
    ]
    
    print("Corner Colors:")
    for x, y in corners:
        print(f"({x}, {y}): {img.getpixel((x, y))}")
        
    # Check center
    print(f"Center ({w//2}, {h//2}): {img.getpixel((w//2, h//2))}")

if __name__ == "__main__":
    inspect()
