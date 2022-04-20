import { useSignedIn } from '@Lib/SnjsHelperHooks'
import { ApplicationContext } from '@Root/ApplicationContext'
import { ModalStackNavigationProp } from '@Root/ModalStack'
import { SCREEN_SETTINGS } from '@Root/Screens/screens'
import { ApplicationEvent } from '@standardnotes/snjs'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { AuthSection } from './Sections/AuthSection'
import { CompanySection } from './Sections/CompanySection'
import { EncryptionSection } from './Sections/EncryptionSection'
import { OptionsSection } from './Sections/OptionsSection'
import { PreferencesSection } from './Sections/PreferencesSection'
import { ProtectionsSection } from './Sections/ProtectionsSection'
import { SecuritySection } from './Sections/SecuritySection'
import { Container } from './Settings.styled'

type Props = ModalStackNavigationProp<typeof SCREEN_SETTINGS>
export const Settings = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext)

  // State
  const [hasPasscode, setHasPasscode] = useState(() =>
    Boolean(application?.hasPasscode())
  )
  const [protectionsAvailable, setProtectionsAvailable] = useState(
    application?.hasProtectionSources()
  )
  const [encryptionAvailable, setEncryptionAvailable] = useState(() =>
    application?.isEncryptionAvailable()
  )

  const updateProtectionsAvailable = useCallback(() => {
    setProtectionsAvailable(application?.hasProtectionSources())
  }, [application])

  useEffect(() => {
    const removeApplicationEventSubscriber = application?.addEventObserver(
      async event => {
        if (event === ApplicationEvent.KeyStatusChanged) {
          setHasPasscode(Boolean(application?.hasPasscode()))
          updateProtectionsAvailable()
          setEncryptionAvailable(() => application?.isEncryptionAvailable())
        }
      }
    )
    return () => {
      removeApplicationEventSubscriber && removeApplicationEventSubscriber()
    }
  }, [application, updateProtectionsAvailable])

  const goBack = useCallback(() => {
    props.navigation.goBack()
  }, [props.navigation])

  const [signedIn] = useSignedIn(goBack)

  return (
    <Container
      keyboardShouldPersistTaps={'always'}
      keyboardDismissMode={'interactive'}
    >
      <AuthSection title="Account" signedIn={signedIn} />
      <OptionsSection
        encryptionAvailable={!!encryptionAvailable}
        title="Options"
      />
      <PreferencesSection />
      <SecuritySection
        encryptionAvailable={!!encryptionAvailable}
        hasPasscode={hasPasscode}
        updateProtectionsAvailable={updateProtectionsAvailable}
        title="Security"
      />
      <ProtectionsSection
        title="Protections"
        protectionsAvailable={protectionsAvailable}
      />
      <EncryptionSection
        encryptionAvailable={!!encryptionAvailable}
        title={'Encryption Status'}
      />
      <CompanySection title="Standard Notes" />
    </Container>
  )
}
