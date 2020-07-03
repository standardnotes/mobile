import { ChallengeValue, ChallengeType } from 'snjs';

export const findMatchingValueIndex = (
  values: ChallengeValue[],
  type: ChallengeValue['type']
) => {
  return values.findIndex(arrayValue => type === arrayValue.type);
};

export const isInActiveState = (state: ChallengeValueStateType) =>
  state !== ChallengeValueStateType.WaitingInput &&
  state !== ChallengeValueStateType.Success;

export enum ChallengeValueStateType {
  WaitingTurn = 0,
  WaitingInput = 1,
  Success = 2,
  Fail = 3,
  Pending = 4,
  Locked = 5,
}

type ChallengeValueState = {
  challengeValues: ChallengeValue[];
  challengeValueStates: ChallengeValueStateType[];
};
type SetChallengeValueState = {
  type: 'setState';
  valueType: ChallengeValue['type'];
  state: ChallengeValueStateType;
};
type SetChallengeValue = {
  type: 'setValue';
  valueType: ChallengeValue['type'];
  value: ChallengeValue['value'];
};
type Action = SetChallengeValueState | SetChallengeValue;
export const authenticationReducer = (
  state: ChallengeValueState,
  action: Action
): ChallengeValueState => {
  switch (action.type) {
    case 'setState': {
      const tempArray = state.challengeValueStates.slice();
      const index = findMatchingValueIndex(
        state.challengeValues,
        action.valueType
      );
      tempArray[index] = action.state;
      return { ...state, challengeValueStates: tempArray };
    }
    case 'setValue': {
      const tempArray = state.challengeValues.slice();
      const index = findMatchingValueIndex(
        state.challengeValues,
        action.valueType
      );
      tempArray[index] = {
        type: state.challengeValues[index].type,
        value: action.value,
      };
      return { ...state, challengeValues: tempArray };
    }
    default:
      return state;
  }
};

export const getTitleForStateAndType = (
  challengeValue: ChallengeValue,
  state: ChallengeValueStateType
) => {
  switch (challengeValue.type) {
    case ChallengeType.AccountPassword: {
      const title = 'Account Password';
      switch (state) {
        case ChallengeValueStateType.WaitingTurn:
          return title.concat(' ', '- Waiting.');
        case ChallengeValueStateType.Locked:
          return title.concat(' ', '- Locked.');
        default:
          return title;
      }
    }
    case ChallengeType.LocalPasscode: {
      const title = 'Local Password';
      switch (state) {
        case ChallengeValueStateType.WaitingTurn:
          return title.concat(' ', '- Waiting.');
        case ChallengeValueStateType.Locked:
          return title.concat(' ', '- Locked.');
        default:
          return title;
      }
    }
    case ChallengeType.Biometric: {
      const title = 'Biometrics';
      switch (state) {
        case ChallengeValueStateType.WaitingTurn:
          return title.concat(' ', '- Waiting.');
        case ChallengeValueStateType.Locked:
          return title.concat(' ', '- Locked.');
        default:
          return title;
      }
    }
  }
};

export const getLabelForStateAndType = (
  challengeValue: ChallengeValue,
  state: ChallengeValueStateType
) => {
  switch (challengeValue.type) {
    case ChallengeType.AccountPassword: {
      switch (state) {
        case ChallengeValueStateType.WaitingTurn:
        case ChallengeValueStateType.WaitingInput:
          return 'Enter your account password';
        case ChallengeValueStateType.Pending:
          return 'Verifying keys...';
        case ChallengeValueStateType.Success:
          return 'Success | Account Password';
        case ChallengeValueStateType.Fail:
          return 'Invalid account password. Please try again.';
        default:
          return '';
      }
    }
    case ChallengeType.LocalPasscode: {
      switch (state) {
        case ChallengeValueStateType.WaitingTurn:
        case ChallengeValueStateType.WaitingInput:
          return 'Enter your local passcode';
        case ChallengeValueStateType.Pending:
          return 'Verifying keys...';
        case ChallengeValueStateType.Success:
          return 'Success | Local Passcode';
        case ChallengeValueStateType.Fail:
          return 'Invalid local password. Please try again.';
        default:
          return '';
      }
    }
    case ChallengeType.Biometric: {
      switch (state) {
        case ChallengeValueStateType.WaitingTurn:
        case ChallengeValueStateType.WaitingInput:
          return 'Please use biometrics to unlock.';
        case ChallengeValueStateType.Pending:
          return 'Waiting for unlock.';
        case ChallengeValueStateType.Success:
          return 'Success | Biometrics.';
        case ChallengeValueStateType.Fail:
          return 'Biometrics failed. Tap to try again.';
        case ChallengeValueStateType.Locked:
          return 'Biometrics locked. Try again in 30 seconds.';
        default:
          return '';
      }
    }
    default:
      return '';
  }
};
