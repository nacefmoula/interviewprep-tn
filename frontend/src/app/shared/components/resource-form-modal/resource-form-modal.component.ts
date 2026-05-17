import { Component, EventEmitter, HostListener, Input, Output, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ResourceApiResponse, ResourceApiService, CategoryApiResponse, FileUploadApiResponse } from '../../../core/services/resource-api.service';
import { Resource } from '../../../core/models/models';
import { ResourceCardComponent } from '../resource-card/resource-card.component';
import { catchError, of } from 'rxjs';


@Component({
  selector: 'app-resource-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ResourceCardComponent],
  template: `
    <div class="rfm-overlay" *ngIf="isOpen" (click)="tryClose()">
      <div class="rfm-shell" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-label]="isEdit ? 'Modifier la ressource' : 'Créer une ressource'">

        <!-- HERO HEADER -->
        <header class="rfm-hero">
          <div class="rfm-hero-bg" aria-hidden="true">
            <div class="rfm-orb rfm-orb-1"></div>
            <div class="rfm-orb rfm-orb-2"></div>
            <div class="rfm-grid-pattern"></div>
          </div>
          <div class="rfm-hero-content">
            <div class="rfm-hero-badge">
              <span class="rfm-pulse-dot"></span>
              <span>{{ isEdit ? 'ÉDITION' : 'NOUVELLE PUBLICATION' }}</span>
            </div>
            <h2 class="rfm-hero-title">{{ isEdit ? 'Modifier la ressource' : 'Créer une ressource' }}</h2>
            <p class="rfm-hero-sub">{{ isEdit ? 'Mettez à jour les détails et publiez vos changements instantanément.' : 'Composez votre ressource — l\\'aperçu à droite se met à jour en temps réel.' }}</p>
            <div class="rfm-step-track">
              <div class="rfm-step" [class.done]="isSectionComplete('basics')" [class.active]="!isSectionComplete('basics')">
                <span class="rfm-step-num">1</span>
                <span class="rfm-step-lbl">Essentiel</span>
              </div>
              <div class="rfm-step-line"></div>
              <div class="rfm-step" [class.done]="isSectionComplete('classification')" [class.active]="isSectionComplete('basics') && !isSectionComplete('classification')">
                <span class="rfm-step-num">2</span>
                <span class="rfm-step-lbl">Classification</span>
              </div>
              <div class="rfm-step-line"></div>
              <div class="rfm-step" [class.done]="isSectionComplete('media')" [class.active]="isSectionComplete('classification') && !isSectionComplete('media')">
                <span class="rfm-step-num">3</span>
                <span class="rfm-step-lbl">Média</span>
              </div>
            </div>
          </div>
          <button class="rfm-close" (click)="tryClose()" aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <!-- SPLIT BODY -->
        <div class="rfm-body">
          <form [formGroup]="form" class="rfm-form">
            <div class="rfm-form-error" *ngIf="formError">{{ formError }}</div>

            <!-- Section 1: Essentiel -->
            <section class="rfm-section" id="rfm-sec-basics">
              <div class="rfm-section-head">
                <span class="rfm-section-num">1</span>
                <div>
                  <h3 class="rfm-section-title">Essentiel</h3>
                  <p class="rfm-section-sub">Le titre et la description donnent le ton de votre ressource.</p>
                </div>
              </div>

              <div class="rfm-field">
                <div class="rfm-field-head">
                  <label>Titre <span class="req">*</span></label>
                  <button
                    type="button"
                    class="rfm-magic-btn"
                    (click)="autoClassify()"
                    [disabled]="isAutoClassifying || !form.value.title || form.value.title.length < 3"
                    [title]="form.value.title ? 'Laisser l\\'IA remplir tous les champs à partir du titre' : 'Saisissez d\\'abord un titre (≥ 3 caractères)'">
                    <svg *ngIf="!isAutoClassifying" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h0M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>
                    </svg>
                    <span *ngIf="isAutoClassifying" class="rfm-compose-spin"></span>
                    {{ isAutoClassifying ? 'Analyse IA…' : 'Tout remplir avec l\\'IA' }}
                  </button>
                </div>
                <input type="text" class="rfm-input" formControlName="title" placeholder="Ex. : Masterclass System Design">
                <div class="rfm-error" *ngIf="hasError('title', 'required')">Le titre est requis.</div>
                <div class="rfm-error" *ngIf="hasError('title', 'minlength')">Le titre doit contenir au moins 3 caractères.</div>
                <div *ngIf="autoClassifyFlash" class="rfm-magic-flash">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {{ autoClassifyFlash }}
                </div>
              </div>

              <div class="rfm-field">
                <div class="rfm-field-head">
                  <label>Description <span class="req">*</span></label>
                  <button
                    type="button"
                    class="rfm-compose-btn"
                    (click)="composeDescription()"
                    [disabled]="isComposing || !form.value.title"
                    [title]="form.value.title ? 'Laisser l\\'IA écrire un premier jet' : 'Saisissez d\\'abord un titre'">
                    <svg *ngIf="!isComposing" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z"/>
                    </svg>
                    <span *ngIf="isComposing" class="rfm-compose-spin"></span>
                    {{ isComposing ? 'Rédaction…' : 'Écrire avec l\\'IA' }}
                  </button>
                </div>
                <textarea class="rfm-input" formControlName="description" rows="4" placeholder="Qu'est-ce que les utilisateurs vont apprendre avec cette ressource ?"></textarea>
                <div class="rfm-error" *ngIf="hasError('description', 'required')">La description est requise.</div>
                <div class="rfm-error" *ngIf="hasError('description', 'minlength')">La description doit contenir au moins 10 caractères.</div>
              </div>

              <!-- Duplicate detection warning -->
              <div class="rfm-dup-alert" *ngIf="duplicatesFound.length > 0 && !isEdit">
                <div class="rfm-dup-head">
                  <span class="rfm-dup-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </span>
                  <span class="rfm-dup-title">
                    {{ duplicatesFound.length }} ressource{{ duplicatesFound.length !== 1 ? 's' : '' }} similaire{{ duplicatesFound.length !== 1 ? 's' : '' }} détectée{{ duplicatesFound.length !== 1 ? 's' : '' }}
                  </span>
                  <span class="rfm-dup-spin" *ngIf="isCheckingDuplicates"></span>
                </div>
                <div class="rfm-dup-body">Avant de publier, vérifiez si votre ressource n'est pas déjà présente :</div>
                <ul class="rfm-dup-list">
                  <li *ngFor="let d of duplicatesFound">
                    <span class="rfm-dup-score" [title]="'Score de similarité : ' + d.similarity">
                      {{ d.similarity }}%
                    </span>
                    <a *ngIf="d.resource.url" [href]="d.resource.url" target="_blank" rel="noopener" class="rfm-dup-link">
                      {{ d.resource.title }}
                    </a>
                    <span *ngIf="!d.resource.url" class="rfm-dup-link-muted">{{ d.resource.title }}</span>
                  </li>
                </ul>
              </div>
            </section>

            <!-- Section 2: Classification -->
            <section class="rfm-section" id="rfm-sec-classification">
              <div class="rfm-section-head">
                <span class="rfm-section-num">2</span>
                <div>
                  <h3 class="rfm-section-title">Classification</h3>
                  <p class="rfm-section-sub">Aidez les apprenants à trouver rapidement votre ressource.</p>
                </div>
              </div>

              <!-- TYPE SELECTOR as visual cards -->
              <div class="rfm-field">
                <label>Type de ressource <span class="req">*</span></label>
                <div class="rfm-type-grid" role="radiogroup" aria-label="Type de ressource">
                  <button
                    type="button"
                    class="rfm-type-card"
                    *ngFor="let t of typeOptions"
                    [class.selected]="form.value.type === t.apiValue"
                    [ngClass]="'tc-' + t.key"
                    (click)="selectType(t.apiValue)"
                    [attr.aria-pressed]="form.value.type === t.apiValue"
                    [attr.aria-label]="t.label">
                    <span class="rfm-type-icon">{{ t.emoji }}</span>
                    <span class="rfm-type-label">{{ t.label }}</span>
                    <span class="rfm-type-check" *ngIf="form.value.type === t.apiValue">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  </button>
                </div>
                <div class="rfm-error" *ngIf="hasError('type', 'required')">Le type est requis.</div>
              </div>

              <!-- LEVEL segmented control -->
              <div class="rfm-field">
                <label>Niveau de difficulté <span class="req">*</span></label>
                <div class="rfm-segment" role="radiogroup" aria-label="Niveau">
                  <button
                    type="button"
                    class="rfm-seg-btn lvl-beginner"
                    [class.selected]="form.value.level === 'BEGINNER'"
                    (click)="selectLevel('BEGINNER')"
                    [attr.aria-pressed]="form.value.level === 'BEGINNER'">
                    <span class="rfm-seg-dot"></span>
                    Débutant
                  </button>
                  <button
                    type="button"
                    class="rfm-seg-btn lvl-intermediate"
                    [class.selected]="form.value.level === 'INTERMEDIATE'"
                    (click)="selectLevel('INTERMEDIATE')"
                    [attr.aria-pressed]="form.value.level === 'INTERMEDIATE'">
                    <span class="rfm-seg-dot"></span>
                    Intermédiaire
                  </button>
                  <button
                    type="button"
                    class="rfm-seg-btn lvl-advanced"
                    [class.selected]="form.value.level === 'ADVANCED'"
                    (click)="selectLevel('ADVANCED')"
                    [attr.aria-pressed]="form.value.level === 'ADVANCED'">
                    <span class="rfm-seg-dot"></span>
                    Avancé
                  </button>
                </div>
                <div class="rfm-error" *ngIf="hasError('level', 'required')">Le niveau est requis.</div>
              </div>

              <div class="rfm-row">
                <div class="rfm-field">
                  <label>Catégorie</label>
                  <select class="rfm-input" formControlName="categoryId">
                    <option value="">-- Choisir une catégorie --</option>
                    <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                  </select>
                  <div class="rfm-error" *ngIf="categoriesLoadError">{{ categoriesLoadError }}</div>
                  <div class="rfm-hint" *ngIf="!categoriesLoadError && isOpen && categories.length === 0">
                    Aucune catégorie.
                    <button class="rfm-link-btn" type="button" (click)="seedDefaultCategories()" [disabled]="isSeedingCategories">
                      {{ isSeedingCategories ? 'Initialisation…' : 'Initialiser' }}
                    </button>
                  </div>
                </div>

                <div class="rfm-field">
                  <label>Secteur</label>
                  <select class="rfm-input" formControlName="industry">
                    <option *ngFor="let industry of industries" [value]="industry">{{ industry }}</option>
                  </select>
                </div>
              </div>
            </section>

            <!-- Section 3: Media -->
            <section class="rfm-section" id="rfm-sec-media">
              <div class="rfm-section-head">
                <span class="rfm-section-num">3</span>
                <div>
                  <h3 class="rfm-section-title">Média</h3>
                  <p class="rfm-section-sub">Lien et miniature pour rendre votre ressource attractive.</p>
                </div>
              </div>

              <div class="rfm-field">
                <label>Lien de la ressource <span class="req">*</span></label>
                <div class="rfm-input-wrap">
                  <span class="rfm-input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </span>
                  <input type="url" class="rfm-input rfm-input-padded" formControlName="url" placeholder="https://example.com/ressource">
                </div>
                <div class="rfm-error" *ngIf="hasError('url', 'required')">Le lien est requis.</div>
                <div class="rfm-error" *ngIf="hasError('url', 'pattern')">Le lien doit commencer par http:// ou https://.</div>
              </div>

              <div class="rfm-field">
                <label>Fichier de la ressource <span class="rfm-optional">(optionnel)</span></label>
                <div
                  class="rfm-dropzone"
                  [class.drag-over]="isResourceDragOver"
                  [class.has-file]="!!selectedResourceFile || resourceUploadInfo.startsWith('Uploaded:')"
                  (dragover)="onResourceDragOver($event)"
                  (dragleave)="onResourceDragLeave($event)"
                  (drop)="onResourceDrop($event)">
                  <div class="rfm-dropzone-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div class="rfm-dropzone-title">Glissez-déposez votre fichier</div>
                  <div class="rfm-dropzone-sub">PDF · Vidéo · Image — jusqu'à 250 MB</div>
                  <label class="rfm-dropzone-btn">
                    <input class="rfm-visually-hidden" type="file" accept="application/pdf,video/*,image/*" (change)="onResourceFileSelected($event)">
                    <span>Parcourir</span>
                  </label>
                </div>
                <div class="rfm-file-chip" *ngIf="selectedResourceFile">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span class="rfm-file-name">{{ selectedResourceFile.name }}</span>
                  <span class="rfm-file-size">{{ formatFileSize(selectedResourceFile.size) }}</span>
                  <button type="button" class="rfm-upload-btn" [disabled]="isUploadingResourceFile" (click)="uploadResourceFile()">
                    <span *ngIf="!isUploadingResourceFile">Téléverser</span>
                    <span *ngIf="isUploadingResourceFile" class="rfm-spinner"></span>
                  </button>
                </div>
                <div class="rfm-upload-info" *ngIf="resourceUploadInfo">{{ resourceUploadInfo }}</div>
              </div>

              <div class="rfm-field">
                <label>Miniature</label>
                <div class="rfm-input-wrap">
                  <span class="rfm-input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </span>
                  <input type="url" class="rfm-input rfm-input-padded" formControlName="thumbUrl" placeholder="https://example.com/image.jpg">
                </div>
                <div class="rfm-error" *ngIf="hasError('thumbUrl', 'pattern')">L'URL doit commencer par http:// ou https://.</div>

                <div
                  class="rfm-dropzone rfm-dropzone-sm"
                  [class.drag-over]="isThumbnailDragOver"
                  [class.has-file]="!!selectedThumbnailFile || thumbnailUploadInfo.startsWith('Uploaded:')"
                  (dragover)="onThumbnailDragOver($event)"
                  (dragleave)="onThumbnailDragLeave($event)"
                  (drop)="onThumbnailDrop($event)">
                  <div class="rfm-dropzone-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div class="rfm-dropzone-title">Glissez-déposez une image</div>
                  <div class="rfm-dropzone-sub">image/* — idéal 16:9</div>
                  <label class="rfm-dropzone-btn">
                    <input class="rfm-visually-hidden" type="file" accept="image/*" (change)="onThumbnailFileSelected($event)">
                    <span>Parcourir</span>
                  </label>
                </div>
                <div class="rfm-file-chip" *ngIf="selectedThumbnailFile">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span class="rfm-file-name">{{ selectedThumbnailFile.name }}</span>
                  <span class="rfm-file-size">{{ formatFileSize(selectedThumbnailFile.size) }}</span>
                  <button type="button" class="rfm-upload-btn" [disabled]="isUploadingThumbnailFile" (click)="uploadThumbnailFile()">
                    <span *ngIf="!isUploadingThumbnailFile">Téléverser</span>
                    <span *ngIf="isUploadingThumbnailFile" class="rfm-spinner"></span>
                  </button>
                </div>
                <div class="rfm-upload-info" *ngIf="thumbnailUploadInfo">{{ thumbnailUploadInfo }}</div>
              </div>
            </section>
          </form>

          <!-- LIVE PREVIEW (sticky on desktop) -->
          <aside class="rfm-preview" aria-label="Aperçu en temps réel">
            <div class="rfm-preview-header">
              <span class="rfm-preview-kicker">APERÇU EN DIRECT</span>
              <span class="rfm-preview-live-dot" aria-hidden="true"></span>
            </div>
            <div class="rfm-preview-frame">
              <app-resource-card [resource]="previewResource" [isAdmin]="false"></app-resource-card>
            </div>
            <div class="rfm-preview-meta">
              <div class="rfm-preview-row">
                <span class="rfm-preview-label">Complétude</span>
                <span class="rfm-preview-value">{{ completedSectionsCount }} / 3 sections</span>
              </div>
              <div class="rfm-preview-bar">
                <div class="rfm-preview-bar-fill" [style.width.%]="(completedSectionsCount / 3) * 100"></div>
              </div>
              <div class="rfm-preview-tips" *ngIf="completedSectionsCount < 3">
                <span class="rfm-tip-icon">💡</span>
                <span>{{ nextStepHint }}</span>
              </div>
              <div class="rfm-preview-ready" *ngIf="completedSectionsCount === 3">
                <span>✓</span>
                Prêt à publier !
              </div>
            </div>
          </aside>
        </div>

        <!-- STICKY FOOTER -->
        <footer class="rfm-footer">
          <button type="button" class="rfm-btn rfm-btn-ghost" (click)="tryClose()">Annuler</button>
          <button
            type="button"
            class="rfm-btn rfm-btn-primary"
            [class.is-saving]="isSubmitting"
            [disabled]="isSubmitting || isUploadingResourceFile || isUploadingThumbnailFile || form.invalid"
            (click)="submit()">
            <span *ngIf="!isSubmitting">{{ isEdit ? 'Mettre à jour' : 'Publier la ressource' }}</span>
            <span *ngIf="isSubmitting" class="rfm-btn-loading">
              <span class="rfm-spinner rfm-spinner-light"></span>
              Enregistrement…
            </span>
            <svg *ngIf="!isSubmitting" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <div class="rfm-confetti" *ngIf="showConfetti" aria-hidden="true">
            <span>✨</span><span>🎉</span><span>✨</span>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    /* ============ OVERLAY & SHELL ============ */
    .rfm-overlay {
      position: fixed; inset: 0;
      background: rgba(8, 20, 35, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      z-index: 1000;
      animation: rfm-fade 200ms ease-out;
    }
    @keyframes rfm-fade { from { opacity: 0; } to { opacity: 1; } }

    .rfm-shell {
      width: 100%;
      max-width: 1040px;
      max-height: 92vh;
      background: #fff;
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12);
      animation: rfm-rise 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes rfm-rise {
      from { opacity: 0; transform: translateY(24px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ============ HERO HEADER ============ */
    .rfm-hero {
      position: relative;
      padding: 28px 32px 24px;
      color: #fff;
      background: linear-gradient(135deg, #0f766e 0%, #0891b2 50%, #0ea5e9 100%);
      overflow: hidden;
    }
    .rfm-hero-bg { position: absolute; inset: 0; pointer-events: none; }
    .rfm-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.5;
    }
    .rfm-orb-1 {
      width: 280px; height: 280px;
      background: #22d3ee;
      top: -80px; right: -40px;
      animation: rfm-orb-1 16s ease-in-out infinite;
    }
    .rfm-orb-2 {
      width: 220px; height: 220px;
      background: #14b8a6;
      bottom: -60px; left: 20%;
      animation: rfm-orb-2 20s ease-in-out infinite;
    }
    @keyframes rfm-orb-1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-30px, 20px); } }
    @keyframes rfm-orb-2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(40px, -20px); } }

    .rfm-grid-pattern {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 32px 32px;
      mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
    }

    .rfm-hero-content { position: relative; z-index: 1; }

    .rfm-hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px 5px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.22);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      backdrop-filter: blur(8px);
      margin-bottom: 12px;
    }
    .rfm-pulse-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #22d3ee;
      box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.7);
      animation: rfm-pulse 2s infinite;
    }
    @keyframes rfm-pulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(34, 211, 238, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
    }

    .rfm-hero-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.85rem;
      font-weight: 600;
      line-height: 1.1;
      margin: 0 0 6px;
      letter-spacing: -0.02em;
    }
    .rfm-hero-sub {
      font-size: 0.92rem;
      margin: 0 0 20px;
      opacity: 0.9;
      max-width: 640px;
    }

    .rfm-step-track {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .rfm-step {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px 6px 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 12px;
      font-weight: 600;
      transition: all 220ms ease;
    }
    .rfm-step.active {
      background: rgba(255, 255, 255, 0.22);
      border-color: rgba(255, 255, 255, 0.4);
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
    }
    .rfm-step.done {
      background: rgba(34, 211, 238, 0.18);
      border-color: rgba(34, 211, 238, 0.45);
      color: #cffafe;
    }
    .rfm-step-num {
      width: 22px; height: 22px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.22);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
    }
    .rfm-step.done .rfm-step-num {
      background: #22d3ee;
      color: #0f172a;
    }
    .rfm-step-line {
      flex: 1;
      min-width: 24px;
      height: 2px;
      background: rgba(255, 255, 255, 0.18);
      border-radius: 999px;
    }

    .rfm-close {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 2;
      width: 36px; height: 36px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      transition: background 180ms ease, transform 180ms ease;
    }
    .rfm-close:hover { background: rgba(255, 255, 255, 0.18); transform: rotate(90deg); }

    /* ============ BODY: SPLIT LAYOUT ============ */
    .rfm-body {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
      gap: 0;
      flex: 1;
      overflow: hidden;
      background: #fafbfc;
    }

    .rfm-form {
      padding: 28px 32px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
      border-right: 1px solid #e2e8f0;
      background: #fff;
    }

    .rfm-form-error {
      padding: 10px 14px;
      border-radius: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .rfm-section { display: flex; flex-direction: column; gap: 16px; }
    .rfm-section-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 4px;
    }
    .rfm-section-num {
      width: 32px; height: 32px;
      border-radius: 10px;
      background: linear-gradient(135deg, #14b8a6, #22d3ee);
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
    }
    .rfm-section-title {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.15rem;
      font-weight: 600;
      color: #0f172a;
      margin: 2px 0 2px;
      letter-spacing: -0.01em;
    }
    .rfm-section-sub {
      margin: 0;
      font-size: 0.8rem;
      color: #64748b;
    }

    /* Fields */
    .rfm-field { display: flex; flex-direction: column; gap: 6px; }
    .rfm-field label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #334155;
      letter-spacing: 0.01em;
      text-transform: uppercase;
    }
    .req { color: #ef4444; margin-left: 2px; }

    .rfm-field-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .rfm-compose-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border: 1px solid transparent;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(20,184,166,0.1), rgba(139,92,246,0.1));
      color: #0f766e;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 160ms ease;
      border-color: rgba(20,184,166,0.25);
    }
    .rfm-compose-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(20,184,166,0.18), rgba(139,92,246,0.18));
      border-color: #14b8a6;
      transform: translateY(-1px);
    }
    .rfm-compose-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .rfm-compose-btn svg { color: #8b5cf6; }
    .rfm-compose-spin {
      display: inline-block;
      width: 11px; height: 11px;
      border: 2px solid rgba(20,184,166,0.25);
      border-top-color: #14b8a6;
      border-radius: 50%;
      animation: rfm-compose-spin 0.7s linear infinite;
    }
    @keyframes rfm-compose-spin { to { transform: rotate(360deg); } }

    /* Magic "tout remplir" button */
    .rfm-magic-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(20, 184, 166, 0.1));
      color: #6d28d9;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      font-family: inherit;
      transition: all 180ms ease;
    }
    .rfm-magic-btn svg { color: #8b5cf6; animation: rfm-magic-sparkle 2.2s ease-in-out infinite; }
    @keyframes rfm-magic-sparkle { 0%, 100% { transform: scale(1) rotate(0); } 50% { transform: scale(1.25) rotate(15deg); } }
    .rfm-magic-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(20, 184, 166, 0.2));
      border-color: #8b5cf6;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px -2px rgba(139, 92, 246, 0.3);
    }
    .rfm-magic-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .rfm-magic-flash {
      margin-top: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px 4px 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f0fdfa, #ecfeff);
      color: #0f766e;
      font-size: 0.72rem;
      font-weight: 600;
      border: 1px solid #ccfbf1;
      animation: rfm-flash-in 280ms cubic-bezier(0.2, 1.4, 0.4, 1);
    }
    @keyframes rfm-flash-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }

    /* Duplicate detection alert */
    .rfm-dup-alert {
      margin-top: 8px;
      padding: 10px 14px;
      border-radius: 10px;
      background: linear-gradient(135deg, #fef9c3, #fef3c7);
      border: 1px solid #fde68a;
      color: #78350f;
      animation: rfm-dup-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes rfm-dup-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .rfm-dup-head {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #92400e;
    }
    .rfm-dup-icon { color: #d97706; display: inline-flex; }
    .rfm-dup-title { flex: 1; }
    .rfm-dup-spin {
      width: 12px; height: 12px;
      border: 2px solid rgba(217, 119, 6, 0.25);
      border-top-color: #d97706;
      border-radius: 50%;
      animation: rfm-compose-spin 0.7s linear infinite;
    }
    .rfm-dup-body {
      font-size: 0.78rem;
      margin: 6px 0 8px;
      color: #78350f;
    }
    .rfm-dup-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .rfm-dup-list li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.65);
      border: 1px solid rgba(253, 230, 138, 0.8);
      font-size: 0.82rem;
    }
    .rfm-dup-score {
      padding: 2px 7px;
      border-radius: 999px;
      background: #fde68a;
      color: #92400e;
      font-size: 0.7rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .rfm-dup-link {
      color: #0f766e;
      font-weight: 600;
      text-decoration: none;
    }
    .rfm-dup-link:hover { text-decoration: underline; }
    .rfm-dup-link-muted {
      color: #64748b;
      font-weight: 500;
    }
    .rfm-optional {
      color: #94a3b8;
      text-transform: none;
      font-weight: 500;
      margin-left: 4px;
      font-size: 0.72rem;
    }

    .rfm-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .rfm-input {
      padding: 11px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      font-size: 0.9rem;
      font-family: inherit;
      color: #0f172a;
      transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
      width: 100%;
      box-sizing: border-box;
    }
    textarea.rfm-input { resize: vertical; min-height: 96px; font-family: inherit; line-height: 1.5; }
    .rfm-input::placeholder { color: #94a3b8; }
    .rfm-input:hover { border-color: #cbd5e1; }
    .rfm-input:focus {
      outline: none;
      border-color: #14b8a6;
      box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
    }
    .rfm-input:disabled { background: #f1f5f9; cursor: not-allowed; color: #94a3b8; }

    .rfm-input-wrap { position: relative; }
    .rfm-input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      pointer-events: none;
      display: inline-flex;
    }
    .rfm-input-padded { padding-left: 40px; }

    .rfm-error {
      font-size: 0.78rem;
      color: #dc2626;
      font-weight: 500;
      margin-top: 2px;
    }
    .rfm-hint {
      font-size: 0.78rem;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .rfm-link-btn {
      background: none;
      border: none;
      color: #14b8a6;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      font-size: inherit;
      text-decoration: underline;
    }
    .rfm-link-btn:disabled { color: #94a3b8; cursor: not-allowed; text-decoration: none; }

    /* ============ TYPE CARDS ============ */
    .rfm-type-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
    }
    .rfm-type-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 8px;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      background: #fff;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
      overflow: hidden;
      font-family: inherit;
    }
    .rfm-type-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: currentColor;
      opacity: 0;
      transition: opacity 200ms ease;
    }
    .rfm-type-card:hover {
      transform: translateY(-2px);
      border-color: currentColor;
      box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.15);
    }
    .rfm-type-card:hover::before { opacity: 0.05; }

    .rfm-type-card.tc-article     { color: #0f766e; }
    .rfm-type-card.tc-video       { color: #7c3aed; }
    .rfm-type-card.tc-podcast     { color: #ea580c; }
    .rfm-type-card.tc-exercise    { color: #db2777; }
    .rfm-type-card.tc-template    { color: #0891b2; }

    .rfm-type-card.selected {
      border-color: currentColor;
      border-width: 2px;
      padding: 15px 7px;
      box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.2);
    }
    .rfm-type-card.selected::before { opacity: 0.08; }

    .rfm-type-icon {
      position: relative;
      z-index: 1;
      font-size: 1.8rem;
      line-height: 1;
      transition: transform 200ms ease;
    }
    .rfm-type-card:hover .rfm-type-icon { transform: scale(1.1); }
    .rfm-type-card.selected .rfm-type-icon { transform: scale(1.15); }

    .rfm-type-label {
      position: relative;
      z-index: 1;
      font-size: 0.78rem;
      font-weight: 600;
      color: #334155;
    }
    .rfm-type-card.selected .rfm-type-label { color: currentColor; }

    .rfm-type-check {
      position: absolute;
      top: 8px; right: 8px;
      z-index: 2;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: currentColor;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      animation: rfm-pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    @keyframes rfm-pop {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }

    /* ============ LEVEL SEGMENTED ============ */
    .rfm-segment {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      padding: 4px;
      background: #f1f5f9;
      border-radius: 12px;
    }
    .rfm-seg-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 12px;
      border: none;
      border-radius: 9px;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 180ms ease;
      font-family: inherit;
    }
    .rfm-seg-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.5;
      transition: opacity 180ms ease;
    }
    .rfm-seg-btn:hover { background: rgba(255, 255, 255, 0.5); color: #334155; }
    .rfm-seg-btn.selected {
      background: #fff;
      color: var(--seg-color, #0f172a);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
    }
    .rfm-seg-btn.selected .rfm-seg-dot { opacity: 1; }
    .rfm-seg-btn.lvl-beginner.selected     { --seg-color: #16a34a; color: #16a34a; }
    .rfm-seg-btn.lvl-intermediate.selected { --seg-color: #d97706; color: #d97706; }
    .rfm-seg-btn.lvl-advanced.selected     { --seg-color: #dc2626; color: #dc2626; }

    /* ============ DROPZONE ============ */
    .rfm-dropzone {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 24px 16px;
      border: 2px dashed #cbd5e1;
      border-radius: 14px;
      background: linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%);
      text-align: center;
      transition: all 200ms ease;
    }
    .rfm-dropzone.rfm-dropzone-sm { padding: 16px 12px; }
    .rfm-dropzone:hover {
      border-color: #14b8a6;
      background: linear-gradient(180deg, #f0fdfa 0%, #ecfeff 100%);
    }
    .rfm-dropzone.drag-over {
      border-color: #14b8a6;
      border-style: solid;
      background: linear-gradient(180deg, #ccfbf1 0%, #cffafe 100%);
      transform: scale(1.01);
    }
    .rfm-dropzone.has-file {
      border-color: #14b8a6;
      border-style: solid;
      background: linear-gradient(180deg, #f0fdfa 0%, #ecfeff 100%);
    }
    .rfm-dropzone-icon {
      color: #14b8a6;
      margin-bottom: 2px;
      transition: transform 200ms ease;
    }
    .rfm-dropzone:hover .rfm-dropzone-icon,
    .rfm-dropzone.drag-over .rfm-dropzone-icon { transform: translateY(-3px); }
    .rfm-dropzone-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: #0f172a;
    }
    .rfm-dropzone-sub {
      font-size: 0.75rem;
      color: #64748b;
    }
    .rfm-dropzone-btn {
      margin-top: 6px;
      padding: 7px 18px;
      border-radius: 8px;
      background: #14b8a6;
      color: #fff;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 160ms ease;
      display: inline-block;
    }
    .rfm-dropzone-btn:hover { background: #0d9488; }
    .rfm-visually-hidden {
      position: absolute;
      width: 1px; height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
    }

    .rfm-file-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      margin-top: 8px;
      border-radius: 10px;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      font-size: 0.82rem;
      color: #0f766e;
    }
    .rfm-file-chip > svg { flex-shrink: 0; color: #14b8a6; }
    .rfm-file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .rfm-file-size {
      font-size: 0.72rem;
      color: #64748b;
      white-space: nowrap;
    }
    .rfm-upload-btn {
      padding: 5px 12px;
      border: none;
      border-radius: 7px;
      background: #14b8a6;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 160ms ease;
      font-family: inherit;
    }
    .rfm-upload-btn:hover:not(:disabled) { background: #0d9488; }
    .rfm-upload-btn:disabled { background: #94a3b8; cursor: not-allowed; }

    .rfm-upload-info {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 4px;
      font-style: italic;
    }

    /* ============ LIVE PREVIEW ASIDE ============ */
    .rfm-preview {
      padding: 28px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .rfm-preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 4px;
    }
    .rfm-preview-kicker {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: #64748b;
    }
    .rfm-preview-live-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
      animation: rfm-pulse-green 2s infinite;
    }
    @keyframes rfm-pulse-green {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
      70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    .rfm-preview-frame {
      border-radius: 18px;
      padding: 12px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6));
      box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
      backdrop-filter: blur(10px);
    }

    .rfm-preview-meta {
      padding: 14px 16px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rfm-preview-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rfm-preview-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .rfm-preview-value {
      font-size: 0.82rem;
      font-weight: 600;
      color: #0f172a;
    }
    .rfm-preview-bar {
      height: 6px;
      border-radius: 999px;
      background: #f1f5f9;
      overflow: hidden;
    }
    .rfm-preview-bar-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #14b8a6, #22d3ee);
      transition: width 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .rfm-preview-tips {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.78rem;
      color: #334155;
      padding: 8px 10px;
      border-radius: 9px;
      background: #fef9c3;
      border: 1px solid #fef08a;
    }
    .rfm-tip-icon { flex-shrink: 0; }
    .rfm-preview-ready {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 9px;
      background: #dcfce7;
      color: #15803d;
      font-size: 0.82rem;
      font-weight: 600;
      align-self: flex-start;
    }

    /* ============ FOOTER ============ */
    .rfm-footer {
      position: relative;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 32px;
      border-top: 1px solid #e2e8f0;
      background: #fff;
    }
    .rfm-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 180ms ease;
      font-family: inherit;
    }
    .rfm-btn-ghost {
      background: transparent;
      color: #475569;
      border: 1.5px solid #e2e8f0;
    }
    .rfm-btn-ghost:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .rfm-btn-primary {
      background: linear-gradient(135deg, #14b8a6, #0891b2);
      color: #fff;
      box-shadow: 0 6px 16px -4px rgba(20, 184, 166, 0.4);
    }
    .rfm-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #0d9488, #0e7490);
      transform: translateY(-1px);
      box-shadow: 0 8px 20px -4px rgba(20, 184, 166, 0.5);
    }
    .rfm-btn-primary:disabled {
      background: #cbd5e1;
      color: #fff;
      cursor: not-allowed;
      box-shadow: none;
    }
    .rfm-btn-primary.is-saving { animation: rfm-bounce 1.1s ease-in-out infinite; }
    @keyframes rfm-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    .rfm-btn-loading { display: inline-flex; align-items: center; gap: 8px; }

    .rfm-spinner {
      display: inline-block;
      width: 14px; height: 14px;
      border: 2px solid rgba(20, 184, 166, 0.25);
      border-top-color: #14b8a6;
      border-radius: 50%;
      animation: rfm-spin 0.7s linear infinite;
    }
    .rfm-spinner-light {
      border-color: rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
    }
    @keyframes rfm-spin { to { transform: rotate(360deg); } }

    .rfm-confetti {
      position: absolute;
      top: -20px;
      right: 32px;
      display: flex;
      gap: 8px;
      font-size: 1.4rem;
      animation: rfm-confetti 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
      pointer-events: none;
    }
    @keyframes rfm-confetti {
      0% { opacity: 0; transform: translateY(16px) scale(0.6); }
      40% { opacity: 1; transform: translateY(-10px) scale(1.2); }
      100% { opacity: 0; transform: translateY(-28px) scale(0.9); }
    }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 960px) {
      .rfm-body { grid-template-columns: 1fr; }
      .rfm-preview {
        border-top: 1px solid #e2e8f0;
        padding: 20px 24px;
      }
      .rfm-form { border-right: none; padding: 24px; }
      .rfm-shell { max-height: 96vh; }
    }
    @media (max-width: 640px) {
      .rfm-overlay { padding: 0; }
      .rfm-shell { border-radius: 0; max-height: 100vh; }
      .rfm-hero { padding: 24px 20px 20px; }
      .rfm-hero-title { font-size: 1.5rem; }
      .rfm-row { grid-template-columns: 1fr; }
      .rfm-type-grid { grid-template-columns: repeat(3, 1fr); }
      .rfm-footer { padding: 14px 20px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .rfm-orb-1, .rfm-orb-2, .rfm-pulse-dot, .rfm-preview-live-dot { animation: none; }
      .rfm-type-card, .rfm-btn-primary, .rfm-dropzone, .rfm-close { transition: none; }
    }
  `]
})
export class ResourceFormModalComponent implements OnInit, OnChanges {
  showConfetti = false;
  @Input() isOpen = false;
  @Input() resource?: ResourceApiResponse;
  @Output() closed = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private resourceApi = inject(ResourceApiService);

  form: FormGroup;
  categories: CategoryApiResponse[] = [];
  categoriesLoadError = '';
  isSeedingCategories = false;
  private autoSeedAttempted = false;
  readonly industries = [
    'TECHNOLOGY',
    'FINANCE',
    'HEALTHCARE',
    'EDUCATION',
    'MARKETING',
    'ENGINEERING',
    'LEGAL',
    'CONSULTING',
    'MEDIA',
    'OTHER',
  ];
  isSubmitting = false;
  isEdit = false;
  isComposing = false;
  isAutoClassifying = false;
  autoClassifyFlash = '';
  private autoClassifyFlashTimer: ReturnType<typeof setTimeout> | null = null;

  // Duplicate detection state
  duplicatesFound: { resource: ResourceApiResponse; similarity: number }[] = [];
  isCheckingDuplicates = false;
  private duplicateCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DUPLICATE_SCORE_THRESHOLD = 25; // only show items above this score
  formSubmitted = false;
  formError = '';
  selectedResourceFile: File | null = null;
  selectedThumbnailFile: File | null = null;
  isUploadingResourceFile = false;
  isUploadingThumbnailFile = false;
  resourceUploadInfo = '';
  thumbnailUploadInfo = '';
  isResourceDragOver = false;
  isThumbnailDragOver = false;

  get invalidFieldNames(): string[] {
    const names: Record<string, string> = {
      title: 'title',
      description: 'description',
      type: 'type',
      level: 'level',
      url: 'url',
      thumbUrl: 'thumbnail url',
    };

    return Object.keys(this.form.controls)
      .filter((k) => this.form.controls[k].invalid)
      .map((k) => names[k] || k);
  }

  get formCompletionPercent(): number {
    const values = this.form.value;
    let score = 0;

    if (this.form.get('title')?.valid) {
      score += 14;
    }
    if ((values.title || '').trim().length >= 12) {
      score += 3;
    }

    if (this.form.get('description')?.valid) {
      score += 16;
    }
    if ((values.description || '').trim().length >= 40) {
      score += 4;
    }

    if (this.form.get('type')?.valid) {
      score += 10;
    }
    if (this.form.get('level')?.valid) {
      score += 10;
    }
    if ((values.categoryId || '').trim().length > 0 && this.form.get('categoryId')?.valid) {
      score += 10;
    }
    if (this.form.get('url')?.valid) {
      score += 20;
    }
    if ((values.industry || '').trim().length > 0) {
      score += 3;
    }
    if ((values.thumbUrl || '').trim().length > 0 && this.form.get('thumbUrl')?.valid) {
      score += 5;
    }
    if (this.resourceUploadInfo.startsWith('Uploaded:')) {
      score += 3;
    }
    if (this.thumbnailUploadInfo.startsWith('Uploaded:')) {
      score += 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  get formCompletionLabel(): string {
    const pct = this.formCompletionPercent;
    if (pct >= 90) {
      return 'Ready to publish with strong metadata.';
    }
    if (pct >= 70) {
      return 'Almost done. Final checks before publishing.';
    }
    if (pct >= 45) {
      return 'Good start. Add more details to improve quality.';
    }
    return 'Start by filling required fields and URL.';
  }

  constructor() {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      type: ['', Validators.required],
      level: ['', Validators.required],
      categoryId: [''],
      industry: ['TECHNOLOGY'],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      thumbUrl: ['', [Validators.pattern(/^(|https?:\/\/.+)$/)]],
    });

    // Debounced duplicate check whenever title or description change (create mode only).
    this.form.get('title')?.valueChanges.subscribe(() => this.scheduleDuplicateCheck());
    this.form.get('description')?.valueChanges.subscribe(() => this.scheduleDuplicateCheck());
  }

  private scheduleDuplicateCheck(): void {
    if (this.isEdit) return;
    if (this.duplicateCheckTimer) clearTimeout(this.duplicateCheckTimer);
    this.duplicateCheckTimer = setTimeout(() => this.runDuplicateCheck(), 600);
  }

  private runDuplicateCheck(): void {
    const title = (this.form.value.title || '').trim();
    const description = (this.form.value.description || '').trim();
    if (title.length < 6) { this.duplicatesFound = []; return; }
    this.isCheckingDuplicates = true;
    this.resourceApi.checkDuplicate(title, description).subscribe({
      next: (results) => {
        this.duplicatesFound = (results || [])
          .filter((r) => r && r.similarity >= this.DUPLICATE_SCORE_THRESHOLD && r.resource)
          .slice(0, 3);
        this.isCheckingDuplicates = false;
      },
      error: () => { this.duplicatesFound = []; this.isCheckingDuplicates = false; },
    });
  }

  ngOnInit(): void {
    // Categories are reloaded on open in ngOnChanges to keep it fresh.
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen'] && !changes['resource']) {
      return;
    }

    this.formError = '';
    this.formSubmitted = false;
    this.categoriesLoadError = '';
    this.autoSeedAttempted = false;
    this.isUploadingResourceFile = false;
    this.isUploadingThumbnailFile = false;
    this.selectedResourceFile = null;
    this.selectedThumbnailFile = null;
    this.resourceUploadInfo = '';
    this.thumbnailUploadInfo = '';

    if (this.isOpen) {
      this.loadCategories();
    }

    if (this.isOpen && this.resource) {
      this.isEdit = true;
      this.form.patchValue({
        title: this.resource.title,
        description: this.resource.description,
        type: this.resource.type,
        level: this.resource.level,
        categoryId: this.resource.categoryId,
        industry: this.resource.industry,
        url: this.resource.url,
        thumbUrl: this.resource.thumbUrl,
      });
      return;
    }

    if (this.isOpen && !this.resource) {
      this.isEdit = false;
      this.form.reset({
        title: '',
        description: '',
        type: '',
        level: '',
        categoryId: '',
        industry: 'TECHNOLOGY',
        url: '',
        thumbUrl: '',
      });
    }
  }

  loadCategories(): void {
    this.resourceApi.getCategories().pipe(
      catchError((err) => {
        const message = err?.error?.message || 'Unable to load categories. Is resource-service running on http://localhost:8087 ?';
        this.categoriesLoadError = message;
        return of([]);
      })
    ).subscribe(cats => {
      this.categories = cats;
      if (this.isOpen && !this.isEdit && cats.length > 0) {
        const current = this.form.get('categoryId')?.value;
        if (!current) {
          this.form.patchValue({ categoryId: cats[0].id });
        }
      }

      if (this.isOpen && !this.isEdit && cats.length === 0 && !this.categoriesLoadError && !this.autoSeedAttempted) {
        this.autoSeedAttempted = true;
        this.seedDefaultCategories();
      }
    });
  }

  seedDefaultCategories(): void {
    if (this.isSeedingCategories) {
      return;
    }

    this.isSeedingCategories = true;
    this.categoriesLoadError = '';
    this.resourceApi.seedStatic(false).pipe(
      catchError((err) => {
        const message = err?.error?.message || 'Failed to seed categories.';
        this.categoriesLoadError = message;
        this.isSeedingCategories = false;
        return of(null);
      })
    ).subscribe((result) => {
      this.isSeedingCategories = false;
      if (!result) {
        return;
      }
      this.loadCategories();
    });
  }

  submit(): void {
    this.formSubmitted = true;
    this.formError = '';
    if (!this.form.valid) return;

    this.isSubmitting = true;
    const formValue = this.form.value;
    const payload = {
      ...formValue,
      categoryId: (formValue.categoryId || '').toString().trim() || null,
    };
    const operation = this.isEdit && this.resource
      ? this.resourceApi.updateResource(this.resource.id, payload)
      : this.resourceApi.createResource(payload);

    operation.pipe(
      catchError(err => {
        this.formError = err.error?.message || 'Failed to save resource. Please verify all fields and try again.';
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe((result) => {
      if (!result) {
        return;
      }
      this.isSubmitting = false;
      this.showConfetti = true;
      setTimeout(() => {
        this.showConfetti = false;
        this.closed.emit({ success: true, mode: this.isEdit ? 'edit' : 'create', resource: result });
      }, 1200);
    });
  }

  onResourceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedResourceFile = input.files && input.files.length > 0 ? input.files[0] : null;
    this.resourceUploadInfo = this.selectedResourceFile ? `Selected: ${this.selectedResourceFile.name}` : '';
    if (this.selectedResourceFile) {
      this.uploadResourceFile();
    }
  }

  onThumbnailFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedThumbnailFile = input.files && input.files.length > 0 ? input.files[0] : null;
    this.thumbnailUploadInfo = this.selectedThumbnailFile ? `Selected: ${this.selectedThumbnailFile.name}` : '';
    if (this.selectedThumbnailFile) {
      this.uploadThumbnailFile();
    }
  }

  onResourceDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isResourceDragOver = true;
  }

  onResourceDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isResourceDragOver = false;
  }

  onResourceDrop(event: DragEvent): void {
    event.preventDefault();
    this.isResourceDragOver = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.selectedResourceFile = file;
    this.resourceUploadInfo = file ? `Selected: ${file.name}` : '';
    if (file) {
      this.uploadResourceFile();
    }
  }

  onThumbnailDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isThumbnailDragOver = true;
  }

  onThumbnailDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isThumbnailDragOver = false;
  }

  onThumbnailDrop(event: DragEvent): void {
    event.preventDefault();
    this.isThumbnailDragOver = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.selectedThumbnailFile = file;
    this.thumbnailUploadInfo = file ? `Selected: ${file.name}` : '';
    if (file) {
      this.uploadThumbnailFile();
    }
  }

  private static readonly MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

  uploadResourceFile(): void {
    if (!this.selectedResourceFile) {
      return;
    }
    if (this.selectedResourceFile.size > ResourceFormModalComponent.MAX_UPLOAD_BYTES) {
      this.formError = 'Le fichier dépasse la limite de 250 MB.';
      this.selectedResourceFile = null;
      return;
    }

    this.formError = '';
    this.isUploadingResourceFile = true;
    this.resourceApi.uploadResourceFile(this.selectedResourceFile, 'resource').pipe(
      catchError(err => {
        this.formError = err.error?.message || 'Failed to upload resource file.';
        this.isUploadingResourceFile = false;
        return of(null);
      })
    ).subscribe((result: FileUploadApiResponse | null) => {
      if (!result) {
        return;
      }
      this.form.patchValue({ url: result.fileUrl });
      this.resourceUploadInfo = `Uploaded: ${result.originalFileName}`;
      this.isUploadingResourceFile = false;
    });
  }

  uploadThumbnailFile(): void {
    if (!this.selectedThumbnailFile) {
      return;
    }
    if (this.selectedThumbnailFile.size > ResourceFormModalComponent.MAX_UPLOAD_BYTES) {
      this.formError = 'Le fichier dépasse la limite de 250 MB.';
      this.selectedThumbnailFile = null;
      return;
    }

    this.formError = '';
    this.isUploadingThumbnailFile = true;
    this.resourceApi.uploadResourceFile(this.selectedThumbnailFile, 'thumbnail').pipe(
      catchError(err => {
        this.formError = err.error?.message || 'Failed to upload thumbnail image.';
        this.isUploadingThumbnailFile = false;
        return of(null);
      })
    ).subscribe((result: FileUploadApiResponse | null) => {
      if (!result) {
        return;
      }
      this.form.patchValue({ thumbUrl: result.fileUrl });
      this.thumbnailUploadInfo = `Uploaded: ${result.originalFileName}`;
      this.isUploadingThumbnailFile = false;
    });
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.form.get(controlName);
    if (!control) return false;
    return control.hasError(errorName) && (control.touched || this.formSubmitted);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  close(): void {
    this.isUploadingResourceFile = false;
    this.isUploadingThumbnailFile = false;
    this.duplicatesFound = [];
    if (this.duplicateCheckTimer) { clearTimeout(this.duplicateCheckTimer); this.duplicateCheckTimer = null; }
    this.closed.emit({ cancelled: true });
  }

  tryClose(): void {
    if (this.isSubmitting || this.isUploadingResourceFile || this.isUploadingThumbnailFile) {
      return;
    }
    if (this.form.dirty && !this.isEdit) {
      const ok = confirm('Modifications non enregistrées. Quitter quand même ?');
      if (!ok) return;
    }
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.tryClose();
  }

  isSectionComplete(section: 'basics' | 'classification' | 'media'): boolean {
    if (section === 'basics') {
      return !!this.form.get('title')?.valid && !!this.form.get('description')?.valid;
    }
    if (section === 'classification') {
      return !!this.form.get('type')?.valid && !!this.form.get('level')?.valid;
    }
    if (section === 'media') {
      return !!this.form.get('url')?.valid;
    }
    return false;
  }

  get completedSectionsCount(): number {
    let n = 0;
    if (this.isSectionComplete('basics')) n++;
    if (this.isSectionComplete('classification')) n++;
    if (this.isSectionComplete('media')) n++;
    return n;
  }

  /** Client-side AI compose: drafts a description from title + type + level + category. */
  composeDescription(): void {
    const title = (this.form.value.title || '').trim();
    if (!title || this.isComposing) return;
    this.isComposing = true;

    const type = this.form.value.type || 'ARTICLE';
    const level = this.form.value.level || 'INTERMEDIATE';
    const catName = this.categories.find(c => c.id === this.form.value.categoryId)?.name || '';
    const industry = (this.form.value.industry || '').toString().toLowerCase();

    const typeLabel: Record<string, string> = {
      ARTICLE: 'cet article',
      VIDEO: 'cette vidéo',
      PODCAST: 'ce podcast',
      QUIZ: 'cet exercice',
      BOOK: 'ce contenu',
    };
    const levelLabel: Record<string, string> = {
      BEGINNER: 'débutants qui souhaitent poser les bases',
      INTERMEDIATE: 'praticiens intermédiaires qui veulent consolider leurs acquis',
      ADVANCED: 'professionnels expérimentés cherchant à approfondir les cas limites',
    };
    const angles = [
      `Dans ${typeLabel[type]}, découvrez ${title.toLowerCase()} à travers des exemples concrets et des pistes d'application immédiates.`,
      `${this.capitalize(title)} — un guide structuré pensé pour les ${levelLabel[level]}.`,
      `Explorez ${title.toLowerCase()} : concepts essentiels, bonnes pratiques et écueils fréquents à éviter.`,
    ];
    const angle = angles[Math.floor(Math.random() * angles.length)];

    const closers = [
      `Vous repartirez avec une checklist d'actions concrètes${catName ? ' pour progresser dans ' + catName.toLowerCase() : ''}.`,
      `Le format est pensé pour tenir en une seule session et stimuler la mise en pratique${industry ? ' dans le domaine ' + industry.toLowerCase() : ''}.`,
      `L'approche combine théorie accessible et retours d'expérience du terrain pour ancrer les apprentissages.`,
    ];
    const closer = closers[Math.floor(Math.random() * closers.length)];

    const composed = `${angle} ${closer}`;

    // Brief "thinking" delay so it feels crafted, not instant paste
    setTimeout(() => {
      this.form.patchValue({ description: composed });
      this.form.get('description')?.markAsDirty();
      this.form.get('description')?.markAsTouched();
      this.isComposing = false;
    }, 600);
  }

  private capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /**
   * 1-click AI classification: sends the title + current description to the backend,
   * which returns a complete classification (type, level, industry, category, description, tags).
   * The admin keeps full control — they can review and tweak any field before saving.
   */
  autoClassify(): void {
    const title = (this.form.value.title || '').trim();
    if (!title || title.length < 3 || this.isAutoClassifying) return;
    this.isAutoClassifying = true;
    this.autoClassifyFlash = '';
    const existingDesc = (this.form.value.description || '').trim();

    this.resourceApi.classifyResource(title, existingDesc).subscribe({
      next: (c) => {
        const patch: any = {};
        if (c.type) patch.type = c.type;
        if (c.level) patch.level = c.level;
        if (c.industry) patch.industry = c.industry;
        if (c.categoryId) patch.categoryId = c.categoryId;
        // Only overwrite description if empty — preserves existing hand-written content
        if (!existingDesc && c.description) patch.description = c.description;
        this.form.patchValue(patch);
        ['type', 'level', 'industry', 'categoryId', 'description'].forEach((k) => {
          this.form.get(k)?.markAsDirty();
          this.form.get(k)?.markAsTouched();
        });
        const provider = c.provider === 'ollama' ? 'llama3' : 'IA';
        const fieldCount = Object.keys(patch).length;
        this.autoClassifyFlash = `✓ ${fieldCount} champ${fieldCount > 1 ? 's' : ''} rempli${fieldCount > 1 ? 's' : ''} par ${provider}`;
        if (this.autoClassifyFlashTimer) clearTimeout(this.autoClassifyFlashTimer);
        this.autoClassifyFlashTimer = setTimeout(() => (this.autoClassifyFlash = ''), 4000);
        this.isAutoClassifying = false;
      },
      error: () => {
        this.isAutoClassifying = false;
        this.autoClassifyFlash = '⚠ Classification IA indisponible';
        if (this.autoClassifyFlashTimer) clearTimeout(this.autoClassifyFlashTimer);
        this.autoClassifyFlashTimer = setTimeout(() => (this.autoClassifyFlash = ''), 3500);
      },
    });
  }

  readonly typeOptions = [
    { key: 'article',  apiValue: 'ARTICLE', label: 'Article',   emoji: '📄' },
    { key: 'video',    apiValue: 'VIDEO',   label: 'Vidéo',     emoji: '🎬' },
    { key: 'podcast',  apiValue: 'PODCAST', label: 'Podcast',   emoji: '🎙️' },
    { key: 'exercise', apiValue: 'QUIZ',    label: 'Exercice',  emoji: '💪' },
    { key: 'template', apiValue: 'BOOK',    label: 'Modèle',    emoji: '📋' },
  ];

  selectType(apiValue: string): void {
    this.form.patchValue({ type: apiValue });
    this.form.get('type')?.markAsDirty();
    this.form.get('type')?.markAsTouched();
  }

  selectLevel(apiValue: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'): void {
    this.form.patchValue({ level: apiValue });
    this.form.get('level')?.markAsDirty();
    this.form.get('level')?.markAsTouched();
  }

  get previewResource(): Resource {
    const v = this.form.value;
    const apiType = (v.type || 'ARTICLE').toUpperCase();
    const modelType: Resource['type'] =
      apiType === 'VIDEO' ? 'video' :
      apiType === 'PODCAST' ? 'podcast' :
      apiType === 'QUIZ' ? 'exercise' :
      apiType === 'BOOK' ? 'template' :
      'article';
    const apiLevel = (v.level || 'INTERMEDIATE').toUpperCase();
    const modelLevel: Resource['level'] =
      apiLevel === 'BEGINNER' ? 'beginner' :
      apiLevel === 'ADVANCED' ? 'advanced' :
      'intermediate';
    const categoryName = this.categories.find(c => c.id === v.categoryId)?.name || 'Général';
    return {
      id: 'preview',
      title: (v.title || '').trim() || 'Titre de votre ressource',
      url: v.url || undefined,
      thumbnailUrl: v.thumbUrl || undefined,
      type: modelType,
      category: categoryName,
      duration: '—',
      level: modelLevel,
      tags: [v.industry, categoryName].filter(Boolean) as string[],
      saved: false,
      views: 0,
      rating: 5.0,
      description: (v.description || '').trim() || 'La description apparaîtra ici au fur et à mesure que vous la rédigez.',
    };
  }

  get nextStepHint(): string {
    if (!this.isSectionComplete('basics')) return 'Commencez par un titre et une description percutants.';
    if (!this.isSectionComplete('classification')) return 'Choisissez le type et le niveau pour aider les apprenants à vous trouver.';
    if (!this.isSectionComplete('media')) return 'Ajoutez le lien de la ressource — la miniature est optionnelle mais recommandée.';
    return '';
  }
}
