
from PIL import Image
import numpy as np
import os

source_path = r"C:/Users/jmrod/.gemini/antigravity/brain/74cb5051-ff8a-46f1-a221-95c2114a1685/uploaded_image_1766343260579.png"
target_path = r"c:\Users\jmrod\Downloads\AUREUS FIT AI\images\logo.png"

def process_logo():
    print(f"Opening source: {source_path}")
    if not os.path.exists(source_path):
        print("Source file not found!")
        return

    img = Image.open(source_path).convert("RGBA")
    print(f"Original Dimensions: {img.size}")

    # Convert to numpy array
    data = np.array(img)
    
    # Define threshold for "black/dark" background
    # We want to keep the Gold color.
    # Gold is roughly R>100, G>80, B<Something? 
    # Let's inspect potential gold pixels vs background.
    # Assuming background is close to black (0,0,0) or dark gray.
    
    r, g, b, a = data.T

    # Condition: If pixel is dark, make it transparent
    # Relaxed threshold just in case: R+G+B < 40
    dark_mask = (r < 40) & (g < 40) & (b < 40)
    
    data[..., 3][dark_mask.T] = 0
    
    img_processed = Image.fromarray(data)
    
    # Crop to content (trim transparent borders)
    bbox = img_processed.getbbox()
    if bbox:
        img_cropped = img_processed.crop(bbox)
        print(f"Cropped to: {bbox}, New Size: {img_cropped.size}")
    else:
        print("No content found after background removal!")
        img_cropped = img_processed

    # Resize if MASSIVE, but user wants quality.
    # If > 1000px, maybe scale down to 512px height?
    # Actually, let's keep it high res unless it's insane.
    # The app displays it small, but high res is better for retina.
    
    # Save
    img_cropped.save(target_path)
    print(f"Saved high-quality logo to: {target_path}")

if __name__ == "__main__":
    process_logo()
