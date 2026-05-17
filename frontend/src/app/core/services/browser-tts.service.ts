import { Injectable } from "@angular/core";

// Priority-ordered list of voice name substrings to prefer.
// The first match wins. Add locale variants to taste.
const PREFERRED_VOICE_PATTERNS = [
  // Google voices (Chrome – best quality on Linux/Windows)
  "google us english",
  "google uk english female",
  "google uk english male",
  // Microsoft neural voices (Edge / Windows)
  "microsoft aria",
  "microsoft jenny",
  "microsoft guy",
  "microsoft natasha",
  "microsoft zira",
  "microsoft david",
  // macOS voices
  "samantha",
  "karen",
  "daniel",
  "moira",
  // Generic "natural" / "neural" voices
  "natural",
  "neural",
  "enhanced",
];

// Voice name fragments that are known to sound robotic — skip these.
const REJECTED_VOICE_PATTERNS = ["espeak", "mbrola", "festival", "pico"];

@Injectable({ providedIn: "root" })
export class BrowserTtsService {
  private speaking = false;

  private async ensureVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!("speechSynthesis" in window)) return [];

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) return voices;

    // Wait for voices to load (first call in some browsers)
    await new Promise<void>((resolve) => {
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null;
        resolve();
      };
      window.speechSynthesis.onvoiceschanged = handler;
      // Fallback timeout — some browsers never fire the event
      setTimeout(resolve, 1500);
    });

    return window.speechSynthesis.getVoices();
  }

  private pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
    const langPrefix = lang.split("-")[0].toLowerCase();

    // Filter to same language only
    const compatible = voices.filter((v) => {
      const vl = (v.lang ?? "").toLowerCase();
      return vl === lang.toLowerCase() || vl.startsWith(langPrefix);
    });

    const pool = compatible.length > 0 ? compatible : voices;

    // Reject known-robotic voices
    const filtered = pool.filter((v) => {
      const name = v.name.toLowerCase();
      return !REJECTED_VOICE_PATTERNS.some((pat) => name.includes(pat));
    });

    const candidates = filtered.length > 0 ? filtered : pool;

    // Pick the highest-priority preferred voice
    for (const pattern of PREFERRED_VOICE_PATTERNS) {
      const match = candidates.find((v) => v.name.toLowerCase().includes(pattern));
      if (match) return match;
    }

    // Fall back to the first non-robotic candidate, or just any voice
    return candidates[0] ?? voices[0] ?? null;
  }

  /**
   * Speak text using the best available voice.
   * One utterance per call — avoids edge cases with sentence-splitting
   * (texts without punctuation, AI ellipsis "…", very short greetings).
   */
  async speak(text: string, lang = "en-US"): Promise<void> {
    if (!("speechSynthesis" in window) || !text?.trim()) return;

    this.stop();
    this.speaking = true;

    const voices = await this.ensureVoices();
    const voice = this.pickVoice(voices, lang);

    try {
      await this.speakChunk(text, lang, voice);
    } finally {
      this.speaking = false;
    }
  }

  stop() {
    this.speaking = false;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private speakChunk(
    text: string,
    lang: string,
    voice: SpeechSynthesisVoice | null,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang   = lang;
      utt.rate   = 0.92;   // natural conversational pace (1.0 = normal speed)
      utt.pitch  = 1.05;   // very slightly above neutral sounds more engaged
      utt.volume = 1.0;

      if (voice) utt.voice = voice;

      utt.onend   = () => resolve();
      utt.onerror = () => resolve(); // non-fatal

      window.speechSynthesis.speak(utt);
    });
  }

}
