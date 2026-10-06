import type { Choice, ChoiceAnsweredDetail, Results } from '../domain/types';

const XAPI_TYPE = 'http://adlnet.gov/expapi/activities/cmi.interaction';

const stripHtml = (value: string): string => {
  const element = document.createElement('div');
  element.innerHTML = value;
  return element.textContent ?? '';
};

const contentId = (id: number, subContentId?: string): string | undefined => {
  const integration = globalThis.H5PIntegration;
  const content = integration?.contents?.[`cid-${id}`];
  if (!content?.url) {
    return undefined;
  }
  return subContentId ? `${content.url}?subContentId=${subContentId}` : content.url;
};

const createEvent = (verb: string): H5PXAPIEvent => {
  const h5p = (globalThis as typeof globalThis & { H5P: H5PGlobal }).H5P;
  if (h5p.XAPIEvent) {
    const event = new h5p.XAPIEvent();
    event.setActor?.();
    event.setVerb?.(verb);
    return event;
  }

  return {
    data: { statement: { verb: { id: verb }, object: {} } },
    getVerifiedStatementValue: () => ({}),
    setScoredResult: () => undefined,
  };
};

const applyContext = (statement: Record<string, any>, parentId?: string): void => {
  if (parentId) {
    statement.context = {
      contextActivities: {
        parent: [{ id: parentId, objectType: 'Activity' }],
      },
    };
  }
  const sessionId = (globalThis as typeof globalThis & { H5P?: { xApiSessionId?: string } }).H5P?.xApiSessionId;
  if (sessionId) {
    statement.context ??= {};
    statement.context.extensions = {
      ...(statement.context.extensions ?? {}),
      'https://h5p.com/xapi/session-id': sessionId,
    };
  }
};

const result = (detail: ChoiceAnsweredDetail | undefined, score: number, maxScore: number, duration?: number): Record<string, any> => {
  const result: Record<string, any> = {
    response: detail ? `${detail.answerIndex}` : '',
    completion: true,
    success: detail?.correct ?? false,
    score: {
      raw: detail ? (detail.correct ? 1 : 0) : score,
      min: 0,
      max: maxScore,
      scaled: maxScore ? Math.round((score / maxScore) * 10000) / 10000 : 0,
    },
  };
  const seconds = duration ?? detail?.duration;
  if (seconds !== undefined) {
    result.duration = `PT${seconds}S`;
  }
  return result;
};

export const createQuestionXAPIEvent = (
  contentIdValue: number,
  contextContentId: number | undefined,
  choice: Choice,
  detail: ChoiceAnsweredDetail | undefined,
): H5PXAPIEvent => {
  const event = createEvent('answered');
  const statement = event.data.statement;
  statement.object = {
    id: contentId(contentIdValue, choice.subContentId),
    objectType: 'Activity',
    definition: {
      type: XAPI_TYPE,
      interactionType: 'choice',
      description: { 'en-US': stripHtml(choice.question) },
      correctResponsesPattern: ['0'],
      choices: choice.answers.map((answer) => ({
        id: `${answer.answerIndex}`,
        description: { 'en-US': stripHtml(answer.text) },
      })),
    },
  };
  statement.result = result(detail, detail?.correct ? 1 : 0, 1, detail?.duration);
  applyContext(statement, contentId(contextContentId ?? contentIdValue));
  return event;
};

export const createSetXAPIData = (
  contentIdValue: number,
  parentContentId: number | undefined,
  choices: Choice[],
  details: Array<ChoiceAnsweredDetail | undefined>,
  results: Results,
  totalDuration: number,
): { statement: Record<string, any>; children: Array<{ statement: Record<string, any> }> } => {
  const children = choices.map((choice, index) => ({
    statement: createQuestionXAPIEvent(contentIdValue, contentIdValue, choice, details[index]).data.statement,
  }));
  const event = createEvent('answered');
  const statement = event.data.statement;
  statement.object = {
    id: contentId(contentIdValue),
    objectType: 'Activity',
    definition: { interactionType: 'compound' },
  };
  statement.result = {
    score: {
      raw: results.corrects,
      min: 0,
      max: choices.length,
      scaled: choices.length ? Math.round((results.corrects / choices.length) * 10000) / 10000 : 0,
    },
    duration: `PT${totalDuration}S`,
  };
  applyContext(statement, parentContentId === undefined ? undefined : contentId(parentContentId));
  return { statement, children };
};
