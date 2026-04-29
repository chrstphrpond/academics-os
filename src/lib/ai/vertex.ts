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
  // Auth resolution order:
  //  1. GOOGLE_APPLICATION_CREDENTIALS_JSON — full SA JSON contents in one env var.
  //     Use this on Vercel since the filesystem isn't writable for SA files.
  //  2. VERTEX_KEY_PATH — local dev: path to an SA JSON file. Project-local override
  //     so a globally-set GOOGLE_APPLICATION_CREDENTIALS doesn't leak in.
  //  3. ADC fallback (GOOGLE_APPLICATION_CREDENTIALS, gcloud login, Workload Identity).
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const keyFile = process.env.VERTEX_KEY_PATH;
  _provider = createVertex({
    project,
    location,
    ...(credsJson
      ? { googleAuthOptions: { credentials: JSON.parse(credsJson) } }
      : keyFile
        ? { googleAuthOptions: { keyFilename: keyFile } }
        : {}),
  });
  return _provider;
}

/** Returns a Gemini model by key (e.g. "pro", "flash"). Lazily initializes the Vertex provider so module import doesn't fail when env vars aren't loaded yet. */
export function model(key: ModelKey) {
  return provider()(MODELS[key]);
}
