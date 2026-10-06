import { DEFAULT_BEHAVIOUR, DEFAULT_L10N, type Answer, type Choice, type ChoiceAnsweredDetail, type ChoiceInput, type ChoiceState, type ContentData, type L10n, type Options, type PreviousState, type ResultRow, type Results, type ViewState } from './types';
import { StopWatch } from './stopwatch';

const shuffle = <T>(values: T[]): T[] => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const defaultResults = (): Results => ({ corrects: 0, wrongs: 0 });

export class SingleChoiceSetModel {
  readonly choices: Choice[];
  readonly behaviour;
  readonly l10n: L10n;
  readonly overallFeedback: NonNullable<Options['overallFeedback']>;
  readonly contentData: ContentData;
  readonly stopWatches: StopWatch[] = [];

  currentIndex: number;
  results: Results;
  userResponses: number[];
  userAnswerIndex: number[];
  muted: boolean;
  showingResults = false;

  constructor(options: Options = {}, contentData: ContentData = {}) {
    this.contentData = contentData;
    this.behaviour = { ...DEFAULT_BEHAVIOUR, ...(options.behaviour ?? {}) };
    this.l10n = { ...DEFAULT_L10N, ...(options.l10n ?? {}) };
    this.overallFeedback = options.overallFeedback ?? [];
    this.choices = (options.choices ?? [])
      .filter((choice): choice is ChoiceInput => !!choice && Array.isArray(choice.answers))
      .map((choice) => ({
        question: choice.question ?? '',
        subContentId: choice.subContentId,
        answers: shuffle((choice.answers ?? []).map((text, answerIndex): Answer => ({
          text,
          correct: answerIndex === 0,
          answerIndex,
        }))),
      }));

    const previous: PreviousState = contentData.previousState ?? {};
    this.currentIndex = Math.max(0, Math.min(previous.progress ?? 0, this.choices.length));
    this.results = { ...defaultResults(), ...(previous.answers ?? {}) };
    this.userResponses = [...(previous.userResponses ?? [])];
    this.userAnswerIndex = [];
    this.muted = this.behaviour.soundEffectsEnabled === false;

    this.startStopWatch(this.currentIndex);
    if (this.currentIndex >= this.choices.length) {
      this.showingResults = true;
    }
  }

  get score(): number {
    return this.results.corrects;
  }

  get maxScore(): number {
    return this.choices.length;
  }

  get answerGiven(): boolean {
    return this.results.corrects + this.results.wrongs > 0;
  }

  get passed(): boolean {
    return this.maxScore > 0 && (100 * this.score) / this.maxScore >= this.behaviour.passPercentage;
  }

  select(choiceIndex: number, displayIndex: number): ChoiceAnsweredDetail | undefined {
    const choice = this.choices[choiceIndex];
    const answer = choice?.answers[displayIndex];
    if (!choice || !answer || this.userResponses[choiceIndex] !== undefined) {
      return undefined;
    }

    const correct = answer.correct;
    this.userResponses[choiceIndex] = displayIndex;
    this.userAnswerIndex[choiceIndex] = answer.answerIndex;
    this.results[correct ? 'corrects' : 'wrongs'] += 1;

    return {
      index: choiceIndex,
      answerIndex: answer.answerIndex,
      currentIndex: displayIndex,
      correct,
      duration: this.stopStopWatch(choiceIndex),
    };
  }

  finishChoice(index: number): void {
    const choice = this.choices[index];
    if (choice && this.userResponses[index] !== undefined) {
      this.startStopWatch(index + 1);
    }
  }

  move(index: number): boolean {
    if (index < 0 || index > this.choices.length || index === this.currentIndex) {
      return false;
    }
    this.currentIndex = index;
    this.showingResults = index >= this.choices.length;
    if (!this.showingResults) {
      this.startStopWatch(index);
    }
    return true;
  }

  showResults(): void {
    this.move(this.choices.length);
  }

  retry(): void {
    this.stopWatches.forEach((watch) => watch.reset());
    this.currentIndex = 0;
    this.results = defaultResults();
    this.userResponses = [];
    this.userAnswerIndex = [];
    this.showingResults = false;
    this.startStopWatch(0);
  }

  getChoiceState(choice: Choice, index: number): ChoiceState {
    const selectedIndex = this.userResponses[index];
    const selected = selectedIndex === undefined ? undefined : choice.answers[selectedIndex];
    return {
      choice,
      index,
      selectedIndex,
      answered: selectedIndex !== undefined,
      correct: !!selected?.correct,
      finished: selectedIndex !== undefined && index < this.currentIndex,
    };
  }

  getViewState(): ViewState {
    return {
      currentIndex: this.currentIndex,
      choices: this.choices.map((choice, index) => this.getChoiceState(choice, index)),
      resultsVisible: this.showingResults,
      score: this.score,
      maxScore: this.maxScore,
      passed: this.passed,
      muted: this.muted,
      canRetry: this.behaviour.enableRetry && this.score !== this.maxScore,
      canContinue: this.currentIndex < this.choices.length && this.userResponses[this.currentIndex] !== undefined,
      canShowResults: this.currentIndex === this.choices.length - 1 && this.userResponses[this.currentIndex] !== undefined,
      progressText: this.l10n.slideOfTotal
        .replace(':num', `${Math.min(this.currentIndex + 1, this.choices.length + 1)}`)
        .replace(':total', `${this.choices.length + 1}`),
    };
  }

  getResultRows(): ResultRow[] {
    return this.choices.map((choice, index) => {
      const selectedIndex = this.userResponses[index];
      const selected = selectedIndex === undefined ? undefined : choice.answers[selectedIndex];
      const correct = !!selected?.correct;
      return {
        question: stripHtml(choice.question),
        userAnswer: stripHtml(selected?.text ?? ''),
        correctAnswer: stripHtml(choice.answers.find((answer) => answer.correct)?.text ?? ''),
        correct,
        score: correct ? 1 : 0,
      };
    });
  }

  get feedback(): string {
    const ratio = this.maxScore ? (100 * this.score) / this.maxScore : 0;
    const feedback = this.overallFeedback.find((range) => ratio >= range.from && ratio <= range.to)?.feedback ?? '';
    return feedback.replace('@score', `${this.score}`).replace('@total', `${this.maxScore}`);
  }

  getCurrentState(): { progress: number; answers: Results; userResponses: number[] } | undefined {
    if (!this.userResponses.length) {
      return undefined;
    }
    return {
      progress: this.currentIndex,
      answers: { ...this.results },
      userResponses: [...this.userResponses],
    };
  }

  timePassed(index: number): number {
    return this.stopWatches[index]?.passedTime() ?? 0;
  }

  totalPassedTime(): number {
    return this.stopWatches.reduce((sum, watch) => sum + watch.passedTime(), 0);
  }

  private startStopWatch(index: number): void {
    if (index <= this.choices.length) {
      this.stopWatches[index] ??= new StopWatch();
      this.stopWatches[index].start();
    }
  }

  private stopStopWatch(index: number): number {
    return this.stopWatches[index]?.stop() ?? 0;
  }
}

const stripHtml = (value: string): string => {
  const element = document.createElement('div');
  element.innerHTML = value;
  return element.textContent ?? '';
};
