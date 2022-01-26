import { hexToRGBA } from '@Style/utils';
import { StyleSheet } from 'react-native';
import styled, { css } from 'styled-components/native';

export const TouchableContainer = styled.TouchableWithoutFeedback``;
export const Container = styled.View<{ selected: boolean; distance: number }>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding: ${props => props.distance}px 0 0 ${props => props.distance}px;
  background-color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoColor : theme.stylekitBackgroundColor};
`;
export const CustomFlexContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;
export const NoteDataContainer = styled.View<{ distance: number }>`
  border-bottom-color: ${({ theme }) =>
    hexToRGBA(theme.stylekitBorderColor, 0.75)};
  border-bottom-width: 1px;
  padding-bottom: ${props => props.distance}px;
  margin-left: 10px;
  flex-grow: 1;
  flex-shrink: 1;
  padding-right: ${props => props.distance}px;
`;
export const DeletedText = styled.Text`
  color: ${({ theme }) => theme.stylekitInfoColor};
  margin-bottom: 5px;
`;
export const NoteText = styled.Text<{ selected: boolean }>`
  font-size: 15px;
  margin-top: 4px;
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoContrastColor : theme.stylekitForegroundColor};
  opacity: 0.8;
  line-height: 21px;
`;
export const TitleText = styled.Text<{ selected: boolean }>`
  font-weight: bold;
  font-size: 16px;
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoContrastColor : theme.stylekitForegroundColor};
  flex-grow: 1;
  flex-shrink: 1;
`;
export const TagsContainter = styled.View`
  flex: 1;
  flex-direction: row;
  margin-top: 7px;
`;
export const TagText = styled.Text<{ selected: boolean }>`
  margin-right: 2px;
  font-size: 12px;
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoContrastColor : theme.stylekitForegroundColor};
  opacity: ${props => (props.selected ? 0.8 : 0.5)};
`;
export const DetailsText = styled(TagText)<{ first: boolean }>`
  margin-right: 0px;
  ${({ first }) =>
    !first &&
    css`
      margin-top: 5px;
    `}
`;
export const NoteTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;
export const styles = StyleSheet.create({
  editorIcon: {
    marginTop: 2,
    width: 16,
    height: 16,
  },
});
