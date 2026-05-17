import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ResourceApiResponse {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  level: string;
  industry: string;
  thumbUrl: string | null;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryApiResponse {
  id: string;
  name: string;
  description: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkApiResponse {
  id: string;
  userId: string;
  resourceId: string;
  resource: ResourceApiResponse;
  createdAt: string;
}

export interface FileUploadApiResponse {
  fileUrl: string;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  size: number;
}

export interface AiGenerateResourcesResponse {
  requested: number;
  created: number;
  skipped: number;
  resources: ResourceApiResponse[];
  warnings: string[];
}

export interface AiResourceSummaryResponse {
  resourceId: string;
  provider: string;
  summary: string;
  keyPoints: string[];
  generatedAt: string;
}

export interface AiSeedSummaryResponse {
  provider: string;
  categoriesCreated: number;
  resourcesCreated: number;
  skipped: number;
  warnings: string[];
  seededAt: string;
}

export interface DuplicateCheckResponse {
  resource: ResourceApiResponse;
  similarity: number;
}

export interface TranslationResponse {
  lang: string;
  title: string;
  description: string;
  provider: string;
}

export interface QualityScoreResponse {
  overall: number;
  clarity: number;
  depth: number;
  usefulness: number;
  provider: string;
  comment: string;
}

export interface AiClassificationResponse {
  title: string;
  description: string;
  type: string;
  level: string;
  industry: string;
  categoryId: string | null;
  categoryName: string | null;
  tags: string[];
  provider: string;
}

export interface ResourceRequestPayload {
  title: string;
  description?: string;
  url: string;
  type: string;
  level: string;
  industry: string;
  thumbUrl?: string | null;
  categoryId?: string | null;
}

export interface EngagementApiResponse {
  id: string;
  resourceId: string;
  resourceTitle: string;
  resourceUrl: string;
  resourceType: string;
  resourceThumbUrl: string | null;
  resourceCategoryName: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progressPct: number;
  openCount: number;
  notes: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activityDays: string[];
  streakDays: number;
}

export interface ResourceStatsResponse {
  totalCount: number;
  videoCount: number;
  articleCount: number;
  podcastCount: number;
  bookCount: number;
  quizCount: number;
  categoryCount: number;
  newThisWeek: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  page?: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class ResourceApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.resourceApiUrl;

  getResources(page = 0, size = 10): Observable<PageResponse<ResourceApiResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<ResourceApiResponse>>(`${this.apiUrl}/api/resources`, { params });
  }

  searchResources(query: string, page = 0, size = 10): Observable<PageResponse<ResourceApiResponse>> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page)
      .set('size', size);
    return this.http.get<PageResponse<ResourceApiResponse>>(`${this.apiUrl}/api/resources/search`, { params });
  }

  filterResources(type?: string, industry?: string, level?: string, categoryId?: string, page = 0, size = 12): Observable<PageResponse<ResourceApiResponse>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (type && type !== 'all') params = params.set('type', type.toUpperCase());
    if (industry && industry !== 'ALL') params = params.set('industry', industry);
    if (level && level !== 'ALL') params = params.set('level', level);
    if (categoryId && categoryId !== 'all') params = params.set('categoryId', categoryId);
    return this.http.get<PageResponse<ResourceApiResponse>>(`${this.apiUrl}/api/resources/filter`, { params });
  }

  getCategories(): Observable<CategoryApiResponse[]> {
    return this.http.get<CategoryApiResponse[]>(`${this.apiUrl}/api/resources/categories`);
  }

  getBookmarks(): Observable<BookmarkApiResponse[]> {
    return this.http.get<BookmarkApiResponse[]>(`${this.apiUrl}/api/resources/bookmarks`);
  }

  addBookmark(resourceId: string): Observable<BookmarkApiResponse> {
    return this.http.post<BookmarkApiResponse>(`${this.apiUrl}/api/resources/bookmarks/${resourceId}`, {});
  }

  removeBookmark(bookmarkId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/resources/bookmarks/${bookmarkId}`);
  }

  // Admin CRUD operations
  createResource(data: ResourceRequestPayload): Observable<ResourceApiResponse> {
    return this.http.post<ResourceApiResponse>(`${this.apiUrl}/api/resources`, data);
  }

  updateResource(resourceId: string, data: ResourceRequestPayload): Observable<ResourceApiResponse> {
    return this.http.put<ResourceApiResponse>(`${this.apiUrl}/api/resources/${resourceId}`, data);
  }

  deleteResource(resourceId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/resources/${resourceId}`);
  }

  getResourceById(resourceId: string): Observable<ResourceApiResponse> {
    return this.http.get<ResourceApiResponse>(`${this.apiUrl}/api/resources/${resourceId}`);
  }

  getStats(): Observable<ResourceStatsResponse> {
    return this.http.get<ResourceStatsResponse>(`${this.apiUrl}/api/resources/stats`);
  }

  uploadResourceFile(file: File, kind: 'resource' | 'thumbnail' = 'resource'): Observable<FileUploadApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<FileUploadApiResponse>(`${this.apiUrl}/api/resources/upload?kind=${kind}`, formData);
  }

  generateAiResources(payload: { count?: number; level?: string; industry?: string; type?: string; categoryId?: string } | number = 5): Observable<AiGenerateResourcesResponse> {
    const body = typeof payload === 'number' ? { count: payload } : payload;
    return this.http.post<AiGenerateResourcesResponse>(`${this.apiUrl}/api/resources/ai/generate`, body);
  }

  summarizeResource(resourceId: string, refresh = false): Observable<AiResourceSummaryResponse> {
    let url = `${this.apiUrl}/api/resources/${resourceId}/ai/summary`;
    if (refresh) url += '?refresh=true';
    return this.http.get<AiResourceSummaryResponse>(url);
  }

  relatedResources(resourceId: string, limit = 5): Observable<ResourceApiResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ResourceApiResponse[]>(`${this.apiUrl}/api/resources/${resourceId}/ai/similar`, { params });
  }

  checkDuplicate(title: string, description: string): Observable<DuplicateCheckResponse[]> {
    return this.http.post<DuplicateCheckResponse[]>(`${this.apiUrl}/api/resources/ai/check-duplicate`, { title, description });
  }

  translateResource(resourceId: string, lang: 'fr' | 'en' | 'es' | 'ar' = 'en'): Observable<TranslationResponse> {
    const params = new HttpParams().set('lang', lang);
    return this.http.get<TranslationResponse>(`${this.apiUrl}/api/resources/${resourceId}/ai/translate`, { params });
  }

  qualityScore(resourceId: string): Observable<QualityScoreResponse> {
    return this.http.get<QualityScoreResponse>(`${this.apiUrl}/api/resources/${resourceId}/ai/quality`);
  }

  classifyResource(title: string, description?: string): Observable<AiClassificationResponse> {
    return this.http.post<AiClassificationResponse>(`${this.apiUrl}/api/resources/ai/classify`, { title, description: description || '' });
  }

  seedStatic(forceReseed = false): Observable<AiSeedSummaryResponse> {
    return this.http.post<AiSeedSummaryResponse>(
      `${this.apiUrl}/api/resources/ai/seed/static?forceReseed=${forceReseed}`,
      {}
    );
  }

  seedAuto(forceReseed = false): Observable<AiSeedSummaryResponse> {
    return this.http.post<AiSeedSummaryResponse>(
      `${this.apiUrl}/api/resources/ai/seed?forceReseed=${forceReseed}`,
      {}
    );
  }

  getEngagements(): Observable<EngagementApiResponse[]> {
    return this.http.get<EngagementApiResponse[]>(`${this.apiUrl}/api/resources/engagements`);
  }

  getEngagement(resourceId: string): Observable<EngagementApiResponse> {
    return this.http.get<EngagementApiResponse>(`${this.apiUrl}/api/resources/engagements/${resourceId}`);
  }

  recordOpen(resourceId: string): Observable<EngagementApiResponse> {
    return this.http.post<EngagementApiResponse>(`${this.apiUrl}/api/resources/engagements/${resourceId}/open`, {});
  }

  ensureEngagement(resourceId: string): Observable<EngagementApiResponse> {
    return this.http.post<EngagementApiResponse>(`${this.apiUrl}/api/resources/engagements/${resourceId}/ensure`, {});
  }

  updateEngagement(resourceId: string, data: { status?: string; progressPct?: number; notes?: string }): Observable<EngagementApiResponse> {
    return this.http.put<EngagementApiResponse>(`${this.apiUrl}/api/resources/engagements/${resourceId}`, data);
  }
}
