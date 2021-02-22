import { hexToRGBA } from '@Style/utils';
import styled from 'styled-components/native';

export const TouchableContainer = styled.TouchableWithoutFeedback``;
export const Container = styled.View<{ selected: boolean; padding: number }>`
  padding: ${props => props.padding}px;
  padding-right: ${props => props.padding * 2}px;
  border-bottom-color: ${({ theme }) =>
    hexToRGBA(theme.stylekitBorderColor, 0.75)};
  border-bottom-width: 1px;
  background-color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoColor : theme.stylekitBackgroundColor};
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
export const DetailsText = styled(TagText)`
  margin-right: 0px;
  margin-top: 5px;
`;
