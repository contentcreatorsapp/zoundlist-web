import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider }    from "./providers/openai";
import { GeminiProvider }    from "./providers/gemini";
import type { AIProvider }   from "./types";

/**
 * Returns the configured AI provider.
 * Set AI_PROVIDER env var to "openai" or "gemini" to switch.
 * Defaults to "anthropic".
 */
export function getAIProvider(): AIProvider {
  switch ((process.env.AI_PROVIDER ?? "anthropic").toLowerCase()) {
    case "openai":  return new OpenAIProvider();
    case "gemini":  return new GeminiProvider();
    default:        return new AnthropicProvider();
  }
}
