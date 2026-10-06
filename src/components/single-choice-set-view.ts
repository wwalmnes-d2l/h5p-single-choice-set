import { LitElement, PropertyValues, html, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { SingleChoiceSetModel } from '../domain/model';
import type { ChoiceAnsweredDetail, ChoiceState, ResultRow, ViewState } from '../domain/types';

const emit = <T>(target: EventTarget, name: string, detail?: T): void => {
  target.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
};

export class SingleChoiceSetView extends LitElement {
  static properties = {
    model: { attribute: false },
    revision: { state: true },
  };

  declare model: SingleChoiceSetModel;
  declare revision: number;

  private finishTimer?: number;
  private continueTimer?: number;
  private waitingForContinue = false;
  private navigation?: H5PNavigation;
  private measuredHeight = 0;

  constructor() {
    super();
    this.revision = 0;
  }

  createRenderRoot(): HTMLElement {
    return this;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearTimers();
  }

  refresh(): void {
    this.revision += 1;
  }

  updated(): void {
    this.updateNavigation();
    window.requestAnimationFrame(() => this.updateLayout());
  }

  focusCurrentAlternative(): void {
    void this.updateComplete.then(() => {
      this.querySelector<HTMLElement>('.h5p-sc-current-slide .h5p-sc-alternative:not([aria-disabled="true"])')?.focus();
    });
  }

  focusResult(): void {
    void this.updateComplete.then(() => {
      this.querySelector<HTMLElement>('.h5p-sc-set-results h2, .h5p-sc-set-results .h5p-theme-results-banner, .h5p-question-try-again')?.focus();
    });
  }

  resetTask(moveFocus = false): void {
    this.retry();
    if (moveFocus) {
      this.focusCurrentAlternative();
    }
  }

  render(): TemplateResult {
    if (!this.model) {
      return html``;
    }

    const state = this.model.getViewState();
    return html`
      <div class="h5p-sc-set-wrapper navigatable initialized ${state.resultsVisible ? 'showing-results' : ''}"
           @click=${this.handleImpatientClick}
           @keydown=${this.handleImpatientKeydown}>
        <div class="h5p-sc-set h5p-sc-animate" style="transform: translateX(${-state.currentIndex * 100}%);">
          ${state.choices.map((choice) => this.renderChoice(choice, state))}
          ${this.renderResults(state)}
        </div>
        ${this.renderNavigation(state)}
      </div>
    `;
  }

  private renderChoice(choice: ChoiceState, state: ViewState): TemplateResult {
    const current = state.currentIndex === choice.index;
    const disabled = !current || choice.answered;
    const questionId = `single-choice-${this.getAttribute('content-id') || 'set'}-question-${choice.index}`;

    return html`
      <div class="h5p-sc-slide h5p-sc ${current ? 'h5p-sc-current-slide' : ''}"
           style="left: ${choice.index * 100}%;"
           aria-hidden=${current ? 'false' : 'true'}>
        <div class="h5p-question-introduction">
          <div id=${questionId} class="h5p-sc-question">${unsafeHTML(choice.choice.question)}</div>
          ${choice.index === 0 ? this.renderSoundControl() : nothing}
        </div>
        <ul class="h5p-sc-alternatives" role="radiogroup" aria-labelledby=${questionId}>
          ${choice.choice.answers.map((answer, index) => this.renderAlternative(choice, index, state, disabled, answer.text))}
        </ul>
      </div>
    `;
  }

  private renderAlternative(
    choice: ChoiceState,
    index: number,
    state: ViewState,
    disabled: boolean,
    text: string,
  ): TemplateResult {
    const selected = choice.selectedIndex === index;
    const answer = choice.choice.answers[index];
    const revealed = choice.answered;
    const classes = [
      'h5p-sc-alternative',
      answer.correct ? 'h5p-sc-is-correct' : 'h5p-sc-is-wrong',
      selected ? 'h5p-sc-selected h5p-sc-drummed' : '',
      revealed && answer.correct ? 'h5p-sc-reveal-correct' : '',
      revealed && !answer.correct ? 'h5p-sc-reveal-wrong' : '',
    ].filter(Boolean).join(' ');
    const a11yText = revealed
      ? answer.correct ? this.model.l10n.shouldSelect : this.model.l10n.shouldNotSelect
      : '';

    return html`
      <li class=${classes}
          role="radio"
          aria-checked=${selected}
          aria-disabled=${disabled}
          tabindex=${this.tabIndexFor(choice, index, state)}
          @click=${() => this.select(choice.index, index)}
          @keydown=${(event: KeyboardEvent) => this.alternativeKeydown(event, choice.index, index, choice.choice.answers.length)}>
        <div class="h5p-sc-progressbar"></div>
        <div class="h5p-sc-label">${unsafeHTML(text)}</div>
        <div class="h5p-sc-status" aria-hidden="true"></div>
        <div class="h5p-sc-a11y" aria-hidden=${revealed ? 'false' : 'true'}>
          ${selected ? (choice.correct ? this.model.l10n.correctText : this.model.l10n.incorrectText) : a11yText}
        </div>
      </li>
    `;
  }

  private renderSoundControl(): TemplateResult | typeof nothing {
    if (!this.model.behaviour.soundEffectsEnabled) {
      return nothing;
    }
    return html`
      <div class="h5p-sc-sound-control" role="button" tabindex="0"
           aria-label=${this.model.l10n.muteButtonLabel}
           aria-pressed=${this.model.muted}
           @click=${(event: MouseEvent) => this.toggleMute(event)}
           @keydown=${(event: KeyboardEvent) => this.toggleMuteKeyboard(event)}></div>
    `;
  }

  private renderNavigation(state: ViewState): TemplateResult | typeof nothing {
    if (state.resultsVisible) {
      return nothing;
    }
    return html`<div class="h5p-sc-navigation-slot"></div>`;
  }

  private renderResults(state: ViewState): TemplateResult {
    const current = state.resultsVisible;
    const rows = this.model.getResultRows();
    const label = this.model.l10n.scoreBarLabel
      .replace(':num', `${state.score}`)
      .replace(':total', `${state.maxScore}`);
    return html`
      <div class="h5p-sc-slide h5p-sc-set-results ${current ? 'h5p-sc-current-slide' : ''}"
           style="left: ${state.maxScore * 100}%;" aria-hidden=${current ? 'false' : 'true'}>
        <div class="h5p-theme-results-list-container">
          <div class="h5p-theme-results-banner" tabindex="-1">
            <h2>${this.model.l10n.resultHeader}</h2>
            <p aria-label=${label}>${this.model.l10n.totalScore
              .replace(':score', `${state.score}`)
              .replace(':maxScore', `${state.maxScore}`)}</p>
          </div>
          <table class="h5p-sc-results-table">
            <thead><tr><th>${this.model.l10n.resultTableHeader}</th><th>${this.model.l10n.resultScoreTableHeader}</th></tr></thead>
            <tbody>${rows.map((row, index) => this.renderResultRow(row, index))}</tbody>
          </table>
        </div>
        ${state.canRetry ? html`
          <div class="h5p-sc-button-container">
            <button class="h5p-question-try-again h5p-joubelui-button secondary-button" type="button"
                    aria-label=${this.model.l10n.a11yRetry} @click=${() => this.retry()}>
              ${this.model.l10n.retryButtonLabel}
            </button>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private renderResultRow(row: ResultRow, index: number): TemplateResult {
    return html`
      <tr class=${row.correct ? 'h5p-sc-result-correct' : 'h5p-sc-result-wrong'}>
        <td>
          <div class="h5p-theme-results-question">${row.question}</div>
          <div class="h5p-theme-results-answer">${row.userAnswer || '—'}</div>
          ${!row.correct ? html`<div class="h5p-theme-results-solution">${this.model.l10n.correctAnswerIntroduction}: ${row.correctAnswer}</div>` : nothing}
          <span class="h5p-sc-a11y">${this.model.l10n.solutionListQuestionNumber.replace(':num', `${index + 1}`)}</span>
        </td>
        <td>${row.score}</td>
      </tr>
    `;
  }

  private select(choiceIndex: number, answerIndex: number): void {
    const detail = this.model.select(choiceIndex, answerIndex);
    if (!detail) {
      return;
    }
    this.waitingForContinue = false;
    this.clearTimers();
    this.refresh();
    emit(this, 'changed');
    emit(this, 'interacted', detail);
    this.playSound(detail.correct);

    const delay = this.prefersReducedMotion() ? 0 : 600;
    this.finishTimer = window.setTimeout(() => this.finishChoice(detail), delay);
  }

  private finishChoice(detail: ChoiceAnsweredDetail): void {
    this.model.finishChoice(detail.index);
    this.refresh();
    emit(this, 'answered', detail);

    if (!this.model.behaviour.autoContinue) {
      emit(this, 'resize');
      return;
    }

    this.waitingForContinue = true;
    const timeout = detail.correct ? this.model.behaviour.timeoutCorrect : this.model.behaviour.timeoutWrong;
    this.continueTimer = window.setTimeout(() => this.next(), timeout);
    emit(this, 'resize');
  }

  private next(): boolean {
    if (!this.model.getViewState().canContinue) {
      console.log('cannot continue');
      return false;
    }
    if (this.model.currentIndex >= this.model.choices.length - 1) {
      this.model.showResults();
      this.waitingForContinue = false;
      this.clearTimers();
      this.refresh();
      emit(this, 'results');
      emit(this, 'resize');
      this.focusResult();
      return true;
    }
    this.clearTimers();
    this.model.move(this.model.currentIndex + 1);
    this.refresh();
    emit(this, 'changed');
    emit(this, 'resize');
    this.focusCurrentAlternative();
    return true;
  }

  private showResults(): void {
    if (!this.model.getViewState().canContinue) {
      return;
    }
    this.model.showResults();
    this.waitingForContinue = false;
    this.clearTimers();
    this.refresh();
    emit(this, 'results');
    emit(this, 'resize');
    this.focusResult();
  }

  private updateNavigation(): void {
    if (!this.model) {
      return;
    }

    const slot = this.querySelector<HTMLElement>('.h5p-sc-navigation-slot');
    if (!slot) {
      return;
    }

    const navigationFactory = (globalThis as typeof globalThis & { H5P?: H5PGlobal }).H5P?.Components?.Navigation;
    if (!navigationFactory) {
      return;
    }

    if (!this.navigation) {
      const autoContinue = this.model.behaviour.autoContinue;
      const navigationLength = autoContinue ? this.model.choices.length + 1 : this.model.choices.length;
      const params: Record<string, any> = {
        index: Math.min(this.model.currentIndex, navigationLength - 1),
        navigationLength,
        progressType: 'bar',
        texts: {
          nextButton: this.model.l10n.nextButton,
          nextButtonAria: this.model.l10n.nextButtonLabel,
          nextTooltip: this.model.l10n.nextButtonLabel,
          lastButton: this.model.l10n.showResultsButtonLabel,
          lastButtonAria: this.model.l10n.showResultsButtonLabel,
          lastTooltip: this.model.l10n.showResultsButtonLabel,
        },
      };

      if (!autoContinue) {
        params.variant = '2-split-next';
        params.handleNext = () => { console.log("should go next"); return this.next() };
        params.handleLast = () => this.showResults();
      }

      this.navigation = navigationFactory(params);
    }

    slot.replaceChildren(this.navigation);
    const navigationIndex = this.model.behaviour.autoContinue
      ? this.model.currentIndex
      : Math.min(this.model.currentIndex, this.model.choices.length - 1);
    this.navigation.setCurrentIndex(navigationIndex);
    this.navigation.setCanShowLast(!this.model.behaviour.autoContinue && this.model.getViewState().canShowResults);
  }

  private updateLayout(): void {
    const container = this.querySelector<HTMLElement>('.h5p-sc-set');
    const slide = this.querySelector<HTMLElement>('.h5p-sc-current-slide');
    if (!container || !slide) {
      return;
    }

    const height = Math.ceil(Math.max(slide.scrollHeight, slide.getBoundingClientRect().height));
    if (!height || height === this.measuredHeight) {
      return;
    }

    this.measuredHeight = height;
    container.style.minHeight = `${height}px`;
    emit(this, 'resize');
  }

  private retry(): void {
    this.clearTimers();
    this.model.retry();
    this.refresh();
    emit(this, 'retry');
    emit(this, 'changed');
    emit(this, 'resize');
    this.focusCurrentAlternative();
  }

  private alternativeKeydown(event: KeyboardEvent, choiceIndex: number, answerIndex: number, length: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select(choiceIndex, answerIndex);
      return;
    }
    if (!['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? length - 1 : (answerIndex + direction + length) % length;
    this.querySelector<HTMLElement>(`.h5p-sc-current-slide .h5p-sc-alternative:nth-child(${next + 1})`)?.focus();
  }

  private tabIndexFor(choice: ChoiceState, index: number, state: ViewState): number {
    if (choice.index !== state.currentIndex || choice.answered) {
      return -1;
    }
    return index === 0 ? 0 : -1;
  }

  private toggleMute(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.model.muted = !this.model.muted;
    this.refresh();
  }

  private toggleMuteKeyboard(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleMute(event as unknown as MouseEvent);
    }
  }

  private handleImpatientClick = (): void => {
    if (this.waitingForContinue && this.model.behaviour.autoContinue) {
      this.next();
    }
  };

  private handleImpatientKeydown = (event: KeyboardEvent): void => {
    if (this.waitingForContinue && this.model.behaviour.autoContinue && ['Enter', ' ', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      this.next();
    }
  };

  private playSound(correct: boolean): void {
    if (this.model.muted || typeof Audio === 'undefined') {
      return;
    }
    const libraryPath = this.libraryPath();
    if (!libraryPath) {
      return;
    }
    const type = correct ? 'positive-short' : 'negative-short';
    const audio = new Audio(`${libraryPath}sounds/${type}.mp3`);
    window.setTimeout(() => {
      try {
        const playback = audio.play();
        if (playback && typeof playback.catch === 'function') {
          playback.catch(() => undefined);
        }
      } catch {
        // Browsers may reject playback until the user has interacted with the page.
      }
    }, this.prefersReducedMotion() ? 0 : 700);
  }

  private libraryPath(): string {
    return this.getAttribute('library-path') ?? '';
  }

  private prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private clearTimers(): void {
    if (this.finishTimer !== undefined) {
      window.clearTimeout(this.finishTimer);
      this.finishTimer = undefined;
    }
    if (this.continueTimer !== undefined) {
      window.clearTimeout(this.continueTimer);
      this.continueTimer = undefined;
    }
  }
}

export function defineSingleChoiceSetElement(): void {
  const registry = globalThis.document?.defaultView?.customElements
    ?? (typeof window !== 'undefined' ? window.customElements : globalThis.customElements);
  if (!registry.get('h5p-single-choice-set')) {
    registry.define('h5p-single-choice-set', SingleChoiceSetView);
  }
}
