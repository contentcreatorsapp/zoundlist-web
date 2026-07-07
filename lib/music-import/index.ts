import type { MusicImportProvider } from "./types";
import { sunoProvider } from "./providers/suno";

// Registry of all supported import providers.
// Add new providers here as they become available.
const PROVIDERS: MusicImportProvider[] = [
  sunoProvider,
  // future: uudioProvider, stableAudioProvider, musicFxProvider, manualUrlProvider
];

export function getProviderForUrl(url: string): MusicImportProvider | null {
  return PROVIDERS.find((p) => p.canHandle(url)) ?? null;
}

export { sunoProvider };
export type { MusicImportProvider };
