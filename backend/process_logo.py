import os
from PIL import Image, ImageDraw

def process():
    src_candidates = [
        os.path.abspath("../frontend/public/logo-rd.jpg"),
        os.path.abspath("../frontend/public/logo-rd.png"),
        os.path.abspath("C:/Users/Xtender TdC R1/.gemini/antigravity-ide/brain/29d819b7-6ead-4dfe-a820-64c99b09b01a/.user_uploaded/media_1790634815876.jpg")
    ]
    src = None
    for c in src_candidates:
        if os.path.exists(c):
            src = c
            break
            
    if not src:
        print("No source logo found")
        return

    print("Using source:", src)
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    
    gray = img.convert("L")
    px = gray.load()
    cx, cy = w / 2, h / 2
    
    left = 0
    for x in range(int(cx)):
        if px[x, int(cy)] < 225:
            left = x
            break
            
    right = w - 1
    for x in range(w - 1, int(cx), -1):
        if px[x, int(cy)] < 225:
            right = x
            break
            
    top = 0
    for y in range(int(cy)):
        if px[int(cx), y] < 225:
            top = y
            break
            
    bottom = h - 1
    for y in range(h - 1, int(cy), -1):
        if px[int(cx), y] < 225:
            bottom = y
            break

    # We want the entire contour, so we expand the radius slightly to capture all outer stitching
    center_x = (left + right) / 2.0
    center_y = (top + bottom) / 2.0
    radius = max((right - left) / 2.0, (bottom - top) / 2.0) + 1
    
    # 4x supersampled mask for ultra-smooth edges
    scale = 4
    mask_large = Image.new("L", (w * scale, h * scale), 0)
    draw_large = ImageDraw.Draw(mask_large)
    draw_large.ellipse(
        ((center_x - radius) * scale, (center_y - radius) * scale,
         (center_x + radius) * scale, (center_y + radius) * scale),
        fill=255
    )
    mask = mask_large.resize((w, h), Image.Resampling.LANCZOS)
    img.putalpha(mask)
    
    # Crop to circle
    pad = 4
    bbox = (
        max(0, int(center_x - radius - pad)),
        max(0, int(center_y - radius - pad)),
        min(w, int(center_x + radius + pad)),
        min(h, int(center_y + radius + pad))
    )
    cropped = img.crop(bbox)
    
    out_paths = [
        os.path.abspath("../frontend/public/logo-rd.png"),
        os.path.abspath("../frontend/dist/logo-rd.png")
    ]
    for out in out_paths:
        try:
            cropped.save(out, "PNG")
            print("Saved transparent logo to:", out)
        except Exception as e:
            print("Error saving:", out, e)

if __name__ == "__main__":
    process()
