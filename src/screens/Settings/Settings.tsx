import React from 'react';
import { Container } from './Settings.styled';
import { AuthSection } from './Sections/AuthSection';
import { CompanySection } from './Sections/CompanySection';

export const Settings = () => {
  return (
    <Container
      keyboardShouldPersistTaps={'always'}
      keyboardDismissMode={'interactive'}
    >
      {true && (
        <AuthSection
          title={'Account'}
          onAuthSuccess={() => {
            // this.dismiss();
          }}
        />
      )}
      <CompanySection title={'Standard Notes'} />
    </Container>
  );
};
