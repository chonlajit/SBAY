import re

with open('d:/SBAY-iot/iot-device/bin-device/assets/mascot.svg', 'r', encoding='utf-8') as f:
    svg = f.read()

# Let's find the stroke path
m = re.search(r'<path d="([^"]+)" stroke="black"/>', svg)
if not m:
    print("Stroke path not found!")
    exit(1)

stroke_d = m.group(1)
parts = [p.strip() for p in stroke_d.split('Z') if p.strip()]
print(f"Total stroke subpaths: {len(parts)}")

for i, p in enumerate(parts):
    # Find all coordinates in this subpath
    # Pattern: numbers with optional decimals
    nums = re.findall(r'[-+]?(?:\d*\.\d+|\d+)', p)
    pts = [(float(nums[j]), float(nums[j+1])) for j in range(0, len(nums)-1, 2)]
    if pts:
        xs = [x for x, y in pts]
        ys = [y for x, y in pts]
        print(f"[{i:2d}] X: {min(xs):5.1f} to {max(xs):5.1f} | Y: {min(ys):5.1f} to {max(ys):5.1f} | {p[:50]}")
