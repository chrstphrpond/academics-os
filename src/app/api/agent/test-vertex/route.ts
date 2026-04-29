import { NextResponse } from "next/server";
import { runVertex } from "@/lib/ai/runtime";

export const maxDuration = 30;

export async function GET() {
  try {
    const result = await runVertex({
      feature: "test",
      modelKey: "flash",
      prompt:
        "Reply with exactly one short sentence: a friendly hello to a student named Christopher about academic dashboards.",
    });
    return NextResponse.json(result);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error, hint: "If 403 PERMISSION_DENIED on aiplatform.endpoints.predict: run `gcloud auth application-default login` and ensure GOOGLE_APPLICATION_CREDENTIALS is unset (or set to a service account with the Vertex AI User role on GOOGLE_PROJECT_ID)." },
      { status: 500 }
    );
  }
}
