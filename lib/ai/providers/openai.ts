import type { AIProvider, TrackMetadataInput, TrackMetadataSuggestion } from "../types";

export class OpenAIProvider implements AIProvider {
  readonly id   = "openai";
  readonly name = "OpenAI GPT";

  async generateTrackMetadata(_input: TrackMetadataInput): Promise<TrackMetadataSuggestion> {
    throw new Error(
      "OpenAI provider not yet implemented. Set AI_PROVIDER=anthropic in your environment."
    );
  }
}
