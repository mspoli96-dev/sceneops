# Validation

Verified application release: `ac01123a4e4b27b7dbce8f9fdc58ba2a1fd6568c`. Recorded evidence review, 42 tests, type checking, build, public source, CI, production deployment, three real hosted questions, citation navigation, and targeted public endpoint checks passed. The scope and untested scenarios are recorded below.

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

Those checks verify reference membership and response shape. They do not independently establish that every sentence follows from an image. A person must inspect the linked evidence. Three actual hosted question cases are recorded below.

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
| Live query API and evidence-linked answers | Three real questions returned HTTP 200: Packing accumulation, Dispatch-scoped clearance, and insufficient evidence for an unsupported cat question |
| Shared admission, origin, and browser protection | Application tests passed; successful browser requests exercised real Redis/BotID, and targeted public probes rejected unverified/invalid/rate-limited requests before AI admission |
| Responsive layout and console | Mobile check passed with content width equal to the measured 375-pixel viewport, no overflow; no console errors or warnings captured |
| Public source, CI, and deployment | Source `ac01123a4e4b27b7dbce8f9fdc58ba2a1fd6568c` is public; GitHub CI passed and the matching Vercel deployment is ready |
| Hosted scope and missing evidence | Dispatch answer cited only valid Dispatch IDs; unsupported cat question returned no event references and no invented colour |

The runtime dependency audit reported zero vulnerabilities. The development-only audit retains two moderate advisories involving the Fengari dependency chain and `sprintf-js`; no fix was available at this checkpoint. Fengari executes static authored Lua in tests and is not deployed in the runtime path. This distinction is not a claim that development dependencies have no risk.

The local playback check observed 0.00022 seconds of drift between the synchronized views. This is one browser observation, not a cross-device synchronization guarantee. Poster paths were corrected to use each clip's zero-second frame so the initial preview matches the timeline. Hosted citation navigation and targeted endpoint checks are recorded below; broader device coverage and failure-path guarantees are not inferred.

## Hosted questions

At release `ac01123`, the browser submitted “When do cartons accumulate in the packing buffer?” with all camera zones selected. The real API response described the sampled 8–32-second Packing interval, first visible cartons by the 12-second sample, and a compact grouping in the 28- and 32-second samples. It cited the existing Packing accumulation observation and explicitly stated the sampling limitation.

Selecting the citation selected that observation and moved all three video clocks to 8 seconds.

With only Dispatch selected, “When does the loading zone become clear again?” returned that the area appears clear by the 44-second sample, citing the 44–48-second final range and the preceding 36–44-second movement range. Both references were valid Dispatch IDs, and the answer stated that the exact moment between samples was uncertain. Selecting the clearance citation selected Dispatch and moved all three video clocks to 44 seconds.

With all cameras selected, “What colour is the cat in this footage?” returned the fixed insufficient-evidence response with no event references. It did not invent a cat or its colour.

All three `POST /api/query` requests returned HTTP 200 through the public browser flow, exercising actual OpenAI inference, Redis admission, and BotID. The interface identified the source as a live `gpt-6.1-sol` response. No browser console errors or warnings were captured. These cases do not establish continuous video processing, exact event boundaries, or general detection accuracy.

## Public endpoint checks

On the tested deployment, `GET /api/config` returned HTTP 200 with live mode enabled and issued a signed visitor cookie. Using a valid signed visitor context, the targeted probes produced:

- A valid query payload without BotID verification: HTTP 403.
- Two invalid payloads: HTTP 400 for each.
- The fourth attempt within the request-limit window: HTTP 429 from the WAF.

None of those four POST probes was admitted for AI processing. This verifies the exercised browser-verification, payload, and request-limit paths. Exhaustion of the full monthly reservation budget, global daily allowance, visitor daily allowance, or concurrency limit was not tested against the hosted services. Passing the normal Redis admission path and mocked limit tests does not establish every production threshold.

## What remains unproven

No native camera connection, RTSP stream, continuous inference, automatic alert, identification system, exact event-time detection, real warehouse outcome, or general accuracy benchmark is implemented or claimed. API credentials are server-only. Visitor questions are not intentionally stored or logged by the application, but provider-standard data policies still apply to live requests.

## Public release

The initial application revision is `ac01123a4e4b27b7dbce8f9fdc58ba2a1fd6568c` in the [public repository](https://github.com/mspoli96-dev/sceneops). Its [CI run](https://github.com/mspoli96-dev/sceneops/actions/runs/37720394051) succeeded, and the matching production deployment is ready at [webytex-sceneops.vercel.app](https://webytex-sceneops.vercel.app).

The article remains an ignored local draft. Public code and deployment do not mean that an article or social post has been published.
