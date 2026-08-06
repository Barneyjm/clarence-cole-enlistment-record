/**
 * Writes straightened, banded images for one PDF page so it can be transcribed.
 *
 *   node tools/deskew-page.mjs 248
 *
 * Output goes to .work/p<page>/ (gitignored). Deskewing is not optional: the
 * sheets sit up to ~1.6 degrees off square on the film, which over the width of
 * a page shifts the serial-number column by a full row against the names.
 *
 * Needs Python with pypdfium2, numpy and Pillow, and the source PDF path in
 * COLE_PDF (default ./cole.pdf).
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const page = Number(process.argv[2]);
if (!Number.isInteger(page) || page < 1) {
  console.error("usage: node tools/deskew-page.mjs <pdf-page-number>");
  process.exit(1);
}

const script = `
import numpy as np, pypdfium2 as pdfium, os, sys
from PIL import Image, ImageOps

src = os.environ.get('COLE_PDF', 'cole.pdf')
page = ${page}
out = os.path.join('.work', 'p%d' % page)
os.makedirs(out, exist_ok=True)

def best_angle(img):
    """Text lines are sharpest when horizontal: maximise row-ink variance."""
    a = np.asarray(img.convert('L'))
    best, ba = -1, 0.0
    for ang in np.arange(-2.5, 2.51, 0.1):
        r = np.asarray(Image.fromarray(a).rotate(ang, resample=Image.BILINEAR,
                                                 fillcolor=255, expand=False))
        v = (r < 128).mean(axis=1).var()
        if v > best: best, ba = v, ang
    return ba

d = pdfium.PdfDocument(src)
pil = d[page - 1].render(scale=4.2).to_pil().convert('L').rotate(-90, expand=True)
a = np.asarray(pil); b = a > 110
on = np.convolve(b.mean(axis=1), np.ones(25) / 25, mode='same') > 0.35
runs, i, H = [], 0, len(on)
while i < H:
    if on[i]:
        j = i
        while j < H and on[j]: j += 1
        if j - i > 250: runs.append((i, j))
        i = j
    else: i += 1

for si, (y0, y1) in enumerate(runs):
    cols = np.where(np.convolve(b[y0:y1].mean(axis=0), np.ones(25) / 25, mode='same') > 0.35)[0]
    if not len(cols): continue
    sh = pil.crop((cols[0], y0, cols[-1], y1))
    ang = best_angle(sh)
    sh = ImageOps.autocontrast(sh.rotate(ang, resample=Image.BICUBIC,
                                         fillcolor=255, expand=False), cutoff=1)
    w, h = sh.size
    n = max(1, round(h / 430))
    for bi in range(n):
        top, bot = int(h * bi / n), int(h * (bi + 1) / n)
        c = sh.crop((0, max(0, top - 10), w, min(h, bot + 10)))
        tw = 1500
        c = c.resize((tw, max(40, int(c.height * tw / c.width))), Image.LANCZOS)
        c.save(os.path.join(out, 'sheet%d_band%d.png' % (si, bi)))
    print('sheet %d: deskewed %+.1f deg, %d bands' % (si, ang, n))
print('written to', out)
`;

const res = spawnSync("python3", ["-c", script], { cwd: ROOT, stdio: "inherit" });
process.exit(res.status ?? 1);
