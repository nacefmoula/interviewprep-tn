import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';

/**
 * <app-input> — design-system input primitive with ControlValueAccessor support.
 *
 * Examples:
 *   <app-input [(ngModel)]="email" type="email" label="Email" placeholder="you@example.com"></app-input>
 *   <app-input [(ngModel)]="name" label="Name" hint="Use your full name" required></app-input>
 *   <app-input [(ngModel)]="pw" type="password" label="Password" [errorMessage]="passwordError"></app-input>
 */
@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <label class="ui-field" [class.has-error]="!!errorMessage" [attr.data-size]="size">
      <span class="ui-field__label" *ngIf="label">
        {{ label }}
        <span class="ui-field__required" *ngIf="required" aria-hidden="true">*</span>
      </span>

      <span class="ui-field__control">
        <span class="ui-field__icon ui-field__icon--leading" *ngIf="leadingIcon" [innerHTML]="leadingIcon"></span>
        <input
          class="ui-field__input"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [required]="required"
          [readonly]="readonly"
          [attr.autocomplete]="autocomplete"
          [(ngModel)]="value"
          (ngModelChange)="onValueChange($event)"
          (blur)="onBlur()"
        />
        <span class="ui-field__icon ui-field__icon--trailing" *ngIf="trailingIcon" [innerHTML]="trailingIcon"></span>
      </span>

      <span class="ui-field__hint" *ngIf="hint && !errorMessage">{{ hint }}</span>
      <span class="ui-field__error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</span>
    </label>
  `,
  styles: [`
    .ui-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      font-family: var(--font-body);
      color: var(--color-text);
    }
    .ui-field__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text);
      letter-spacing: -0.005em;
    }
    .ui-field__required {
      color: var(--error-500);
      margin-left: 2px;
    }

    .ui-field__control {
      display: flex;
      align-items: center;
      background: var(--surface-sunken, var(--color-bg-alt));
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition:
        border-color var(--duration-fast) var(--ease-out),
        background var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);
    }
    .ui-field__control:hover {
      border-color: var(--color-border);
      background: var(--color-surface);
    }
    .ui-field__control:focus-within {
      border-color: var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 0 0 3px var(--ring-color);
    }

    .ui-field__input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: 0;
      outline: none;
      color: var(--color-text);
      font-family: inherit;
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
      padding: 0.625rem 0.875rem;
    }
    .ui-field__input::placeholder { color: var(--color-text-light); }
    .ui-field__input:disabled { cursor: not-allowed; opacity: 0.6; }

    .ui-field__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-muted);
      font-size: 1.05em;
      padding: 0 0.5rem;
      pointer-events: none;
    }
    .ui-field__icon--leading { padding-left: 0.75rem; padding-right: 0; }
    .ui-field__icon--trailing { padding-left: 0; padding-right: 0.75rem; }

    /* Sizes */
    .ui-field[data-size="sm"] .ui-field__input { padding: 0.4rem 0.7rem; font-size: var(--text-xs); }
    .ui-field[data-size="lg"] .ui-field__input { padding: 0.85rem 1rem; font-size: var(--text-base); }

    /* Error */
    .ui-field.has-error .ui-field__control {
      border-color: var(--error-500);
      background: var(--color-surface);
    }
    .ui-field.has-error .ui-field__control:focus-within {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18);
    }
    .ui-field__hint {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .ui-field__error {
      font-size: var(--text-xs);
      color: var(--error-500);
      font-weight: var(--weight-medium);
    }
  `],
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() errorMessage = '';
  @Input() type: InputType = 'text';
  @Input() size: InputSize = 'md';
  @Input() disabled = false;
  @Input() required = false;
  @Input() readonly = false;
  @Input() autocomplete = 'off';
  @Input() leadingIcon = '';
  @Input() trailingIcon = '';

  @Output() valueChange = new EventEmitter<string>();

  value = '';

  // ControlValueAccessor
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: string): void { this.value = val ?? ''; }
  registerOnChange(fn: (val: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  onValueChange(val: string) {
    this.value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }
  onBlur() { this.onTouched(); }
}
