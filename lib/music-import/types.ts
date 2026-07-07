export type ImportPlatform = "suno" | "udio" | "stable-audio" | "musicfx" | "manual";

export interface ImportedTrackMetadata {
  platform: ImportPlatform;
  sourceId: string | null;      // platform-specific song ID
  sourceUrl: string;            // original URL pasted by user
  title: string | null;
  artist: string | null;        // not always available from AI generators
  durationSecs: number | null;
  duration: string | null;      // formatted "3:45"
  audioUrl: string | null;      // direct URL to downloadable audio
  coverUrl: string | null;      // artwork image URL
  lyrics: string | null;
  prompt: string | null;        // AI generation prompt, if available
  tags: string[];
}

export interface AnalyzeResult {
  success: boolean;
  metadata?: ImportedTrackMetadata;
  audioAccessible: boolean;     // true if audio can be server-downloaded
  error?: string;
}

export interface ExecuteImportResult {
  success: boolean;
  trackId?: string;
  error?: string;
}

export interface MusicImportProvider {
  platform: ImportPlatform;
  canHandle(url: string): boolean;
  analyze(url: string): Promise<AnalyzeResult>;
}
