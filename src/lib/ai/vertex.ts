import { createVertex } from "@ai-sdk/google-vertex";
import { MODELS, type ModelKey } from "./models";

let _provider: ReturnType<typeof createVertex> | null = null;

function provider() {
  if (_provider) return _provider;
  const project = process.env.GOOGLE_PROJECT_ID;
  const location = process.env.GOOGLE_LOCATION ?? "us-central1";
  if (!project) {
    throw new Error(
      "GOOGLE_PROJECT_ID is not set. Run `gcloud auth application-default login` and `vercel env add GOOGLE_PROJECT_ID` (and GOOGLE_LOCATION) before calling Vertex."
    );
  }
  // Project-local override: a service-account JSON path scoped to this project,
  // so a globally-set GOOGLE_APPLICATION_CREDENTIALS (e.g. for another GCP project)
  // doesn't leak into our calls. Falls back to ADC (and thus GOOGLE_APPLICATION_CREDENTIALS)
  // when not set, which is the production path under Workload Identity Federation.
  const keyFile = process.env.VERTEX_KEY_PATH;
  _provider = createVertex({
    project,
    location,
    ...(keyFile ? { googleAuthOptions: { keyFilename: keyFile } } : {}),
  });
  return _provider;
}

/** Returns a Gemini model by key (e.g. "pro", "flash"). Lazily initializes the Vertex provider so module import doesn't fail when env vars aren't loaded yet. */
export function model(key: ModelKey) {
  return provider()(MODELS[key]);
}
