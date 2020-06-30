import React, { useContext, useState, useEffect } from 'react';
import { TableSection } from '@Components/TableSection';
import { SectionHeader } from '@Components/SectionHeader';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { ButtonCell } from '@Components/ButtonCell';
import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { ApplicationContext } from '@Root/ApplicationContext';
import {
  RegistrationDescription,
  RegularView,
  RegistrationInput,
} from './AuthSection.styled';

const DEFAULT_SIGN_IN_TEXT = 'Sign In';
const DEFAULT_REGISTER_TEXT = 'Register';
const SIGNIN_IN = 'Generating Keys...';

type Props = {
  title: string;
  signedIn: boolean;
};

export const AuthSection = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [registering, setRegistering] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [strictSignIn, setStrictSignIn] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mfa, setMfa] = useState(false);
  const [mfaText, setMfaText] = useState('');
  const [mfaMessage, setMfaMessage] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [confirmRegistration, setConfirmRegistration] = useState(false);

  const signIn = async () => {
    setSigningIn(true);
    await application!.signIn(
      email,
      password,
      strictSignIn,
      undefined,
      undefined,
      undefined,
      true,
      false
    );
    setSigningIn(false);
  };

  const register = async () => {
    setRegistering(true);
    await application!.register(email, password, undefined, true);
    setRegistering(false);
  };

  // set initial server
  useEffect(() => {
    const getServer = async () => {
      const host = await application!.getHost();
      setServer(host!);
    };
    getServer();
  }, [application]);

  if (props.signedIn) {
    return null;
  }

  const _renderRegistrationConfirm = () => {
    return (
      <TableSection>
        <SectionHeader title={'Confirm Password'} />

        <RegistrationDescription>
          Due to the nature of our encryption, Standard Notes cannot offer
          password reset functionality. If you forget your password, you will
          permanently lose access to your data.
        </RegistrationDescription>

        <SectionedTableCell first textInputCell>
          <RegistrationInput
            testID="passwordConfirmationField"
            placeholder={'Password confirmation'}
            onChangeText={setPasswordConfirmation}
            value={passwordConfirmation}
            secureTextEntry
            autoFocus
            keyboardAppearance={application!
              .getThemeService()
              .keyboardColorForActiveTheme()}
          />
        </SectionedTableCell>

        <ButtonCell
          testID="registerConfirmButton"
          disabled={registering}
          title={registering ? 'Generating Keys...' : 'Register'}
          bold
          onPress={register}
        />

        <ButtonCell
          title="Cancel"
          onPress={() => setConfirmRegistration(false)}
        />
      </TableSection>
    );
  };

  const _renderDefaultContent = () => {
    const renderMfaSubcontent = () => {
      return (
        <RegularView>
          <RegistrationDescription>{mfaMessage}</RegistrationDescription>
          <SectionedTableCell textInputCell first>
            <RegistrationInput
              placeholder=""
              onChangeText={setMfaText}
              value={mfaText}
              keyboardType={'numeric'}
              keyboardAppearance={application!
                .getThemeService()
                .keyboardColorForActiveTheme()}
              autoFocus
              onSubmitEditing={() => {}}
            />
          </SectionedTableCell>
        </RegularView>
      );
    };

    const renderNonMfaSubcontent = () => {
      const keyboardApperance = application!
        .getThemeService()
        .keyboardColorForActiveTheme();
      return (
        <>
          <RegularView>
            <SectionedTableCell textInputCell first>
              <RegistrationInput
                testID="emailField"
                placeholder={'Email'}
                onChangeText={setEmail}
                value={email ?? undefined}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={'email-address'}
                textContentType={'emailAddress'}
                keyboardAppearance={keyboardApperance}
              />
            </SectionedTableCell>

            <SectionedTableCell textInputCell>
              <RegistrationInput
                testID="passwordField"
                placeholder={'Password'}
                onChangeText={setPassword}
                value={password ?? undefined}
                textContentType={'password'}
                secureTextEntry
                keyboardAppearance={keyboardApperance}
              />
            </SectionedTableCell>
          </RegularView>

          {(showAdvanced || !server) && (
            <RegularView>
              <SectionHeader title={'Advanced'} />
              <SectionedTableCell textInputCell first>
                <RegistrationInput
                  testID="syncServerField"
                  placeholder={'Sync Server'}
                  onChangeText={setServer}
                  value={server}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  keyboardType={'url'}
                  keyboardAppearance={keyboardApperance}
                />
              </SectionedTableCell>

              <SectionedAccessoryTableCell
                onPress={() => setStrictSignIn(!strictSignIn)}
                text={'Use strict sign in'}
                selected={() => {
                  return strictSignIn;
                }}
              />
            </RegularView>
          )}
        </>
      );
    };

    return (
      <TableSection>
        {props.title && <SectionHeader title={props.title} />}

        {mfa && renderMfaSubcontent()}

        {!mfa && renderNonMfaSubcontent()}

        <ButtonCell
          testID="signInButton"
          title={signingIn ? SIGNIN_IN : DEFAULT_SIGN_IN_TEXT}
          disabled={signingIn}
          bold={true}
          onPress={signIn}
        />

        {mfa && (
          <ButtonCell
            title={'Cancel'}
            disabled={signingIn}
            onPress={() => setMfa(false)}
          />
        )}

        {!mfa && (
          <ButtonCell
            testID="registerButton"
            title={DEFAULT_REGISTER_TEXT}
            disabled={registering}
            bold
            onPress={() => setConfirmRegistration(true)}
          />
        )}

        {!showAdvanced && !mfa && (
          <ButtonCell
            testID="otherOptionsButton"
            title="Other Options"
            onPress={() => setShowAdvanced(true)}
          />
        )}
      </TableSection>
    );
  };

  return (
    <RegularView>
      {confirmRegistration && _renderRegistrationConfirm()}

      {!confirmRegistration && _renderDefaultContent()}
    </RegularView>
  );
};
