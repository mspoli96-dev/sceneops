# Build log

## Initial recorded-evidence checkpoint

- Built SceneOps as a Webytex Business video evidence workbench, with a gold label and original synthetic warehouse footage.
- Created three synchronized 48-second, 960 × 540, 12 fps MP4 views: Receiving, Packing, and Dispatch. No customer recordings, identifiable people, or external stock footage are included.
- Decoded 39 sampled evidence frames from the encoded MP4 files and composed three 1920 × 1200 contact sheets. The nominal terminal sample at 48 seconds uses the last decoded frame at approximately 47.917 seconds.
- Generated fourteen observations through three actual `gpt-6.1-sol` requests with medium reasoning, using contact-sheet images and camera/frame/time metadata. The generator's hidden state and event conclusions were not supplied as visual truth.
- Visually reviewed all three contact sheets and the corresponding recorded descriptions. This is a bounded evidence review, not an accuracy percentage or a real operational outcome.
- Implemented synchronized playback, seeking, speed controls, event navigation, configured zone overlays, frame inspection, local review decisions, and JSON export.
- Implemented the separate low-reasoning question route over selected images and recorded observations, with validated existing event references, bounded requests, shared admission, and server-only credentials.
- Passed 42 automated tests across five files, type checking, and the production build.
- Verified local play/pause and synchronization, with 0.00022 seconds of drift observed in one check. Event navigation sought all three views to 8 seconds, and evidence-frame Watch sought them to 24 seconds. This is a bounded browser check, not a general timing benchmark.
- Verified local review export with one accepted and thirteen unreviewed observations, dataset identity, and provenance. Packing selection filtered to four observations. The mobile check had no overflow, and the console captured no errors or warnings.
- Corrected initial poster paths to the zero-second frames. Recorded the contact-sheet/model review scope in the provenance metadata.
- The runtime dependency audit reported zero vulnerabilities. Two development-only moderate advisories remain in the Fengari/`sprintf-js` chain; the test helper runs static authored Lua and is outside the deployed runtime.
- Published initial application source `ac01123a4e4b27b7dbce8f9fdc58ba2a1fd6568c` to [GitHub](https://github.com/mspoli96-dev/sceneops). [CI passed](https://github.com/mspoli96-dev/sceneops/actions/runs/37720394051), and the matching Vercel production deployment is ready at [the public demo](https://webytex-sceneops.vercel.app).
- Verified the first real public question about Packing accumulation. The answer cited the existing 8–32-second sampled observation with an explicit sampling limitation. Selecting its citation selected the Packing event and sought all three video clocks to 8 seconds.
- Verified a Dispatch-only clearance question. The answer cited valid Dispatch observations for the 36–44-second movement and 44–48-second clear samples, retained uncertainty about the exact transition, and navigated all three videos to 44 seconds when its clearance citation was selected.
- Verified an unsupported question about a cat's colour: the response stated insufficient evidence, returned no event references, and invented no colour. All three live question requests returned HTTP 200 with actual OpenAI, Redis admission, and BotID; no browser errors or warnings were captured.
- Verified public endpoint controls: configuration returned HTTP 200 with live mode enabled and a signed visitor cookie; a query without BotID returned 403; two invalid payloads returned 400; and a fourth request-limit probe returned 429. None of the four POST probes reached AI admission. Full budget and quota exhaustion were not tested in production.
- All hosted evidence above applies to application release `ac01123a4e4b27b7dbce8f9fdc58ba2a1fd6568c`; this closing update changes documentation only.
- Prepared public documentation and an ignored article draft with the verified release links. No article or social publication is recorded.

AI assisted design, implementation, tests, and documentation. No measured build duration, general accuracy, cost per analysis, or customer ROI is claimed.
