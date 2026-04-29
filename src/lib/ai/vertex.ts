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
  _provider = createVertex({ project, location });
  return _provider;
}

/** Returns a Gemini model by key (e.g. "pro", "flash"). Lazily initializes the Vertex provider so module import doesn't fail when env vars aren't loaded yet. */
export function model(key: ModelKey) {
  return provider()(MODELS[key]);
}
