import {
  ChallengePrompt,
  ChallengeValidation,
  ChallengeValue,
  PrivilegeCredential,
} from 'snjs';

export const findMatchingPrivilegeValueIndex = (
  values: PrivilegeLockValue[],
  type: PrivilegeCredential
) => {
  return values.findIndex(arrayValue => type === arrayValue.type);
};

export const isInActiveState = (state: AuthenticationValueStateType) =>
  state !== AuthenticationValueStateType.WaitingInput &&
  state !== AuthenticationValueStateType.Success;

export enum AuthenticationValueStateType {
  WaitingTurn = 0,
  WaitingInput = 1,
  Success = 2,
  Fail = 3,
  Pending = 4,
  Locked = 5,
}

type ChallengeValueState = {
  challengeValues: Record<string, ChallengeValue>;
  challengeValueStates: Record<string, AuthenticationValueStateType>;
};
type SetChallengeValueState = {
  type: 'setState';
  id: string;
  state: AuthenticationValueStateType;
};
type SetChallengeValue = {
  type: 'setValue';
  id: string;
  value: ChallengeValue['value'];
};

export type PrivilegeLockValue = {
  type: PrivilegeCredential;
  value: string;
};

type SetPrivilegesValueState = {
  type: 'setState';
  valueType: PrivilegeLockValue['type'];
  state: AuthenticationValueStateType;
};
type SetPrivilegesValue = {
  type: 'setValue';
  valueType: PrivilegeLockValue['type'];
  value: PrivilegeLockValue['value'];
};

type PrivilegeValueState = {
  privilegeValues: PrivilegeLockValue[];
  privilegeValueStates: AuthenticationValueStateType[];
};

type PrivilegesAction = SetPrivilegesValueState | SetPrivilegesValue;
export const privilegesAuthenticationReducer = (
  state: PrivilegeValueState,
  action: PrivilegesAction
): PrivilegeValueState => {
  switch (action.type) {
    case 'setState': {
      const tempArray = state.privilegeValueStates.slice();
      const index = findMatchingPrivilegeValueIndex(
        state.privilegeValues,
        action.valueType
      );
      tempArray[index] = action.state;
      return { ...state, privilegeValueStates: tempArray };
    }
    case 'setValue': {
      const tempArray = state.privilegeValues.slice();
      const index = findMatchingPrivilegeValueIndex(
        state.privilegeValues,
        action.valueType
      );
      tempArray[index] = {
        type: state.privilegeValues[index].type,
        value: action.value,
      };
      return { ...state, privilegeValues: tempArray };
    }
    default:
      return state;
  }
};

type Action = SetChallengeValueState | SetChallengeValue;
export const authenticationReducer = (
  state: ChallengeValueState,
  action: Action
): ChallengeValueState => {
  switch (action.type) {
    case 'setState': {
      return {
        ...state,
        challengeValueStates: {
          ...state.challengeValueStates,
          [action.id]: action.state,
        },
      };
    }
    case 'setValue': {
      const updatedChallengeValue = state.challengeValues[action.id];
      return {
        ...state,
        challengeValues: {
          ...state.challengeValues,
          [action.id]: {
            ...updatedChallengeValue,
            value: action.value,
          },
        },
      };
    }
    default:
      return state;
  }
};

export const findIndexInObject = (
  map:
    | ChallengeValueState['challengeValues']
    | ChallengeValueState['challengeValueStates'],
  id: string
) => {
  return Object.keys(map).indexOf(id);
};

export const getChallengePromptTitle = (
  prompt: ChallengePrompt,
  state: AuthenticationValueStateType
) => {
  const title = prompt.title!;
  switch (state) {
    case AuthenticationValueStateType.WaitingTurn:
      return title.concat(' ', '- Waiting.');
    case AuthenticationValueStateType.Locked:
      return title.concat(' ', '- Locked.');
    default:
      return title;
  }
};

export const getLabelForStateAndType = (
  validation: ChallengeValidation,
  state: AuthenticationValueStateType
) => {
  switch (validation) {
    case ChallengeValidation.Biometric: {
      switch (state) {
        case AuthenticationValueStateType.WaitingTurn:
        case AuthenticationValueStateType.WaitingInput:
          return 'Please use biometrics to unlock.';
        case AuthenticationValueStateType.Pending:
          return 'Waiting for unlock.';
        case AuthenticationValueStateType.Success:
          return 'Success | Biometrics.';
        case AuthenticationValueStateType.Fail:
          return 'Biometrics failed. Tap to try again.';
        case AuthenticationValueStateType.Locked:
          return 'Biometrics locked. Try again in 30 seconds.';
        default:
          return '';
      }
    }
    default:
      switch (state) {
        case AuthenticationValueStateType.WaitingTurn:
        case AuthenticationValueStateType.WaitingInput:
          return 'Waiting';
        case AuthenticationValueStateType.Pending:
          return 'Verifying keys...';
        case AuthenticationValueStateType.Success:
          return 'Success';
        case AuthenticationValueStateType.Fail:
          return 'Invalid value. Please try again.';
        default:
          return '';
      }
  }
};

export const getTitleForPrivilegeLockStateAndType = (
  privilegeValue: PrivilegeLockValue,
  state: AuthenticationValueStateType
) => {
  switch (privilegeValue.type) {
    case PrivilegeCredential.AccountPassword: {
      const title = 'Account Password';
      switch (state) {
        case AuthenticationValueStateType.WaitingTurn:
          return title.concat(' ', '- Waiting.');
        case AuthenticationValueStateType.Locked:
          return title.concat(' ', '- Locked.');
        default:
          return title;
      }
    }
    case PrivilegeCredential.LocalPasscode: {
      const title = 'Local Passcode';
      switch (state) {
        case AuthenticationValueStateType.WaitingTurn:
          return title.concat(' ', '- Waiting.');
        case AuthenticationValueStateType.Locked:
          return title.concat(' ', '- Locked.');
        default:
          return title;
      }
    }
  }
};

export const getLabelForPrivilegeLockStateAndType = (
  credential: PrivilegeCredential,
  state: AuthenticationValueStateType
) => {
  switch (credential) {
    case PrivilegeCredential.AccountPassword: {
      switch (state) {
        case AuthenticationValueStateType.WaitingTurn:
        case AuthenticationValueStateType.WaitingInput:
          return 'Enter your account password';
        case AuthenticationValueStateType.Pending:
          return 'Verifying keys...';
        case AuthenticationValueStateType.Success:
          return 'Success | Account Password';
        case AuthenticationValueStateType.Fail:
          return 'Invalid account password. Please try again.';
        default:
          return '';
      }
    }
    case PrivilegeCredential.LocalPasscode: {
      switch (state) {
        case AuthenticationValueStateType.WaitingTurn:
        case AuthenticationValueStateType.WaitingInput:
          return 'Enter your local passcode';
        case AuthenticationValueStateType.Pending:
          return 'Verifying keys...';
        case AuthenticationValueStateType.Success:
          return 'Success | Local Passcode';
        case AuthenticationValueStateType.Fail:
          return 'Invalid local passcode. Please try again.';
        default:
          return '';
      }
    }
  }
};
