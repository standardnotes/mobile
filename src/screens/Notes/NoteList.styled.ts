import { Platform, StyleSheet } from 'react-native';
import styled, { css } from 'styled-components/native';

// no support for generic types in Flatlist
export const styles = StyleSheet.create({
  list: {
    height: '100%',
  },
  inputStyle: {
    height: 30,
  },
  androidSearch: {
    height: 30,
  },
});

export const Container = styled.View`
  background-color: ${props => props.theme.stylekitBackgroundColor};
  flex: 1;
`;

export const LoadingContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

export const LoadingText = styled.Text`
  position: absolute;
  opacity: 0.5;
  color: ${props => props.theme.stylekitForegroundColor};
`;

export const HeaderContainer = styled.View`
  padding-top: 3px
  padding-left: 5px;
  padding-right: 5px;
`;

export const SearchBarContainer = styled.View`
  z-index: 2;
  elevation: 2;
`;

export const SearchOptionsContainer = styled.ScrollView`
  display: flex;
  flex-direction: row;
  margin-left: 8px;
  margin-bottom: 12px;
  ${() =>
    Platform.OS === 'android' &&
    css`
      padding-top: 4px;
    `}
`;
