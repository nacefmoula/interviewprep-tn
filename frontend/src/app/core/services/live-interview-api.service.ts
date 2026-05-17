import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  CommitTurnRequest,
  LiveActionResponse,
  LiveStartResponse,
  EndLiveInterviewResponse,
} from "../models/live-interview.models";

@Injectable({ providedIn: "root" })
export class LiveInterviewApiService {
  private http = inject(HttpClient);
  private base = environment.interviewApiUrl;

  start(sessionId: number): Observable<LiveStartResponse> {
    return this.http.post<LiveStartResponse>(
      `${this.base}/api/live-interviews/${sessionId}/start`,
      {}
    );
  }

  commitTurn(sessionId: number, body: CommitTurnRequest): Observable<LiveActionResponse> {
    return this.http.post<LiveActionResponse>(
      `${this.base}/api/live-interviews/${sessionId}/commit-turn`,
      body
    );
  }

  end(sessionId: number): Observable<EndLiveInterviewResponse> {
    return this.http.post<EndLiveInterviewResponse>(
      `${this.base}/api/live-interviews/${sessionId}/end`,
      {}
    );
  }
}