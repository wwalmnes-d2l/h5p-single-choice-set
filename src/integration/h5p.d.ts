export {};

declare global {
  interface H5PQuestion {
    answered: boolean;
    setContent(content: unknown, options?: { class?: string }): this;
    addButton(...args: unknown[]): this;
    read(content: string): void;
    trigger(event: unknown, data?: unknown): void;
    triggerXAPI(verb: string): void;
    triggerXAPIScored?(score: number, maxScore: number, action: string, completion: boolean, success: boolean): void;
    createXAPIEventTemplate(verb: string): H5PXAPIEvent;
    getLibraryFilePath?(path: string): string;
  }

  interface H5PXAPIEvent {
    data: { statement: Record<string, any> };
    getVerifiedStatementValue(path: string[]): any;
    setScoredResult(score: number, max: number, instance: H5PQuestion, completion?: boolean, success?: boolean): void;
    setActor?(): void;
    setVerb?(verb: string): void;
  }

  interface H5PGlobal {
    Question: new (...args: any[]) => H5PQuestion;
    XAPIEvent?: new (...args: any[]) => H5PXAPIEvent;
    Components?: {
      Navigation?: (params: Record<string, any>) => H5PNavigation;
    };
    jQuery: (element: unknown) => unknown;
    createTitle?: (title: string) => string;
  }

  interface H5PNavigation extends HTMLElement {
    setCurrentIndex(index: number): void;
    setCanShowLast(canShow: boolean): void;
  }

  interface Window {
    H5P: H5PGlobal;
  }

  var H5PIntegration: {
    contents?: Record<string, { url?: string }>;
  } | undefined;


  type XAPI_data = any;
  
  // Reference: https://h5p.org/documentation/developers/contracts
  interface QuestionContract {
    /**
     * Checks if answers for this task has been given, and the program can proceed to calculate scores. Should return false if the user can not proceed yet.
     */
    getAnswersGiven(): boolean;

    /**
     * Calculates the user's score for this task, f.ex. correct answers subtracted by wrong answers.
     */
    getScore(): number;

    /**
     * Calculates the maximum amount of points achievable for this task.
     */
    getMaxScore(): number;

    /**
     * Displays the solution(s) for this task, should also hide all buttons.
     */
    showSolutions(): void;

    /**
     * Resets the task to its initial state, should also show buttons that were hidden by the showSolutions() function.
     */
    resetTask(): void;

    /**
     * Retrieves the xAPI data necessary for generating result reports.
     */
    getXAPIData(): XAPI_data;

    /**
     * Retrieve a value representing the current state of the task. This is required for libraries that wish to support resume functionality.
     */
    getCurrentState(): void;

    /**
     * Variables in semantics that are used:
     * params.behaviour.enableRetry {Boolean} - 
     *  A boolean class parameter that determines if a "retry" button will be shown in your content type.
     * 
     * params.behaviour.enableSolutionsButton {Boolean} -
     *  A boolean class parameter that determines if a "show solution" button will be shown in your content type.
     */
  }
}
