export const MODELS = {
  pro: "gemini-2.5-pro",
  flash: "gemini-2.5-flash",
  embedding: "text-embedding-005",
} as const;

export type ModelKey = keyof typeof MODELS;

export const FEATURES = {
  briefing: "briefing",
  sidekick: "sidekick",
  simulator: "simulator",
  planner: "planner",
  radar: "radar",
  rag: "rag",
  study: "study",
  inbox: "inbox",
  voice: "voice",
  test: "test",
} as const;

export type FeatureKey = keyof typeof FEATURES;
