import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { QuizService } from '../../core/services/quiz.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-quiz-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="quiz-container">
      <header class="header">
        <a routerLink="/admin" class="back-link">← Retour au tableau de bord</a>
        <h1>Créer un Quiz</h1>
      </header>

      <form [formGroup]="quizForm" (ngSubmit)="onSubmit()">
        
        <div class="card" [class.card-invalid]="quizForm.get('title')?.invalid && quizForm.get('title')?.touched">
          <input formControlName="title" placeholder="Titre du quiz *" class="input-title"
                 [class.is-invalid]="quizForm.get('title')?.invalid && quizForm.get('title')?.touched">
          <div class="error-text" *ngIf="quizForm.get('title')?.invalid && quizForm.get('title')?.touched">Le titre est obligatoire (min. 3 caractères).</div>

          <textarea formControlName="description" placeholder="Description courte..." class="input-desc" rows="2"></textarea>
          
          <div class="grid-3">
            <div class="form-group">
              <label>Catégorie *</label>
              <input formControlName="category" placeholder="Ex: Java, Spring..." class="form-control"
                     [class.is-invalid]="quizForm.get('category')?.invalid && quizForm.get('category')?.touched">
              <div class="error-text" *ngIf="quizForm.get('category')?.invalid && quizForm.get('category')?.touched">Requis.</div>
            </div>
            <div class="form-group">
              <label>Temps (min)</label>
              <input formControlName="timeLimit" type="number" class="form-control"
                     [class.is-invalid]="quizForm.get('timeLimit')?.invalid && quizForm.get('timeLimit')?.touched">
            </div>
            <div class="form-group">
              <label>Difficulté</label>
              <select formControlName="difficulty" class="form-control">
                <option value="EASY">Facile</option>
                <option value="MEDIUM">Moyen</option>
                <option value="HARD">Difficile</option>
              </select>
            </div>
          </div>
        </div>

        <div formArrayName="questions">
          @for (q of questions.controls; let qIndex = $index; track qIndex) {
            <div [formGroupName]="qIndex" class="card question-card" 
                 [class.card-invalid]="q.invalid && q.touched">
              
              <button type="button" (click)="removeQuestion(qIndex)" class="btn-delete-q">✕ Supprimer la question</button>
              
              <div class="question-header">
                <span class="question-number">{{ qIndex + 1 }}</span>
                <div style="flex: 1;">
                  <input formControlName="content" placeholder="Saisissez la question ici... *" class="input-question"
                         [class.is-invalid]="q.get('content')?.invalid && q.get('content')?.touched">
                  <div class="error-text" *ngIf="q.get('content')?.invalid && q.get('content')?.touched">La question ne peut pas être vide.</div>
                </div>
              </div>

              <div class="grid-2 grey-box">
                <div class="form-group">
                  <label>Type de question</label>
                  <select formControlName="type" (change)="onTypeChange(qIndex)" class="form-control">
                    <option value="SINGLE_CHOICE">Choix Unique</option>
                    <option value="MULTIPLE_CHOICE">Choix Multiple</option>
                    <option value="TRUE_FALSE">Vrai ou Faux</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Explication de la réponse *</label>
                  <input formControlName="explanation" placeholder="Sera affichée à la correction" class="form-control"
                         [class.is-invalid]="q.get('explanation')?.invalid && q.get('explanation')?.touched">
                  <div class="error-text" *ngIf="q.get('explanation')?.invalid && q.get('explanation')?.touched">L'explication est requise.</div>
                </div>
              </div>

              <div class="answers-section">
                <div class="answers-header">
                  <label>Propositions de réponses</label>
                  <button *ngIf="q.get('type')?.value !== 'TRUE_FALSE'" type="button" (click)="addAnswer(qIndex)" class="btn-add-answer">
                    + Ajouter une option
                  </button>
                </div>
                
                <div formArrayName="answers" class="answers-list">
                  @for (a of getAnswers(qIndex).controls; let aIndex = $index; track aIndex) {
                    <div [formGroupName]="aIndex" class="answer-item">
                      
                      <input 
                        [type]="q.get('type')?.value === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'" 
                        [name]="'correct_answer_' + qIndex + (q.get('type')?.value === 'MULTIPLE_CHOICE' ? '_' + aIndex : '')"
                        formControlName="correct" 
                        (change)="onCorrectAnswerChange(qIndex, aIndex)"
                        class="check-input">
                      
                      <div style="flex: 1;">
                        <input formControlName="content" 
                               [readonly]="q.get('type')?.value === 'TRUE_FALSE'"
                               placeholder="Texte de l'option..." 
                               class="form-control flex-1"
                               [class.correct-answer]="a.get('correct')?.value"
                               [class.readonly-input]="q.get('type')?.value === 'TRUE_FALSE'"
                               [class.is-invalid]="a.get('content')?.invalid && a.get('content')?.touched">
                      </div>
                               
                      <button *ngIf="q.get('type')?.value !== 'TRUE_FALSE'" type="button" (click)="removeAnswer(qIndex, aIndex)" class="btn-delete-a">✕</button>
                    </div>
                  }
                </div>
              </div>

            </div>
          }
        </div>

        <button type="button" (click)="addQuestion()" class="btn-add-question">
          + Ajouter une nouvelle question
        </button>

        <div class="footer-actions">
          <button type="submit" [disabled]="isSubmitting" class="btn-submit">
            {{ isSubmitting ? 'Création en cours...' : '✅ ENREGISTRER LE QUIZ' }}
          </button>
        </div>
      </form>
      <div class="modal-overlay" *ngIf="showSuccessModal">
  <div class="modal-card animate-pop">
    <div class="modal-icon-tick">
      <svg viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="25" fill="none"/>
        <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
      </svg>
    </div>
    <h2>Quiz créé !</h2>
    <p>Votre quiz a été enregistré avec succès.</p>
    <button class="btn-blue-modal" (click)="goToDashboard()">Continuer</button>
  </div>
</div>
    </div>
  `,
  styles: [`
  /* --- STYLES DE LA MODALE --- */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.modal-card {
  background: white; padding: 2.5rem; border-radius: 20px;
  max-width: 400px; width: 90%; text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
}
.modal-icon-tick { width: 80px; height: 80px; margin: 0 auto 1.5rem; }
.modal-icon-tick circle { stroke: #0ea5e9; stroke-width: 2; fill: none; stroke-dasharray: 166; stroke-dashoffset: 166; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
.modal-icon-tick path { stroke: #0ea5e9; stroke-width: 3; fill: none; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }

.btn-blue-modal { 
  background: #0ea5e9; color: white; padding: 0.8rem 2rem; 
  border: none; border-radius: 10px; font-weight: 600; cursor: pointer; 
}
.animate-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes stroke { 100% { stroke-dashoffset: 0; } }
@keyframes pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    /* TES STYLES ORIGINAUX CONSERVÉS */
    .quiz-container { max-width: 900px; margin: 2rem auto; padding: 0 1rem; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
    .header { margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; color: #1f2937; margin-top: 0.5rem; }
    .back-link { color: #0d9488; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
    .back-link:hover { text-decoration: underline; }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; margin-bottom: 2rem; }
    .question-card { position: relative; border-top: 4px solid #0d9488; }
    .input-title { width: 100%; font-size: 1.5rem; font-weight: bold; border: none; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 1rem; outline: none; }
    .input-title:focus { border-bottom-color: #0d9488; }
    .input-desc { width: 100%; font-size: 1rem; color: #4b5563; border: none; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; outline: none; resize: vertical; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group label { display: block; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 0.5rem; }
    .form-control { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; outline: none; box-sizing: border-box; }
    .question-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .question-number { background: #0d9488; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; flex-shrink: 0; }
    .input-question { flex: 1; font-size: 1.2rem; font-weight: 600; border: none; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.25rem; outline: none; }
    .grey-box { background: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #f3f4f6; }
    .btn-add-answer { background: none; border: none; color: #0d9488; font-weight: bold; cursor: pointer; font-size: 0.9rem; }
    .answer-item { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
    .check-input { width: 20px; height: 20px; cursor: pointer; accent-color: #0d9488; }
    .correct-answer { border-color: #10b981 !important; background-color: #ecfdf5; }
    .readonly-input { background-color: #f3f4f6; color: #6b7280; font-weight: bold; }
    .btn-delete-q { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer; font-size: 0.8rem; }
    .btn-delete-a { background: none; border: none; color: #9ca3af; font-weight: bold; cursor: pointer; font-size: 1.2rem; padding: 0 0.5rem; }
    .btn-add-question { width: 100%; padding: 1.25rem; background: transparent; border: 2px dashed #d1d5db; border-radius: 12px; color: #6b7280; font-weight: bold; cursor: pointer; margin-bottom: 2rem; }
    .btn-submit { background: #0d9488; color: white; padding: 1.2rem 3rem; border: none; border-radius: 8px; font-size: 1.2rem; font-weight: bold; cursor: pointer; }
    .footer-actions { display: flex; justify-content: flex-end; padding-bottom: 3rem; margin-top: 1rem; border-top: 1px solid #e5e7eb; padding-top: 2rem;}

    /* STYLES AJOUTÉS POUR LE CONTRÔLE DE SAISIE */
    .is-invalid { border: 1.5px solid #ef4444 !important; }
    .card-invalid { border-left: 5px solid #ef4444 !important; }
    .error-text { color: #ef4444; font-size: 0.7rem; font-weight: bold; margin-top: 3px; }
  `]
})
export class QuizFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private quizService = inject(QuizService);
  private router = inject(Router);

  isSubmitting = false;
  showSuccessModal = false; // <--- AJOUTE CETTE LIGNE ICI

  quizForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    category: ['', Validators.required],
    timeLimit: [20, [Validators.required, Validators.min(1)]],
    difficulty: ['MEDIUM'],
    questions: this.fb.array([])
  });

  ngOnInit() {
    this.addQuestion();
  }

  get questions() { return this.quizForm.get('questions') as FormArray; }
  getAnswers(questionIndex: number) { return this.questions.at(questionIndex).get('answers') as FormArray; }

  addQuestion() {
    const questionGroup = this.fb.group({
      content: ['', Validators.required],
      type: ['SINGLE_CHOICE'],
      explanation: ['', Validators.required],
      points: [1],
      answers: this.fb.array([
        this.createAnswer('', true),
        this.createAnswer('', false)
      ])
    });
    this.questions.push(questionGroup);
  }

  removeQuestion(index: number) { this.questions.removeAt(index); }

  onTypeChange(qIndex: number) {
    const type = this.questions.at(qIndex).get('type')?.value;
    const answersArray = this.getAnswers(qIndex);
    while (answersArray.length !== 0) answersArray.removeAt(0);

    if (type === 'TRUE_FALSE') {
      answersArray.push(this.createAnswer('Vrai', true));
      answersArray.push(this.createAnswer('Faux', false));
    } else {
      answersArray.push(this.createAnswer('', true));
      answersArray.push(this.createAnswer('', false));
    }
  }

  onCorrectAnswerChange(qIndex: number, aIndex: number) {
    const type = this.questions.at(qIndex).get('type')?.value;
    const answersArray = this.getAnswers(qIndex);
    if (type === 'SINGLE_CHOICE' || type === 'TRUE_FALSE') {
      for (let i = 0; i < answersArray.length; i++) {
        if (i !== aIndex) answersArray.at(i).get('correct')?.setValue(false, { emitEvent: false });
      }
    }
  }

  createAnswer(content: string = '', isCorrect: boolean = false): FormGroup {
    return this.fb.group({
      content: [content, Validators.required],
      correct: [isCorrect]
    });
  }

  addAnswer(questionIndex: number) { this.getAnswers(questionIndex).push(this.createAnswer()); }
  removeAnswer(questionIndex: number, answerIndex: number) { this.getAnswers(questionIndex).removeAt(answerIndex); }

  onSubmit() {
    if (this.quizForm.invalid) {
      this.quizForm.markAllAsTouched(); // Force l'affichage des erreurs
      
      return;
    }

    this.isSubmitting = true;
    this.quizService.createQuiz(this.quizForm.value).subscribe({
      next: () => {
       
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showSuccessModal = true; // <--- C'EST ÇA QUI FAIT APPARAÎTRE LE POP-UP !
      }
    });
  }


  goToDashboard() {
  this.showSuccessModal = false;
  this.router.navigate(['/admin']);
}
}