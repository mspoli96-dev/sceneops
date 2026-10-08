import type { Camera, CameraId, EvidenceFrame } from "./contracts";

export const DATASET_ID = "harbour-48-v1";
export const DURATION_SECONDS = 48;
export const SAMPLE_INTERVAL_SECONDS = 4;
export const CAMERAS: Camera[] = [
  { id: "receiving", name: "Receiving", location: "CAM 01 · Inbound lane", video: "/footage/receiving.mp4", poster: "/evidence/receiving-00.jpg" },
  { id: "packing", name: "Packing", location: "CAM 02 · Packing buffer", video: "/footage/packing.mp4", poster: "/evidence/packing-00.jpg" },
  { id: "dispatch", name: "Dispatch", location: "CAM 03 · Loading zone", video: "/footage/dispatch.mp4", poster: "/evidence/dispatch-00.jpg" }
];
export const SAMPLE_TIMES = Array.from({ length: 13 }, (_, index) => index * SAMPLE_INTERVAL_SECONDS);
export const FRAMES: EvidenceFrame[] = CAMERAS.flatMap(camera => SAMPLE_TIMES.map(at => ({
  id: `${camera.id}-${String(at).padStart(2, "0")}`, cameraId: camera.id, at,
  image: `/evidence/${camera.id}-${String(at).padStart(2, "0")}.jpg`
})));
export function cameraName(id: CameraId): string { return CAMERAS.find(camera => camera.id === id)?.name ?? id; }
export function formatTime(seconds: number): string { const s = Math.max(0, Math.min(DURATION_SECONDS, Math.floor(seconds))); return `00:${String(s).padStart(2, "0")}`; }
