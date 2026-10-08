# Original demonstration footage

The `harbour-48-v1` dataset is an original, fictional warehouse rendered for SceneOps. Its isometric appearance and the label in every frame identify it as synthetic demonstration footage. It contains no customer material, people, faces, or surveillance recordings.

The three camera views share a 48-second timeline. Receiving shows a parcel cart moving through an inbound lane. Packing shows cartons arriving in a marked buffer and subsequently leaving. Dispatch shows a loaded cart entering, occupying, and leaving a loading area. These are deliberately bounded scenes for evidence review, not a simulation of every physical warehouse process.

## Files

| Camera | Video | Poster | Model contact sheet |
| --- | --- | --- | --- |
| Receiving | `/footage/receiving.mp4` | `/footage/receiving.jpg` | `/evidence/receiving-sheet.jpg` |
| Packing | `/footage/packing.mp4` | `/footage/packing.jpg` | `/evidence/packing-sheet.jpg` |
| Dispatch | `/footage/dispatch.mp4` | `/footage/dispatch.jpg` | `/evidence/dispatch-sheet.jpg` |

Each video is 960 × 540, 12 frames per second, 576 frames, H.264 with `yuv420p`, without audio. The MP4 metadata precedes the media payload (`faststart`). The 39 individual evidence JPEGs retain the full 960 × 540 resolution. Each 1920 × 1200 contact sheet contains thirteen 480 × 270 images with separate, readable frame-ID bands; unused cells are empty.

Evidence images are **decoded from the encoded MP4 files**, then converted to JPEG. The contact sheets are composed from those evidence images. They are not independently illustrated summaries of the generator's scene state.

Sample IDs use nominal times 00, 04, 08, 12, 16, 20, 24, 28, 32, 36, 40, 44, and 48. The terminal `-48` sample uses frame 575, at approximately **47.917 seconds**, because 48.000 seconds is the exclusive end of the clip. `public/evidence/manifest.json` records both nominal `at` and actual `renderedAt`, with SHA-256 hashes for every clip and evidence JPEG. Four-second sampling can bracket a visible change; it cannot establish its exact onset or duration.

## Reproduction

With the declared Node.js and npm versions:

```sh
npm ci
node scripts/generate-footage.mjs
```

The generator uses original SVG geometry, Sharp rasterization, and the pinned `ffmpeg-static` binary. It has no network calls, model calls, external artwork, random seeds, or user input. `--evidence-only` rebuilds posters, evidence frames, contact sheets, and hashes from existing clips. `--preview` renders three individual design previews without encoding videos.

Trajectories and scene content are deterministic. Exact rasterized or encoded bytes can differ across operating systems, font installations, or updated media libraries; the committed manifest describes the committed assets. Regenerate all related files together when changing the footage.

## Inference boundary

The visual-analysis input consists of rendered camera images and their frame identifiers. Do not supply the generator, trajectories, scripted event times, or scene variables to the model as observations. Camera names, clocks, neutral zone identifiers, and the synthetic-footage disclosure are presentation metadata, not analytical conclusions.

The model must derive observations from visible evidence, distinguish uncertainty, and cite valid frame IDs. There is no facial recognition, individual tracking, incident ground truth, or validated accuracy score in this dataset.

## Licence

The generator and original rendered assets are covered by the repository's MIT licence. Third-party rendering and encoding tools retain their own licences. No third-party camera footage or commercial stock imagery is included.

## Asset verification

All three bundled clips were decoded completely: each contains 576 frames and a 48.00-second container duration, with H.264 video, `yuv420p`, 960 × 540 pixels, and 12 fps. Each MP4's `moov` metadata precedes `mdat`. All 42 clip and individual-frame hashes matched the manifest. This verifies media integrity, not model accuracy.

| Asset | Video bytes | Contact-sheet bytes |
| --- | ---: | ---: |
| Receiving | 336,544 | 372,637 |
| Packing | 325,615 | 338,373 |
| Dispatch | 257,116 | 309,080 |

The three videos total 919,275 bytes. Visual inspection covered `receiving-08`, `packing-24`, `dispatch-24`, and all three contact sheets. Trajectories remain on the floor and move between the marked zone and adjacent staging positions. No objects appear or disappear at the view boundary.
