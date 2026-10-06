export interface ChoiceInput {
  question?: string;
  answers?: string[];
  subContentId?: string;
}

export interface Answer {
  text: string;
  correct: boolean;
  answerIndex: number;
}

export interface Choice {
  question: string;
  answers: Answer[];
  subContentId?: string;
}

export interface Results {
  corrects: number;
  wrongs: number;
}

export interface Behaviour {
  autoContinue: boolean;
  timeoutCorrect: number;
  timeoutWrong: number;
  soundEffectsEnabled: boolean;
  enableRetry: boolean;
  enableSolutionsButton: boolean;
  passPercentage: number;
}

export interface L10n {
  correctText: string;
  incorrectText: string;
  shouldSelect: string;
  shouldNotSelect: string;
  nextButtonLabel: string;
  nextButton: string;
  showResultsButtonLabel: string;
  retryButtonLabel: string;
  closeButtonLabel: string;
  solutionViewTitle: string;
  slideOfTotal: string;
  muteButtonLabel: string;
  scoreBarLabel: string;
  solutionListQuestionNumber: string;
  a11yShowSolution: string;
  a11yRetry: string;
  resultHeader: string;
  totalScore: string;
  resultTableHeader: string;
  resultScoreTableHeader: string;
  correctAnswerIntroduction: string;
}

export interface Options {
  choices?: ChoiceInput[];
  overallFeedback?: Array<{ from: number; to: number; feedback?: string }>;
  behaviour?: Partial<Behaviour>;
  l10n?: Partial<L10n>;
}

export interface PreviousState {
  progress?: number;
  answers?: Results;
  userResponses?: number[];
}

export interface ContentData {
  previousState?: PreviousState;
  metadata?: { title?: string };
  standalone?: boolean;
}

export interface ChoiceState {
  choice: Choice;
  index: number;
  selectedIndex?: number;
  answered: boolean;
  correct: boolean;
  finished: boolean;
}

export interface ResultRow {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  score: number;
}

export interface ViewState {
  currentIndex: number;
  choices: ChoiceState[];
  resultsVisible: boolean;
  score: number;
  maxScore: number;
  passed: boolean;
  muted: boolean;
  canRetry: boolean;
  canContinue: boolean;
  canShowResults: boolean;
  progressText: string;
}

export interface ChoiceAnsweredDetail {
  index: number;
  answerIndex: number;
  currentIndex: number;
  correct: boolean;
  duration: number;
}

export interface SingleChoiceSetEventMap {
  interacted: CustomEvent<ChoiceAnsweredDetail>;
  answered: CustomEvent<ChoiceAnsweredDetail>;
  changed: CustomEvent<void>;
  resize: CustomEvent<void>;
  results: CustomEvent<void>;
  retry: CustomEvent<void>;
}

export const DEFAULT_BEHAVIOUR: Behaviour = {
  autoContinue: true,
  timeoutCorrect: 2000,
  timeoutWrong: 3000,
  soundEffectsEnabled: true,
  enableRetry: true,
  enableSolutionsButton: true,
  passPercentage: 100,
};

export const DEFAULT_L10N: L10n = {
  correctText: 'Correct!',
  incorrectText: 'Incorrect!',
  shouldSelect: 'Should have been selected',
  shouldNotSelect: 'Should not have been selected',
  nextButtonLabel: 'Next question',
  nextButton: 'Next',
  showResultsButtonLabel: 'Show results',
  retryButtonLabel: 'Retry',
  closeButtonLabel: 'Close',
  solutionViewTitle: 'Solution',
  slideOfTotal: 'Slide :num of :total',
  muteButtonLabel: 'Mute feedback sound',
  scoreBarLabel: 'You got :num out of :total points',
  solutionListQuestionNumber: 'Question :num',
  a11yShowSolution: 'Show the solution. The task will be marked with its correct solution.',
  a11yRetry: 'Retry the task. Reset all responses and start the task over again.',
  resultHeader: 'Your result:',
  totalScore: ':score of :maxScore correct',
  resultTableHeader: 'Question',
  resultScoreTableHeader: 'Score',
  correctAnswerIntroduction: 'Correct answer',
};
