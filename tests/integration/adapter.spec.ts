import { beforeEach, describe, expect, it } from 'vitest';

class QuestionStub {
  answered = false;
  content: unknown;
  events: Array<{ name: unknown; data?: unknown }> = [];

  constructor(public name: string, public options: unknown) {}

  setContent(content: unknown): this {
    this.content = content;
    document.body.append(content as Node);
    return this;
  }

  trigger(name: unknown, data?: unknown): void {
    this.events.push({ name, data });
  }

  triggerXAPI(name: string): void {
    this.events.push({ name });
  }

  triggerXAPIScored(score: number, max: number): void {
    this.events.push({ name: 'scored', data: { score, max } });
  }

  getLibraryFilePath(): string {
    return '';
  }
}

describe('H5P.SingleChoiceSet adapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    (globalThis as any).H5P = {
      Question: QuestionStub,
      jQuery: (value: unknown) => value,
      createTitle: (title: string) => title,
      Components: {
        Navigation: (params: Record<string, any>) => {
          const navigation = document.createElement('nav') as any;
          navigation.setCurrentIndex = () => undefined;
          navigation.setCanShowLast = () => undefined;
          if (params.handleNext) {
            const next = document.createElement('button');
            next.className = 'h5p-theme-next';
            next.addEventListener('click', () => params.handleNext());
            navigation.append(next);
          }
          if (params.handleLast) {
            const last = document.createElement('button');
            last.className = 'h5p-theme-show-results';
            last.addEventListener('click', () => params.handleLast());
            navigation.append(last);
          }
          return navigation;
        },
      },
    };
  });

  it('keeps the H5P constructor contract while delegating rendering to Lit', async () => {
    await import('../../src/entry');
    const SingleChoiceSet = (globalThis as any).H5P.SingleChoiceSet;
    const instance = new SingleChoiceSet({
      behaviour: { autoContinue: false },
      choices: [{ question: 'Pick one', answers: ['Yes', 'No'] }],
    }, 42, {});

    instance.registerDomElements();
    await instance.view.updateComplete;
    const correct = instance.view.model.choices[0].answers.findIndex((answer: { correct: boolean }) => answer.correct);
    instance.view.querySelectorAll('.h5p-sc-alternative')[correct].click();
    await instance.view.updateComplete;

    expect(instance.getCurrentState().answers.corrects).toBe(1);
    expect(instance.getScore()).toBe(1);
    expect(instance.view.querySelector('.h5p-sc-selected')).toBeTruthy();

    const xapi = instance.getXAPIData();
    expect(xapi.children).toHaveLength(1);
    expect(xapi.children[0].statement.result.response).toBe('0');
    expect(xapi.statement.result.score.raw).toBe(1);
  });
});
