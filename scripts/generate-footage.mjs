import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const footageDir = path.join(root, "public", "footage");
const evidenceDir = path.join(root, "public", "evidence");
const width = 960;
const height = 540;
const fps = 12;
const duration = 48;
const frameCount = duration * fps;
const cameras = ["receiving", "packing", "dispatch"];
const sampleTimes = Array.from({ length: 13 }, (_, index) => index * 4);
const p = (x, y, z = 0) => [462 + (x - y) * 47, 122 + (x + y) * 22.56 - z * 47];
const points = (vertices) => vertices.map((v) => p(...v).map((n) => n.toFixed(2)).join(",")).join(" ");
const polygon = (vertices, fill, attributes = "") => `<polygon points="${points(vertices)}" fill="${fill}" ${attributes}/>`;
const line = (a, b, colour, thickness = 1, extra = "") => `<line x1="${p(...a)[0]}" y1="${p(...a)[1]}" x2="${p(...b)[0]}" y2="${p(...b)[1]}" stroke="${colour}" stroke-width="${thickness}" ${extra}/>`;
const colours = {
  box: ["#c7a176", "#927352", "#ad865e"],
  dark: ["#667975", "#354b48", "#475f59"],
  steel: ["#a0aaa6", "#616e6b", "#788883"],
  ivory: ["#dedad0", "#a6a599", "#bbbbae"],
  wood: ["#aa9474", "#6b604c", "#8e775a"],
};

function cuboid(x, y, z, w, d, h, palette = colours.box, stroke = "#26393520") {
  return polygon([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], palette[0], `stroke="${stroke}" stroke-width="0.6"`)
    + polygon([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], palette[1], `stroke="${stroke}" stroke-width="0.6"`)
    + polygon([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], palette[2], `stroke="${stroke}" stroke-width="0.6"`);
}

function box(x, y, z, w = 0.72, d = 0.62, h = 0.58) {
  const label = [[x + w + .005, y + d * .23, z + h * .3], [x + w + .005, y + d * .64, z + h * .3], [x + w + .005, y + d * .64, z + h * .69], [x + w + .005, y + d * .23, z + h * .69]];
  return cuboid(x, y, z, w, d, h)
    + polygon([[x + w * .44, y, z + h + .005], [x + w * .57, y, z + h + .005], [x + w * .57, y + d, z + h + .005], [x + w * .44, y + d, z + h + .005]], "#e5c9a0")
    + polygon(label, "#ece9dd")
    + line([x + w + .01, y + d * .34, z + h * .39], [x + w + .01, y + d * .34, z + h * .6], "#61706a", .6)
    + line([x + w + .01, y + d * .44, z + h * .39], [x + w + .01, y + d * .44, z + h * .6], "#61706a", .6);
}

function pallet(x, y, z = .03, w = 1.85, d = 1.45) {
  let result = cuboid(x, y, z, w, d, .18, colours.wood);
  for (let i = 0; i < 5; i++) result += cuboid(x, y + i * d / 5, z + .18, w, d / 5 - .035, .055, colours.wood);
  return result;
}

function cart(x, y, loaded = true) {
  const centre = p(x + 1, y + .68, 0);
  let result = `<ellipse cx="${centre[0] + 4}" cy="${centre[1] + 7}" rx="68" ry="24" fill="#263b3926" filter="url(#shadow)"/>`;
  for (const [dx, dy] of [[.2, .2], [1.65, .2], [.2, 1.2], [1.65, 1.2]]) {
    result += cuboid(x + dx, y + dy, .03, .16, .16, .25, ["#4e5a55", "#263730", "#344740"]);
  }
  result += cuboid(x, y, .29, 1.95, 1.45, .18, colours.dark);
  if (loaded) {
    result += box(x + .11, y + .1, .47, .83, .6, .64);
    result += box(x + 1, y + .1, .47, .8, .6, .64);
    result += box(x + .11, y + .77, .47, .83, .58, .65);
    result += box(x + 1, y + .77, .47, .8, .58, .65);
    result += box(x + .28, y + .28, 1.11, 1.22, .84, .66);
  }
  result += line([x + 1.94, y + .11, .45], [x + 1.94, y + .11, 1.3], "#a4b1ab", 4);
  result += line([x + 1.94, y + 1.31, .45], [x + 1.94, y + 1.31, 1.3], "#a4b1ab", 4);
  result += line([x + 1.94, y + .11, 1.3], [x + 1.94, y + 1.31, 1.3], "#c4cdc5", 4);
  return result;
}

function rack(x, y, length = 3.2, depth = .75) {
  let result = "";
  for (const z of [.12, 1.12, 2.12]) {
    result += cuboid(x, y, z, length, depth, .1, colours.dark);
    if (z < 2) for (let n = 0; n < 4; n++) result += box(x + .12 + n * .76, y + .09, z + .1, .66, .57, .58);
  }
  for (const dx of [0, length - .09]) for (const dy of [0, depth - .09]) result += cuboid(x + dx, y + dy, 0, .085, .085, 2.48, colours.steel);
  return result;
}

function conveyor(x, y, w, d) {
  let result = cuboid(x, y, .65, w, d, .22, colours.dark);
  for (let i = 0; i < 15; i++) result += line([x + .08, y + .05 + (d - .1) * i / 14, .88], [x + w - .08, y + .05 + (d - .1) * i / 14, .88], "#abb5ae", 3.3);
  for (const dx of [.13, w - .23]) for (const dy of [.2, d - .3]) result += cuboid(x + dx, y + dy, 0, .11, .11, .67, colours.steel);
  return result;
}

function zone(x, y, w, d, name) {
  const label = p(x + .16, y + d - .18, .025);
  return polygon([[x, y, .025], [x + w, y, .025], [x + w, y + d, .025], [x, y + d, .025]], "#f5bd7311", 'stroke="#d6b37b" stroke-width="2.4" stroke-dasharray="8 5"')
    + `<text x="${label[0]}" y="${label[1]}" fill="#d5bd94" font-family="Arial,sans-serif" font-size="12" font-weight="700" transform="rotate(-25.64 ${label[0]} ${label[1]})">${name}</text>`;
}

function shell(camera) {
  let result = `<rect width="960" height="540" fill="#182422"/><rect width="960" height="540" fill="url(#vignette)"/>`;
  result += polygon([[0, 0, 0], [9, 0, 0], [9, 8, 0], [0, 8, 0]], "#56625d", 'filter="url(#floorShadow)"');
  result += polygon([[0, 0, 0], [9, 0, 0], [9, 0, 2.2], [0, 0, 2.2]], "#77867c");
  result += polygon([[0, 0, 0], [0, 8, 0], [0, 8, 2.2], [0, 0, 2.2]], "#536760");
  result += polygon([[0, 0, 0], [9, 0, 0], [9, 8, 0], [0, 8, 0]], "url(#floor)");
  for (let i = 0; i <= 9; i++) result += line([i, 0, .002], [i, 8, .002], "#c5cdb315", .7);
  for (let i = 0; i <= 8; i++) result += line([0, i, .002], [9, i, .002], "#c5cdb315", .7);
  for (let i = 1; i <= 8; i++) result += line([i, 0, .08], [i, 0, 2.18], "#445d5350", 1);
  for (let i = 1; i <= 7; i++) result += line([0, i, .08], [0, i, 2.18], "#344f4450", 1);
  result += line([0, 0, .13], [9, 0, .13], "#314b43", 7);
  result += line([0, 0, .13], [0, 8, .13], "#314b43", 7);
  for (const x of [.2, 8.5]) result += cuboid(x, .06, 0, .24, .24, 2.22, colours.steel);
  if (camera === "receiving") {
    result += zone(2.4, 2.25, 4.7, 2.8, "R1 / INBOUND");
    result += rack(.8, .37);
    result += rack(4.4, .37);
    result += line([.15, 5.55, .03], [8.8, 5.55, .03], "#ddcc8d", 3);
    result += line([.15, 6.75, .03], [8.8, 6.75, .03], "#ddcc8d", 3);
  } else if (camera === "packing") {
    result += zone(2.5, 2.5, 3.6, 3.3, "P1 / BUFFER");
    result += rack(.7, .37, 3.2);
    result += conveyor(7.18, 1.8, 1.28, 3.8);
    result += cuboid(4.8, .7, .92, 2, .85, .12, colours.ivory);
    for (const dx of [4.87, 6.57]) result += cuboid(dx, .78, 0, .13, .13, .94, colours.steel);
    result += box(5.04, .81, 1.04, .6, .55, .36);
    result += cuboid(6.04, .93, 1.04, .44, .42, .04, colours.dark);
    result += line([.25, 6.8, .03], [8.75, 6.8, .03], "#ddcc8d", 3);
  } else {
    result += zone(2.55, 2.6, 3.9, 3.2, "D1 / LOADING");
    result += polygon([[3.45, .025, .08], [7.45, .025, .08], [7.45, .025, 2.07], [3.45, .025, 2.07]], "#293f38", 'stroke="#8c9b8e" stroke-width="6"');
    for (let i = 1; i < 10; i++) result += line([3.48, .032, i * .2], [7.42, .032, i * .2], "#547064", 1.5);
    result += cuboid(.85, .45, 0, 1.55, .65, 1.6, colours.dark);
    result += cuboid(1.01, 1.11, .83, 1.2, .015, .57, colours.ivory);
    result += line([.4, 6.6, .03], [8.7, 6.6, .03], "#ddcc8d", 3);
    for (const x of [3.1, 7.7]) {
      result += cuboid(x, .7, 0, .22, .22, .86, ["#d2bb7e", "#9a8250", "#b9a16a"]);
      result += cuboid(x, .7, .42, .223, .223, .15, colours.dark);
    }
  }
  return result;
}

const ease = (value) => { const u = Math.max(0, Math.min(1, value)); return u * u * (3 - 2 * u); };
function movingObjects(camera, time) {
  const objects = [];
  if (camera === "receiving") {
    const stops = [[0, .35, 6.2], [4, .35, 6.2], [8, 3.25, 3.15], [12, 5.1, 3.15], [16, 6.95, 6.2], [32, 6.95, 6.2], [36, 5.1, 3.15], [40, 3.25, 3.15], [44, .35, 6.2], [48, .35, 6.2]];
    const end = stops.findIndex((stop) => stop[0] >= time);
    const a = stops[Math.max(0, end - 1)];
    const b = stops[Math.max(0, end)];
    const u = ease((time - a[0]) / Math.max(1, b[0] - a[0]));
    const x = a[1] + (b[1] - a[1]) * u;
    const y = a[2] + (b[2] - a[2]) * u;
    objects.push({ depth: x + y, svg: cart(x, y) });
    objects.push({ depth: 9.1, svg: pallet(7.4, 1.7) + box(7.48, 1.78, .265, 1.58, 1.14, .62) });
    objects.push({ depth: 2, svg: cuboid(.55, 1.65, 0, 1.7, .65, .72, colours.dark) + cuboid(.55, 1.65, .72, 1.7, .65, .12, colours.ivory) });
  }
  if (camera === "packing") {
    for (let i = 0; i < 9; i++) {
      const arrival = 10 + i * 2;
      const departure = 32 + i * .9;
      const targetX = 2.86 + (i % 3) * .96;
      const targetY = 2.91 + Math.floor(i / 3) * .83;
      const startX = .28 + (i % 3) * .79;
      const startY = 5.25 + Math.floor(i / 3) * .75;
      const endX = 6.36 + (i % 3) * .82;
      const endY = 5.65 + Math.floor(i / 3) * .72;
      let x = targetX;
      let y = targetY;
      if (time < arrival) {
        const u = ease((time - arrival + 3) / 3);
        x = startX + (targetX - startX) * u;
        y = startY + (targetY - startY) * u;
      } else if (time > departure) {
        const u = ease((time - departure) / 4);
        x = targetX + (endX - targetX) * u;
        y = targetY + (endY - targetY) * u;
      }
      const centre = p(x + .36, y + .31);
      objects.push({ depth: x + y, svg: `<ellipse cx="${centre[0] + 2}" cy="${centre[1] + 3}" rx="25" ry="12" fill="#23362c29" filter="url(#shadow)"/>` + box(x, y, .01, .77, .65, .57 + (i % 2) * .14) });
    }
  }
  if (camera === "dispatch") {
    const u = time < 18 ? ease((time - 12) / 6) : time > 36 ? 1 - ease((time - 36) / 8) : 1;
    const x = 6.95 + (3.6 - 6.95) * u;
    const y = 6.2 + (3.55 - 6.2) * u;
    objects.push({ depth: x + y, svg: cart(x, y) });
  }
  return objects.sort((a, b) => a.depth - b.depth).map((o) => o.svg).join("");
}

function svg(camera, time) {
  const cameraIndex = cameras.indexOf(camera) + 1;
  const timestamp = `00:${Math.min(time, duration - 1 / fps).toFixed(2).padStart(5, "0")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 960 540"><defs>
    <linearGradient id="floor" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#707d70"/><stop offset="1" stop-color="#3f5148"/></linearGradient>
    <radialGradient id="vignette"><stop stop-color="#718077" stop-opacity=".35"/><stop offset="1" stop-color="#172422" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="floorShadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#071810" flood-opacity=".5"/></filter>
  </defs>${shell(camera)}${movingObjects(camera, time)}
  <path d="M22 48 V22 H48 M912 22 H938 V48 M938 492 V518 H912 M48 518 H22 V492" fill="none" stroke="#b2c3b16b" stroke-width="1"/>
  <rect x="38" y="34" width="265" height="31" rx="5" fill="#15221ee6"/><circle cx="54" cy="49" r="3" fill="#d8c399"/><text x="67" y="54" fill="#ecefe6" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="1.4">CAM 0${cameraIndex} / ${camera.toUpperCase()}</text>
  <rect x="801" y="34" width="121" height="31" rx="5" fill="#15221ee6"/><text x="817" y="54" fill="#d9e1d4" font-family="Consolas,monospace" font-size="14">${timestamp}</text>
  <text x="38" y="502" fill="#c3cec0" font-family="Arial,sans-serif" font-size="10" letter-spacing="2">HARBOUR / FICTIONAL FACILITY</text><text x="922" y="502" text-anchor="end" fill="#a5b6a4" font-family="Arial,sans-serif" font-size="10" letter-spacing="1.3">SYNTHETIC DEMO FOOTAGE</text></svg>`;
}

async function render(camera, index) {
  return sharp(Buffer.from(svg(camera, index / fps))).png({ compressionLevel: 1 }).toBuffer();
}

async function extractEvidence(camera, output) {
  const sampleIndices = sampleTimes.map((at) => Math.min(at * fps, frameCount - 1));
  const selector = sampleIndices.map((index) => `eq(n\\,${index})`).join("+");
  const decoder = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", output, "-vf", `select=${selector}`, "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const chunks = [];
  let errors = "";
  decoder.stdout.on("data", (chunk) => chunks.push(chunk));
  decoder.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  await new Promise((resolve, reject) => { decoder.once("error", reject); decoder.once("close", (code) => code === 0 ? resolve() : reject(new Error(`Evidence extraction failed: ${errors}`))); });
  const rawFrames = Buffer.concat(chunks);
  const bytesPerFrame = width * height * 3;
  if (rawFrames.length !== bytesPerFrame * sampleTimes.length) throw new Error("The encoded clip did not contain every expected evidence frame.");
  const files = [];
  for (let i = 0; i < sampleTimes.length; i++) {
    const at = sampleTimes[i];
    const id = `${camera}-${String(at).padStart(2, "0")}`;
    const pixels = rawFrames.subarray(i * bytesPerFrame, (i + 1) * bytesPerFrame);
    const image = await sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 88, chromaSubsampling: "4:4:4" }).toBuffer();
    await writeFile(path.join(evidenceDir, `${id}.jpg`), image);
    files.push({ id, at, renderedAt: sampleIndices[i] / fps, image: `/evidence/${id}.jpg`, sha256: createHash("sha256").update(image).digest("hex") });
    if (at === 24) await writeFile(path.join(footageDir, `${camera}.jpg`), image);
  }
  return files;
}

async function generateCamera(camera) {
  if (!ffmpeg) throw new Error("The bundled ffmpeg executable is unavailable.");
  const output = path.join(footageDir, `${camera}.mp4`);
  if (!process.argv.includes("--evidence-only")) {
    const encoder = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-vcodec", "png", "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-frames:v", String(frameCount), output], { stdio: ["pipe", "ignore", "pipe"], windowsHide: true });
    let errors = "";
    encoder.stderr.on("data", (chunk) => { errors += chunk.toString(); });
    const finished = new Promise((resolve, reject) => { encoder.once("error", reject); encoder.once("close", (code) => code === 0 ? resolve() : reject(new Error(`Video encoding failed: ${errors}`))); });
    for (let index = 0; index < frameCount; index++) {
      const frame = await render(camera, index);
      if (!encoder.stdin.write(frame)) await once(encoder.stdin, "drain");
    }
    encoder.stdin.end();
    await finished;
  }
  const files = await extractEvidence(camera, output);
  const sheetWidth = 1920;
  const cellWidth = 480;
  const cellHeight = 300;
  const composites = [];
  for (let i = 0; i < files.length; i++) {
    const image = await sharp(path.join(evidenceDir, `${files[i].id}.jpg`)).resize(cellWidth, 270).toBuffer();
    const left = (i % 4) * cellWidth;
    const top = Math.floor(i / 4) * cellHeight;
    composites.push({ input: image, left, top });
    composites.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="30"><rect width="480" height="30" fill="#15211d"/><text x="14" y="21" font-family="Consolas,monospace" font-size="17" fill="#f3d49c">${files[i].id} / 00:${String(files[i].at).padStart(2, "0")}</text></svg>`), left, top: top + 270 });
  }
  await sharp({ create: { width: sheetWidth, height: 1200, channels: 3, background: "#101b17" } }).composite(composites).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(path.join(evidenceDir, `${camera}-sheet.jpg`));
  const clip = await readFile(output);
  console.log(`${camera}: ${frameCount} frames, ${(clip.length / 1024 / 1024).toFixed(2)} MiB, ${files.length} evidence images`);
  return { id: camera, video: `/footage/${camera}.mp4`, bytes: clip.length, sha256: createHash("sha256").update(clip).digest("hex"), frames: files };
}

await mkdir(footageDir, { recursive: true });
await mkdir(evidenceDir, { recursive: true });
await mkdir(path.join(root, "docs"), { recursive: true });
if (process.argv.includes("--preview")) {
  for (const [camera, at] of [["receiving", 8], ["packing", 24], ["dispatch", 24]]) {
    await sharp(await render(camera, at * fps)).jpeg({ quality: 90 }).toFile(path.join(footageDir, `${camera}-preview.jpg`));
  }
  console.log("Three preview images are ready.");
  process.exit(0);
}
const results = [];
for (const camera of cameras) results.push(await generateCamera(camera));
await writeFile(path.join(evidenceDir, "manifest.json"), JSON.stringify({ dataset: "harbour-48-v1", original: true, synthetic: true, width, height, fps, duration, samples: sampleTimes, cameras: results }, null, 2) + "\n");
console.log("Original synthetic footage and its evidence manifest are ready.");
