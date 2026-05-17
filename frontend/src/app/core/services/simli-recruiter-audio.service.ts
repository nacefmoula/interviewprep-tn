import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class SimliRecruiterAudioService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.interviewApiUrl;

  async createSpeechBlob(text: string): Promise<Blob> {
    const cleanText = (text ?? "").trim();

    if (!cleanText) {
      throw new Error("Cannot create Simli speech for empty text.");
    }

    return await firstValueFrom(
      this.http.post(
        `${this.base}/api/live-voice/speak`,
        {
          text: cleanText,
          lang: "en-US",
        },
        {
          responseType: "blob",
        },
      ),
    );
  }
}
