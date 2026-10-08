# SceneOps

A video evidence workbench for warehouse operations, built by [Webytex](https://webytex.com/). Review three synchronized views, inspect the images behind an observation, and export your decisions.

[Repository](https://github.com/mspoli96-dev/sceneops) · [Discuss a project](https://business.webytex.com/#quick-contact)

**Current status:** the original footage and recorded model analysis are prepared and reviewed. All 42 tests across five files, type checking, and the production build passed. Local browser checks covered synchronized playback, evidence navigation, review export, filtering, and mobile layout. The repository is created and linked to Vercel; the first production deployment and real live-question request remain unverified.

## What you can explore

- Three original synthetic warehouse clips: Receiving, Packing, and Dispatch.
- Synchronized playback, seeking, and speed controls over a shared 48-second timeline.
- Fourteen recorded AI observations with named cameras, sampled time ranges, and supporting frames.
- Frame inspection, event seeking, and local accept/dismiss decisions with JSON export.
- A separate live question route that uses the supplied images and recorded observations, returning validated existing event IDs.

The timeline is **recorded model analysis**, clearly labelled. Playing the clips does not run continuous inference. Live questions, when enabled, make a new model request; they do not open a live camera feed.

The marked zones are configured scene overlays, not model-generated object boxes. The demo has no live RTSP integration, user-video upload, automatic alerts, facial recognition, or personnel scoring.

## Run locally

Use Node.js 24.x and npm:

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:3240](http://127.0.0.1:3240). Bundled footage and recorded evidence can be explored without enabling live questions.

```bash
npm run typecheck
npm test
npm run build
npm run start
```

See [validation](docs/VALIDATION.md) for actual results and [the build log](docs/BUILD-LOG.md) for release checkpoints.

## How the evidence is produced

The footage generator creates three fictional 960 × 540 MP4 clips at 12 fps. Thirty-nine evidence frames are decoded from those encoded videos, with samples nominally four seconds apart. Three 1920 × 1200 contact sheets present thirteen samples per camera.

One offline request per contact sheet used `gpt-6.1-sol` with medium reasoning to produce the fourteen observations. Inputs were rendered images plus camera/frame/time metadata. The model was not supplied the generator's scene variables, trajectories, or event conclusions.

The last sample is labelled `48`, but uses the final video frame at approximately 47.917 seconds. Sampling can show a change between views, not its exact onset or duration. A clear sampled frame does not prove that an area stayed clear between samples.

[Footage provenance](docs/FOOTAGE.md), the [asset manifest](public/evidence/manifest.json), and [analysis provenance](docs/analysis-provenance.json) describe the files and inputs. The recorded data lives in `src/data/analysis.json`.

## Live questions

The application uses Next.js, React, TypeScript, the OpenAI Responses API, Upstash Redis, and BotID. The server-owned question model is `gpt-6.1-sol` with low reasoning. Its [official model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol) describes image input and structured outputs; access and application behaviour must still be verified in the intended deployment.

The question route sends the selected camera contact sheets, allowed recorded observations, and the question. Returned references must identify existing observations within the selected camera scope. Unsupported IDs are rejected; an answer without a supported event reference becomes an explicit insufficient-evidence response. Valid references make an answer inspectable, not automatically correct.

Copy `.env.example` to `.env.local` only when configuring live use. Keep credentials server-side.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Credential for the deployment's authorized API project |
| `SESSION_SECRET` | Random signing secret of at least 32 characters |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared admission store |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Native integration aliases when the corresponding Upstash value is empty |
| `APP_ORIGIN` | Exact origin without a trailing slash; HTTPS when hosted |
| `SCENEOPS_LIVE_ENABLED` | Explicit live switch; false by default |
| `OPENAI_PROJECT_HARD_LIMIT_CONFIRMED` | Confirmation that a provider spending control is configured |
| `SCENEOPS_COST_RESERVATION_CONFIRMED` | Confirmation that the application's reservation assumptions were reviewed |
| `SCENEOPS_MONTHLY_BUDGET_USD` | Bounded monthly reserved-cost ceiling; see server configuration for defaults and accepted limits |
| `VERCEL_BOTID_ENABLED`, `VERCEL_RATE_LIMIT_CONFIRMED` | Required hosted-protection confirmations |
| `NEXT_PUBLIC_SITE_URL` | Public base URL for page metadata |

Flags do not provision or verify a service. Missing configuration or invalid evidence disables paid questions while recorded evidence remains available. The server limits admission to five requests per visitor per UTC day, thirty globally, and two concurrent requests. It bounds question length, model output, and request time, with no automatic model retry. Reservation counters are not provider invoices or proof of an instantaneous monetary cap.

## Reproduce the assets

```bash
node scripts/generate-footage.mjs
npx tsx scripts/index-footage.ts
```

The first command regenerates the original synthetic media. The second defaults to a dry run and does not contact OpenAI. Explicit `--run-paid` invokes model analysis using local credentials and its bounded recording ledger. Existing recordings are preserved unless replacement is explicitly requested. Rebuilding media and redoing paid analysis are separate operations; see the footage document before either.

## Data and limits

The initial scope uses bundled synthetic clips only. The application does not store or log visitor questions. Live questions and the selected evidence are processed by OpenAI under its applicable data policies; `store: false` is not a zero-retention guarantee. Review decisions and JSON export belong to the browser interaction, not a server-side case-management system.

This small dataset demonstrates evidence review. It does not establish surveillance coverage, exact event boundaries, identity, safety compliance, measured accuracy, or operational savings.

## Work with Webytex

SceneOps is part of **Webytex Business**, identified by a text label and gold accent. Need a review workflow connected to approved footage and your operational tools? [Discuss a focused implementation with Martin](https://business.webytex.com/#quick-contact).

AI assisted design, implementation, tests, and documentation. The original code and synthetic assets are [MIT-licensed](LICENSE). Dependencies retain their own licences. No customer footage, proprietary source, or stock video is included.
