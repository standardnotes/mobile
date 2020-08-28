import { ButtonCell } from '@Components/ButtonCell';
import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { useFocusEffect } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import React, { useCallback, useContext, useState } from 'react';
import { PrivilegeCredential, ProtectedAction, SNPrivileges } from 'snjs';
import { PrivilegeMutator } from 'snjs/dist/@types/models';
import {
  AboutText,
  CellText,
  Container,
  ScrollContainer,
  Section,
  StyledSectionedTableCell,
} from './ManagePrivileges.styled';

type DisplayInfo = {
  label: string;
  prompt: string;
  availability?: boolean;
};

export const ManagePrivileges = () => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [privileges, setPrivileges] = useState<SNPrivileges>();
  const [availableActions, setAvailableActions] = useState<ProtectedAction[]>();
  const [availableCredentials, setAvailableCredentials] = useState<
    PrivilegeCredential[]
  >();
  const [credentialDisplayInfo, setCredentalDisplayInfo] = useState<
    Partial<Record<PrivilegeCredential, DisplayInfo>>
  >();
  const [sessionExpirey, setSessionExpirey] = useState<string>();
  const [sessionExpired, setSessionExpired] = useState<boolean>();

  const displayInfoForCredential = useCallback(
    (credential: PrivilegeCredential) => {
      const info:
        | DisplayInfo
        | undefined = application?.privilegesService!.displayInfoForCredential(
        credential
      );
      if (credential === PrivilegeCredential.LocalPasscode) {
        info!.availability = application?.hasPasscode();
      } else if (credential === PrivilegeCredential.AccountPassword) {
        info!.availability = application?.hasAccount();
      } else {
        info!.availability = true;
      }
      return info!;
    },
    [application]
  );

  const reloadPrivileges = useCallback(async () => {
    setAvailableActions(application?.privilegesService!.getAvailableActions());
    const updatedAvailableCredentials = application!.privilegesService!.getAvailableCredentials();
    setAvailableCredentials(updatedAvailableCredentials);
    const sessionEndDate = await application!.privilegesService!.getSessionExpirey();
    setSessionExpirey(sessionEndDate.toLocaleString());
    setSessionExpired(new Date() >= sessionEndDate);
    let newCredentialDisplayInfo: Partial<Record<
      PrivilegeCredential,
      DisplayInfo
    >> = {};
    for (const cred of updatedAvailableCredentials) {
      newCredentialDisplayInfo[cred] = displayInfoForCredential(cred);
    }
    setCredentalDisplayInfo(newCredentialDisplayInfo);
    const privs = await application?.privilegesService!.getPrivileges();
    setPrivileges(privs);
  }, [application, displayInfoForCredential]);

  useFocusEffect(
    useCallback(() => {
      reloadPrivileges();
    }, [reloadPrivileges])
  );

  const clearSession = useCallback(async () => {
    await application?.privilegesService!.clearSession();
    reloadPrivileges();
  }, [application, reloadPrivileges]);

  const displayInfoForAction = useCallback(
    (action: ProtectedAction) => {
      return application!.privilegesService!.displayInfoForAction(action).label;
    },
    [application]
  );

  const onValueChanged = async (
    action: ProtectedAction,
    credential: PrivilegeCredential
  ) => {
    await application?.changeAndSaveItem(privileges!.uuid, m => {
      const mutator = m as PrivilegeMutator;
      mutator.toggleCredentialForAction(action, credential);
    });
    reloadPrivileges();
  };

  const isCredentialRequiredForAction = useCallback(
    (action: ProtectedAction, credential: PrivilegeCredential) => {
      if (!privileges) {
        return false;
      }
      return privileges.isCredentialRequiredForAction(action, credential);
    },
    [privileges]
  );

  return (
    <Container>
      <ScrollContainer>
        <Section>
          <SectionHeader title={'About Privileges'} />
          <StyledSectionedTableCell first={true} last={true}>
            <AboutText>
              Privileges represent interface level authentication for accessing
              certain items and features. Privileges are meant to protect
              against unwanted access in the event of an unlocked application,
              but do not affect data encryption state.
            </AboutText>
            <AboutText>
              Privileges sync across your other devices—however, note that if
              you require a "Local Passcode" privilege, and another device does
              not have a local passcode set up, the local passcode requirement
              will be ignored on that device.
            </AboutText>
          </StyledSectionedTableCell>
        </Section>

        {sessionExpirey && !sessionExpired && (
          <Section>
            <SectionHeader title={'Current Session'} />
            <SectionedTableCell first={true}>
              <CellText>
                You will not be asked to authenticate until {sessionExpirey}.
              </CellText>
            </SectionedTableCell>
            <ButtonCell
              last={true}
              leftAligned={true}
              title={'Clear Local Session'}
              onPress={clearSession}
            />
          </Section>
        )}

        {availableActions &&
          availableActions.map((action, actionIndex) => (
            <Section key={`${actionIndex}`}>
              <SectionHeader title={displayInfoForAction(action)} />
              {availableCredentials &&
                availableCredentials.map(
                  (credential, credIndex) =>
                    credentialDisplayInfo?.hasOwnProperty(credential) && (
                      <SectionedAccessoryTableCell
                        text={
                          credentialDisplayInfo![credential]!.label +
                          (!credentialDisplayInfo![credential]!.availability
                            ? ' (Not Configured)'
                            : '')
                        }
                        key={`${actionIndex}+${credIndex}`}
                        first={credIndex === 0}
                        disabled={
                          !credentialDisplayInfo![credential]!.availability
                        }
                        dimmed={
                          !credentialDisplayInfo![credential]!.availability
                        }
                        last={credIndex === availableCredentials.length - 1}
                        selected={() => {
                          return isCredentialRequiredForAction(
                            action,
                            credential
                          );
                        }}
                        onPress={() => {
                          onValueChanged(action, credential);
                        }}
                      />
                    )
                )}
            </Section>
          ))}
      </ScrollContainer>
    </Container>
  );
};
