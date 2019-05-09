import { EpicDependencies } from 'wdk-client/Core/Store';
import { InferAction } from 'wdk-client/Utils/ActionCreatorUtils';
import { Action } from 'wdk-client/Actions';
import { stubTrue } from 'lodash/fp';
import { mergeMapRequestActionsToEpic as mrate } from 'wdk-client/Utils/ActionCreatorUtils';
import { combineEpics, StateObservable } from 'redux-observable';
import { Step } from 'wdk-client/Utils/WdkUser';
import {
  requestStep,
  requestStepUpdate,
  fulfillStep,
  fulfillStepError,
  fulfillStepUnauthorized,
  requestStepSearchConfigUpdate,
  fulfillDeleteStep,
  requestCreateStep,
  fulfillCreateStep,
  requestDeleteStep
} from 'wdk-client/Actions/StepActions';
import { RootState } from 'wdk-client/Core/State/Types';

export const key = 'steps';

export type StepEntry =
  | { status: 'pending', isLoading: boolean }
  | { status: 'unauthorized', isLoading: boolean }
  | { status: 'error', isLoading: boolean, message: string }
  | { status: 'success', isLoading: boolean, step: Step }

export type State = {
  steps: Record<number, StepEntry|undefined>;
};

const initialState: State = {
  steps: {}
};

export function reduce(state: State = initialState, action: Action): State {
  switch (action.type) {

    case requestStep.type:
    case requestStepSearchConfigUpdate.type:
    case requestStepUpdate.type: {
      const { stepId } = action.payload;
      const entry = state.steps[stepId];
      if (entry != null) return state;
      return updateStepEntry(state, stepId, prevEntry => ({
        status: 'pending',
        ...prevEntry,
        isLoading: true
      }));
    }

    case fulfillStepError.type:
      return updateStepEntry(state, action.payload.stepId, {
        status: 'error',
        isLoading: false,
        message: action.payload.errorMessage
      });

    case fulfillStepUnauthorized.type:
      return updateStepEntry(state, action.payload.stepId, {
        status: 'unauthorized',
        isLoading: false
      });

    case fulfillStep.type: {
      const step = action.payload.step;
      const entry = state.steps[step.id];
      if (entry == null || entry.status !== 'success') {
        return updateStepEntry(state, step.id, {
          status: 'success',
          isLoading: false,
          step
        });
      }
      
      return state;
    }

    case fulfillDeleteStep.type: {
      const stepId = action.payload.stepId;
      state.steps[stepId] = undefined;
      return state;
    }

    default: {
      return state;
    }
  }
}

function updateStepEntry(
  state: State,
  stepId: number,
  entry: StepEntry | ((prevEntry?: StepEntry) => StepEntry)
) {
  return {
    ...state,
    steps: {
      ...state.steps,
      [stepId]: typeof entry === 'function' ? entry(state.steps[stepId]) : entry
    }
  };
}

async function getFulfillStep(
  [requestAction]: [InferAction<typeof requestStep>],
  state$: StateObservable<RootState>,
  { wdkService }: EpicDependencies
): Promise<InferAction<typeof fulfillStep | typeof fulfillStepError | typeof fulfillStepUnauthorized>> {
  const { stepId } = requestAction.payload;
  try {
    let step = await wdkService.findStep(stepId);
    return fulfillStep(step);
  }
  catch(error) {
    return 'status' in error && error.status === 403
      ? fulfillStepUnauthorized(stepId)
      : fulfillStepError(stepId, error.message);
  }
}

async function getFulfillStepUpdate(
  [requestAction]: [InferAction<typeof requestStepUpdate>],
  state$: StateObservable<RootState>,
  { wdkService }: EpicDependencies
): Promise<InferAction<typeof fulfillStep | typeof fulfillStepError | typeof fulfillStepUnauthorized>> {
  const { stepId, stepSpec } = requestAction.payload;
  try {
    let step = await wdkService.updateStep(
      stepId,
      stepSpec
    );
    return fulfillStep(step);
  }
  catch(error) {
    return 'status' in error && error.status === 403
      ? fulfillStepUnauthorized(stepId)
      : fulfillStepError(stepId, error.message);
  }
}

async function getFulfillStepSearchConfigUpdate(
  [requestAction]: [InferAction<typeof requestStepSearchConfigUpdate>],
  state$: StateObservable<RootState>,
  { wdkService }: EpicDependencies
): Promise<InferAction<typeof fulfillStep | typeof fulfillStepError | typeof fulfillStepUnauthorized>> {
  const { stepId, answerSpec } = requestAction.payload;
  try {
    let step = await wdkService.updateStepSearchConfig(
      stepId,
      answerSpec
    );
    return fulfillStep(step);
  }
  catch(error) {
    return 'status' in error && error.status === 403
      ? fulfillStepUnauthorized(stepId)
      : fulfillStepError(stepId, error.message);
  }
}

async function getFulfillCreateStep(
  [requestAction]: [InferAction<typeof requestCreateStep>],
  state$: StateObservable<RootState>,
  { wdkService }: EpicDependencies
): Promise<InferAction<typeof fulfillCreateStep>> {
  const { newStepSpec, requestTimestamp } = requestAction.payload;
  let stepId = await wdkService.createStep(newStepSpec);

  return fulfillCreateStep(stepId.id, requestTimestamp);
}

async function getFulfillDeleteStep(
  [requestAction]: [InferAction<typeof requestDeleteStep>],
  state$: StateObservable<RootState>,
  { wdkService }: EpicDependencies
): Promise<InferAction<typeof fulfillDeleteStep>> {
  const { stepId } = requestAction.payload;
  await wdkService.deleteStep(stepId);

  return fulfillDeleteStep(stepId);
}

export const observe = combineEpics(
  mrate([requestStep], getFulfillStep, {
    areActionsNew: stubTrue
  }),
  mrate([requestStepUpdate], getFulfillStepUpdate),
  mrate([requestStepSearchConfigUpdate], getFulfillStepSearchConfigUpdate),
  mrate([requestCreateStep], getFulfillCreateStep),
  mrate([requestDeleteStep], getFulfillDeleteStep)
);
