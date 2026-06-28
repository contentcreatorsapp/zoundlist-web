// AI provider abstraction types — shared between providers and API routes.

export interface TrackMetadataInput {
  trackId:              string;
  title:                string;
  artist:               string;
  genre:                string;        // slug, e.g. "cinematic"
  mood:                 string | null; // display label, e.g. "Épico"
  bpm:                  number | null; // null or 0 = unknown
  duration:             string;        // formatted "3:45"
  existingDescription:  string | null;
  existingInstruments:  string[];
  existingTags:         string[];
}

export interface TrackMetadataSuggestion {
  title:            string;
  description:      string;    // professional, in Spanish
  genre:            string;
  subgenre:         string | null;
  moods:            string[];
  energy:           number;    // 1–10
  bpm:              number | null;
  musicalKey:       string | null;
  instruments:      string[];
  tags:             string[];           // SEO, in English
  recommendedUses:  string[];
  confidence:       number;    // 0–1
}

export interface AIProvider {
  readonly id:   string;
  readonly name: string;
  generateTrackMetadata(input: TrackMetadataInput): Promise<TrackMetadataSuggestion>;
}
