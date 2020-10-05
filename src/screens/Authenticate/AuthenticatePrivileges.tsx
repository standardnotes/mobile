import { ButtonCell } from '@Components/ButtonCell';
import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { AppStateType, PasscodeKeyboardType } from '@Lib/application_state';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/ModalStack';
import { SCREEN_AUTHENTICATE_PRIVILEGES } from '@Screens/screens';
import { ThemeServiceContext } from '@Style/theme_service';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Platform, TextInput } from 'react-native';
import {
  PrivilegeCredential,
  PrivilegeSessionLength,
  ProtectedAction,
} from 'snjs';
import { ThemeContext } from 'styled-components/native';
import {
  Container,
  Input,
  SectionContainer,
  SessionLengthContainer,
  SourceContainer,
} from './Authenticate.styled';
import {
  AuthenticationValueStateType,
  findMatchingPrivilegeValueIndex,
  getLabelForPrivilegeLockStateAndType,
  getTitleForPrivilegeLockStateAndType,
  isInActiveState,
  PrivilegeLockValue,
  privilegesAuthenticationReducer,
} from './helpers';

type Props = ModalStackNavigationProp<typeof SCREEN_AUTHENTICATE_PRIVILEGES>;

export const PRIVILEGES_UNLOCK_PAYLOAD = 'privilegesUnlockPayload';

export const AuthenticatePrivileges = ({
  route: {
    params: { privilegeCredentials, action, previousScreen, unlockedItemId },
  },
  navigation,
}: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const themeService = useContext(ThemeServiceContext);
  const theme = useContext(ThemeContext);

  // State
  const [keyboardType, setKeyboardType] = useState<
    PasscodeKeyboardType | undefined
  >(undefined);
  const [sessionLengthOptions] = useState(() =>
    application!.privilegesService!.getSessionLengthOptions()
  );
  const [selectedSessionLength, setSelectedSessionLength] = useState<
    PrivilegeSessionLength
  >();
  const [{ privilegeValues, privilegeValueStates }, dispatch] = useReducer(
    privilegesAuthenticationReducer,
    {
      privilegeValues: privilegeCredentials.map(type => ({
        value: '',
        type: type,
      })),
      privilegeValueStates: privilegeCredentials.map(
        () => AuthenticationValueStateType.WaitingTurn
      ),
    },
    undefined
  );

  // Refs
  const localPasscodeRef = useRef<TextInput>(null);
  const accountPasswordRef = useRef<TextInput>(null);

  const firstNotSuccessful = useMemo(
    () =>
      privilegeValueStates.findIndex(
        state => state !== AuthenticationValueStateType.Success
      ),
    [privilegeValueStates]
  );

  useEffect(() => {
    let isMounted = true;
    const getSessionLength = async () => {
      const length = await application?.privilegesService!.getSelectedSessionLength();
      if (isMounted) {
        setSelectedSessionLength(length as PrivilegeSessionLength);
      }
    };
    getSessionLength();
    return () => {
      isMounted = false;
    };
  }, [application]);

  const beginAuthenticatingForNextAuthenticationReason = useCallback(
    (completedprivilegeValue?: PrivilegeLockValue) => {
      let privilegeValue;
      if (completedprivilegeValue === undefined) {
        privilegeValue = privilegeValues[firstNotSuccessful];
      } else {
        const index = findMatchingPrivilegeValueIndex(
          privilegeValues,
          completedprivilegeValue.type
        );

        if (!privilegeValues.hasOwnProperty(index + 1)) {
          return;
        }
        privilegeValue = privilegeValues[index + 1];
      }

      if (privilegeValue.type === PrivilegeCredential.LocalPasscode) {
        localPasscodeRef.current?.focus();
      } else if (privilegeValue.type === PrivilegeCredential.AccountPassword) {
        accountPasswordRef.current?.focus();
      }

      dispatch({
        type: 'setState',
        valueType: privilegeValue.type,
        state: AuthenticationValueStateType.WaitingInput,
      });
    },
    [privilegeValues, firstNotSuccessful]
  );

  const onInvalidValue = (value: PrivilegeLockValue) => {
    dispatch({
      type: 'setState',
      valueType: value.type,
      state: AuthenticationValueStateType.Fail,
    });
  };
  useEffect(() => {
    const removeAppStateSubscriber = application
      ?.getAppState()
      .addStateChangeObserver(state => {
        if (state === AppStateType.ResumingFromBackground) {
          beginAuthenticatingForNextAuthenticationReason();
        }
      });

    return removeAppStateSubscriber;
  }, [application, beginAuthenticatingForNextAuthenticationReason]);

  const onValidValue = useCallback(
    (value: PrivilegeLockValue) => {
      dispatch({
        type: 'setState',
        valueType: value.type,
        state: AuthenticationValueStateType.Success,
      });
      beginAuthenticatingForNextAuthenticationReason(value);
    },
    [beginAuthenticatingForNextAuthenticationReason]
  );

  const validatePrivilegeValue = useCallback(
    async (privilegeLockValue: PrivilegeLockValue) => {
      const index = findMatchingPrivilegeValueIndex(
        privilegeValues,
        privilegeLockValue.type
      );
      const state = privilegeValueStates[index];

      if (
        state === AuthenticationValueStateType.Locked ||
        state === AuthenticationValueStateType.Success
      ) {
        return;
      }

      dispatch({
        type: 'setState',
        valueType: privilegeLockValue.type,
        state: AuthenticationValueStateType.Pending,
      });

      const result = await application!.privilegesService!.authenticateAction(
        action,
        privilegeValues.reduce((accumulator, currentValue) => {
          accumulator[currentValue.type] = currentValue.value;
          return accumulator;
        }, {} as Partial<Record<PrivilegeCredential, string>>)
      );

      if (result.success) {
        await application?.privilegesService!.setSessionLength(
          selectedSessionLength!
        );
        if (
          action === ProtectedAction.ViewProtectedNotes ||
          action === ProtectedAction.DeleteNote
        ) {
          await application?.setValue(PRIVILEGES_UNLOCK_PAYLOAD, {
            unlockedAction: action,
            unlockedItemId,
            previousScreen,
          });
        } else {
          await application?.setValue(PRIVILEGES_UNLOCK_PAYLOAD, {
            unlockedAction: action,
            previousScreen,
          });
        }

        navigation.goBack();
      } else {
        if (result.failedCredentials) {
          result.failedCredentials.map(item => {
            const lockValueIndex = findMatchingPrivilegeValueIndex(
              privilegeValues,
              item
            );
            onInvalidValue(privilegeValues[lockValueIndex]);
          });
        }
        if (result.successfulCredentials) {
          result.successfulCredentials.map(item => {
            const lockValueIndex = findMatchingPrivilegeValueIndex(
              privilegeValues,
              item
            );
            onValidValue(privilegeValues[lockValueIndex]);
          });
        }
      }
    },
    [
      privilegeValues,
      privilegeValueStates,
      application,
      action,
      navigation,
      selectedSessionLength,
      unlockedItemId,
      previousScreen,
      onValidValue,
    ]
  );

  const checkPasscodeKeyboardType = useCallback(
    async () => application?.getAppState().getPasscodeKeyboardType(),
    [application]
  );

  useEffect(() => {
    let mounted = true;
    const setInitialKeyboardType = async () => {
      const initialKeyboardType = await checkPasscodeKeyboardType();
      if (mounted) {
        setKeyboardType(initialKeyboardType);
      }
    };
    setInitialKeyboardType();
    return () => {
      mounted = false;
    };
  }, [checkPasscodeKeyboardType]);

  useEffect(() => {
    beginAuthenticatingForNextAuthenticationReason();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onValueChange = (newValue: PrivilegeLockValue) => {
    dispatch({
      type: 'setValue',
      valueType: newValue.type,
      value: newValue.value,
    });
  };

  const onSubmitPress = () => {
    const privilegeValue = privilegeValues[firstNotSuccessful];
    validatePrivilegeValue(privilegeValue);
  };

  const switchKeyboard = () => {
    if (keyboardType === PasscodeKeyboardType.Default) {
      setKeyboardType(PasscodeKeyboardType.Numeric);
    } else if (keyboardType === PasscodeKeyboardType.Numeric) {
      setKeyboardType(PasscodeKeyboardType.Default);
    }
  };

  const isPending = useMemo(
    () =>
      privilegeValueStates.findIndex(
        singleState => singleState === AuthenticationValueStateType.Pending
      ) >= 0,
    [privilegeValueStates]
  );

  const renderAuthenticationSource = (
    privilegeValue: PrivilegeLockValue,
    index: number
  ) => {
    const first = index === 0;
    const last = index === privilegeValues.length - 1;
    const state = privilegeValueStates[index];
    const active = isInActiveState(state);
    const isInput =
      privilegeValue.type === PrivilegeCredential.LocalPasscode ||
      privilegeValue.type === PrivilegeCredential.AccountPassword;
    const stateLabel = getLabelForPrivilegeLockStateAndType(
      privilegeValue.type,
      state
    );
    const stateTitle = getTitleForPrivilegeLockStateAndType(
      privilegeValue,
      state
    );

    return (
      <SourceContainer key={privilegeValue.type}>
        <SectionHeader
          title={stateTitle}
          subtitle={isInput ? stateLabel : undefined}
          tinted={active}
          buttonText={
            privilegeValue.type === PrivilegeCredential.LocalPasscode &&
            state === AuthenticationValueStateType.WaitingInput
              ? 'Change Keyboard'
              : undefined
          }
          buttonAction={switchKeyboard}
          buttonStyles={
            privilegeValue.type === PrivilegeCredential.LocalPasscode
              ? {
                  color: theme.stylekitNeutralColor,
                  fontSize: theme.mainTextFontSize - 5,
                }
              : undefined
          }
        />
        {isInput && (
          <SectionContainer last={last}>
            <SectionedTableCell textInputCell={true} first={first}>
              <Input
                key={Platform.OS === 'android' ? keyboardType : undefined}
                ref={
                  privilegeValue.type === PrivilegeCredential.LocalPasscode
                    ? localPasscodeRef
                    : accountPasswordRef
                }
                placeholder={
                  privilegeValue.type === PrivilegeCredential.LocalPasscode
                    ? 'Local Passcode'
                    : 'Account password'
                }
                onChangeText={text => {
                  onValueChange({ ...privilegeValue, value: text });
                }}
                value={(privilegeValue.value || '') as string}
                autoCorrect={false}
                autoFocus={false}
                autoCapitalize={'none'}
                secureTextEntry={true}
                keyboardType={keyboardType}
                keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                onSubmitEditing={() => {
                  validatePrivilegeValue(privilegeValue);
                }}
              />
            </SectionedTableCell>
          </SectionContainer>
        )}
      </SourceContainer>
    );
  };

  return (
    <Container>
      {privilegeValues.map((privilegeValue, index) =>
        renderAuthenticationSource(privilegeValue, index)
      )}

      <ButtonCell
        maxHeight={45}
        disabled={isPending}
        title={
          firstNotSuccessful === privilegeValueStates.length - 1
            ? 'Submit'
            : 'Next'
        }
        bold={true}
        onPress={onSubmitPress}
      />
      <SessionLengthContainer>
        <SectionHeader title={'Remember For'} />
        {sessionLengthOptions.map((option, index) => (
          <SectionedAccessoryTableCell
            text={option.label}
            key={option.value}
            first={index === 0}
            last={index === sessionLengthOptions.length - 1}
            selected={() => {
              return option.value === selectedSessionLength;
            }}
            onPress={() => {
              setSelectedSessionLength(option.value);
            }}
          />
        ))}
      </SessionLengthContainer>
    </Container>
  );
};
