import { describe, expect, it, vi } from 'vitest';
import { SingleChoiceSetModel } from '../../src/domain/model';

describe('SingleChoiceSetModel', () => {
  it('keeps the first authored answer correct while randomizing display order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const model = new SingleChoiceSetModel({
      choices: [{ question: 'Pick one', answers: ['Correct', 'Wrong'] }],
    });

    expect(model.choices[0].answers.find((answer) => answer.correct)?.text).toBe('Correct');
    expect(model.choices[0].answers).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it('tracks selected answers, score, and serialized state', () => {
    const model = new SingleChoiceSetModel({
      choices: [
        { question: 'One', answers: ['Yes', 'No'] },
        { question: 'Two', answers: ['Right', 'Wrong'] },
      ],
    });

    const wrong = model.select(0, model.choices[0].answers.findIndex((answer) => !answer.correct));
    expect(wrong?.correct).toBe(false);
    expect(model.score).toBe(0);
    model.finishChoice(0);
    model.move(1);
    const correct = model.select(1, model.choices[1].answers.findIndex((answer) => answer.correct));
    expect(correct?.correct).toBe(true);
    expect(model.score).toBe(1);
    expect(model.getCurrentState()?.userResponses).toHaveLength(2);
  });

  it('restores progress and response indexes', () => {
    const model = new SingleChoiceSetModel({
      choices: [{ question: 'One', answers: ['Yes', 'No'] }],
    }, {
      previousState: {
        progress: 1,
        answers: { corrects: 1, wrongs: 0 },
        userResponses: [0],
      },
    });

    expect(model.currentIndex).toBe(1);
    expect(model.showingResults).toBe(true);
    expect(model.answerGiven).toBe(true);
  });

  it('resets all state on retry', () => {
    const model = new SingleChoiceSetModel({
      choices: [{ question: 'One', answers: ['Yes', 'No'] }],
    });
    model.select(0, 0);
    model.showResults();
    model.retry();

    expect(model.currentIndex).toBe(0);
    expect(model.score).toBe(0);
    expect(model.getCurrentState()).toBeUndefined();
  });
});
