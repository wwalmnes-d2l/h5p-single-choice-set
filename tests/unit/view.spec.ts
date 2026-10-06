import { describe, expect, it } from 'vitest';
import { SingleChoiceSetModel } from '../../src/domain/model';
import { defineSingleChoiceSetElement, SingleChoiceSetView } from '../../src/components/single-choice-set-view';

describe('SingleChoiceSetView', () => {
  it('renders radio alternatives and handles keyboard selection', async () => {
    defineSingleChoiceSetElement();
    const view = document.createElement('h5p-single-choice-set') as unknown as SingleChoiceSetView;
    view.model = new SingleChoiceSetModel({
      choices: [{ question: '<p>Pick one</p>', answers: ['Correct', 'Wrong'] }],
    });
    document.body.append(view);
    await view.updateComplete;

    const alternatives = view.querySelectorAll<HTMLElement>('.h5p-sc-alternative');
    expect(alternatives).toHaveLength(2);
    expect(view.querySelector('.h5p-sc-alternatives')?.getAttribute('role')).toBe('radiogroup');

    alternatives[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await view.updateComplete;

    expect(view.querySelector('.h5p-sc-selected')).toBeTruthy();
    expect(view.querySelector('.h5p-sc-current-slide .h5p-sc-alternative')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('shows the result slide after the final answer', async () => {
    defineSingleChoiceSetElement();
    const view = document.createElement('h5p-single-choice-set') as unknown as SingleChoiceSetView;
    view.model = new SingleChoiceSetModel({
      behaviour: { autoContinue: false },
      choices: [{ question: 'Pick one', answers: ['Correct', 'Wrong'] }],
    });
    document.body.append(view);
    await view.updateComplete;

    const correctIndex = view.model.choices[0].answers.findIndex((answer) => answer.correct);
    view.querySelectorAll<HTMLElement>('.h5p-sc-alternative')[correctIndex].click();
    await view.updateComplete;
    view.querySelector<HTMLButtonElement>('.h5p-theme-show-results')?.click();
    await view.updateComplete;

    expect(view.querySelector('.h5p-sc-set-results')?.classList.contains('h5p-sc-current-slide')).toBe(true);
    expect(view.querySelector('.h5p-sc-results-table')).toBeTruthy();
  });
});
