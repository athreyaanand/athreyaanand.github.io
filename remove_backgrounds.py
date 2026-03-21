from rembg import remove
from PIL import Image
import os
import glob

faces_dir = "outputs_transparent/extracted/face_looker/faces"
out_dir = "outputs_transparent/faces_no_bg"
os.makedirs(out_dir, exist_ok=True)

paths = sorted(glob.glob(f"{faces_dir}/*.webp"))
for i, path in enumerate(paths):
    img = Image.open(path).convert("RGBA")
    result = remove(img)
    name = os.path.splitext(os.path.basename(path))[0] + ".png"
    result.save(os.path.join(out_dir, name))
    print(f"[{i+1}/{len(paths)}] {name}")

print(f"\nDone! {len(os.listdir(out_dir))} frames saved to {out_dir}/")
