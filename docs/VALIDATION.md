# Validation

Checkpoint: recorded evidence is generated and reviewed; local automated checks, production build, and the browser review flow passed. The live question API and hosted publication remain pending.

## Media and sampling

The original `harbour-48-v1` dataset consists of three 48-second MP4 files at 960 × 540, 12 fps, and 576 frames each. They contain no audio or real camera recordings. All three clips were completely decoded, and all 42 clip/individual-frame hashes matched the committed manifest. This establishes media integrity, not model accuracy.

Thirty-nine JPEG evidence frames were decoded from the encoded MP4 files. Each camera has thirteen nominal sample times from 0 to 48 seconds at four-second intervals. The final sample uses frame 575 at approximately 47.917 seconds. Three 1920 × 1200 contact sheets combine those frames with their labels.

See [FOOTAGE.md](FOOTAGE.md) for exact assets, reproducibility, and licensing. The generator's scene state is not evidence passed to the model.

## Recorded model analysis

Three actual offline model requests, one per camera contact sheet, used `gpt-6.1-sol` with medium reasoning. They produced fourteen observations: clear areas, movement, accumulation, and occupancy. The record is labelled `recorded_model_analysis`, not live inference triggered by playback.

The coordinating reviewer visually inspected all three contact sheets and their model records. Descriptions were consistent with the visible clear areas, position changes, carton accumulation, and occupancy in those samples. The provenance file records that review and its scope. This is not an independent holdout evaluation or a quantified accuracy result.

Each observation identifies a camera, sampled range, and evidence frames. A sampled boundary is not an exact event time. The images do not establish continuous clearance, an item's identity across cameras, intent, safety compliance, or events outside the supplied views.

## Live answer contract

The implemented question path supplies the selected camera images and recorded observations to `gpt-6.1-sol` with low reasoning. A live answer must cite existing observation IDs within that camera scope. The server rejects unsupported IDs and substitutes an insufficient-evidence response when no valid event reference is returned.

Those checks verify reference membership and response shape. They do not independently establish that every sentence follows from an image. A person must inspect the linked evidence. No real live-question request has been verified at this checkpoint.

## Verification record

| Check | Result and boundary |
| --- | --- |
| Media decoding and manifest integrity | Passed for all three clips and 39 individual evidence frames |
| Contact-sheet visual review | All three sheets reviewed, with model descriptions checked against their visible content |
| Offline visual inference | Three real model calls produced fourteen recorded observations |
| Automated tests | 42 tests across five files passed |
| TypeScript | Passed |
| Production build | Passed |
| Three-video playback and navigation | Local play/pause and synchronization passed; selecting the accumulation event sought all views to 8 seconds; frame 24 plus Watch sought all views to 24 seconds |
| Configured zone overlays and frame inspection | Local inspection passed; selecting Packing filtered to its four observations; overlays are not AI bounding boxes |
| Accept/dismiss and JSON export | Accept/export verified locally: exported JSON retained one accepted and thirteen unreviewed observations, dataset identity, and provenance |
| Live query API and evidence-linked answers | Provider mocks and validators tested; actual API request pending |
| Shared admission, origin, and browser protection | Application tests passed; hosted enforcement pending |
| Responsive layout and console | Mobile check passed with content width equal to the measured 375-pixel viewport, no overflow; no console errors or warnings captured |
| Public source, CI, deployment, and hosted flow | Repository created and linked to Vercel; first source publication, CI, deployment, and hosted flow pending |

The runtime dependency audit reported zero vulnerabilities. The development-only audit retains two moderate advisories involving the Fengari dependency chain and `sprintf-js`; no fix was available at this checkpoint. Fengari executes static authored Lua in tests and is not deployed in the runtime path. This distinction is not a claim that development dependencies have no risk.

The local playback check observed 0.00022 seconds of drift between the synchronized views. This is one browser observation, not a cross-device synchronization guarantee. Poster paths were corrected to use each clip's zero-second frame so the initial preview matches the timeline. Hosted playback, live answers, and external enforcement still need their own checks.

## What remains unproven

No native camera connection, RTSP stream, continuous inference, automatic alert, identification system, exact event-time detection, real warehouse outcome, or general accuracy benchmark is implemented or claimed. API credentials are server-only. Visitor questions are not intentionally stored or logged by the application, but provider-standard data policies still apply to live requests.

The article remains an ignored local draft. Repository/demo publication and native draft preparation must be recorded separately from article or social publication.
