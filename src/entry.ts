import { SingleChoiceSetModel } from './domain/model';
import type { ChoiceAnsweredDetail, ContentData, Options } from './domain/types';
import { defineSingleChoiceSetElement, SingleChoiceSetView } from './components/single-choice-set-view';
import { createQuestionXAPIEvent, createSetXAPIData } from './integration/xapi';

const h5p = (globalThis as typeof globalThis & { H5P: H5PGlobal }).H5P;
defineSingleChoiceSetElement();

class SingleChoiceSet extends h5p.Question {
  contentId: number;
  contentData: ContentData;
  model!: SingleChoiceSetModel;
  view?: SingleChoiceSetView;
  private details: Array<ChoiceAnsweredDetail | undefined> = [];

  constructor(options: Options = {}, contentId: number, contentData: ContentData = {}) {
    super('single-choice-set', { theme: true });
    this.contentId = contentId;
    this.contentData = contentData;
    this.model = new SingleChoiceSetModel(options, contentData);
    this.answered = this.model.answerGiven;
  }

  isRoot(): boolean {
    return !!this.contentData.standalone;
  }

  registerDomElements(): void {
    const view = document.createElement('h5p-single-choice-set') as unknown as SingleChoiceSetView;
    view.setAttribute('content-id', `${this.contentId}`);
    view.setAttribute('library-path', this.getLibraryFilePath?.('') ?? '');
    view.model = this.model;
    view.addEventListener('interacted', () => {
      this.answered = true;
      this.triggerXAPI('interacted');
    });
    view.addEventListener('answered', (event) => this.onQuestionAnswered((event as CustomEvent<ChoiceAnsweredDetail>).detail));
    view.addEventListener('results', () => this.onResults());
    view.addEventListener('retry', () => {
      this.answered = false;
      this.details = [];
    });
    view.addEventListener('resize', () => this.trigger('resize'));
    this.view = view;

    this.setContent(h5p.jQuery(view), { class: 'h5p-single-choice-set' });
  }

  showAllSolutions(): void {
    this.view?.focusResult();
  }

  showSolutions(): void {
    this.view?.focusResult();
  }

  hideSolutions(): void {
    this.resetTask();
  }

  showCheckSolution(): void {
    this.view?.focusResult();
  }

  resetTask(moveFocus = false): void {
    if (this.view) {
      this.view.resetTask(moveFocus);
    } else {
      this.model.retry();
    }
    this.answered = false;
    this.details = [];
    this.trigger('resize');
  }

  getCurrentState(): { progress: number; answers: { corrects: number; wrongs: number }; userResponses: number[] } | undefined {
    return this.model.getCurrentState();
  }

  getAnswerGiven(): boolean {
    return this.model.answerGiven;
  }

  getScore(): number {
    return this.model.score;
  }

  getMaxScore(): number {
    return this.model.maxScore;
  }

  getTitle(): string {
    const title = this.contentData.metadata?.title || 'Single Choice Set';
    return h5p.createTitle ? h5p.createTitle(title) : title;
  }

  getXAPIData(): { statement: Record<string, any>; children: Array<{ statement: Record<string, any> }> } {
    const parent = (this as H5PQuestion & {
      parent?: { contentId?: number; subContentId?: string };
    }).parent;
    const parentContentId = parent?.contentId;
    const details = this.model.choices.map((choice, index) => {
      const detail = this.details[index];
      if (detail) {
        return detail;
      }
      const selectedIndex = this.model.userResponses[index];
      if (selectedIndex === undefined) {
        return undefined;
      }
      const answer = choice.answers[selectedIndex];
      return {
        index,
        answerIndex: answer?.answerIndex ?? -1,
        currentIndex: selectedIndex,
        correct: !!answer?.correct,
        duration: this.model.timePassed(index),
      } satisfies ChoiceAnsweredDetail;
    });
    return createSetXAPIData(
      this.contentId,
      parentContentId,
      this.model.choices,
      details,
      this.model.results,
      this.model.totalPassedTime(),
    );
  }

  pause(): void {
    // Single Choice Set has no embedded media. Kept for the H5P lifecycle contract.
  }

  play(): void {
    // Single Choice Set has no embedded media. Kept for the H5P lifecycle contract.
  }

  private onQuestionAnswered(detail: ChoiceAnsweredDetail): void {
    this.answered = true;
    this.details[detail.index] = detail;
    const event = createQuestionXAPIEvent(
      this.contentId,
      this.contentId,
      this.model.choices[detail.index],
      detail,
    );
    this.trigger(event);
  }

  private onResults(): void {
    this.triggerXAPIScored?.(
      this.model.score,
      this.model.maxScore,
      'completed',
      true,
      this.model.passed,
    );
    this.trigger('resize');
  }
}

(h5p as H5PGlobal & { SingleChoiceSet?: typeof SingleChoiceSet }).SingleChoiceSet = SingleChoiceSet;
