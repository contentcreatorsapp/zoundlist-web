import type { AIProvider, TrackMetadataInput, TrackMetadataSuggestion } from "../types";

export class GeminiProvider implements AIProvider {
  readonly id   = "gemini";
  readonly name = "Google Gemini";

  async generateTrackMetadata(_input: TrackMetadataInput): Promise<TrackMetadataSuggestion> {
    throw new Error(
      "Gemini provider not yet implemented. Set AI_PROVIDER=anthropic in your environment."
    );
  }
}
