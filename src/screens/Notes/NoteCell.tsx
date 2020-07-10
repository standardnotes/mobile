import { hexToRGBA } from '@Style/utils';
import React, { useRef, useState } from 'react';
import { SNNote } from 'snjs';
import styled from 'styled-components/native';
import { NoteCellFlags } from './NoteCellFlags';

type Props = {
  note: SNNote;
  highlighted?: boolean;
  onPressItem: (itemUuid: SNNote['uuid']) => void;
  renderTags: boolean;
  sortType: string;
  tagsString: string;
};

const TouchableContainer = styled.TouchableWithoutFeedback``;
const Container = styled.View<{ selected: boolean; padding: number }>`
  padding: ${props => props.padding}px;
  padding-right: ${props => props.padding * 2}px;
  border-bottom-color: ${({ theme }) =>
    hexToRGBA(theme.stylekitBorderColor, 0.75)};
  border-bottom-width: 1px;
  background-color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoColor : theme.stylekitBackgroundColor};
`;
const DeletedText = styled.Text`
  color: ${({ theme }) => theme.stylekitInfoColor};
  margin-bottom: 5px;
`;
const NoteText = styled.Text<{ selected: boolean }>`
  font-size: 15px;
  margin-top: 4px;
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoContrastColor : theme.stylekitForegroundColor};
  opacity: 0.8;
  line-height: 21px;
`;
const TitleText = styled.Text<{ selected: boolean }>`
  font-weight: bold;
  font-size: 16px;
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoContrastColor : theme.stylekitForegroundColor};
`;
const TagsContainter = styled.View`
  flex: 1;
  flex-direction: row;
  margin-top: 7px;
`;
const TagText = styled.Text<{ selected: boolean }>`
  margin-right: 2px;
  font-size: 12px;
  color: ${({ theme, selected }) =>
    selected ? theme.stylekitInfoContrastColor : theme.stylekitForegroundColor};
  opacity: ${props => (props.selected ? 0.8 : 0.5)};
`;
const DateText = styled(TagText)`
  margin-right: 0px;
  margin-top: 5px;
`;

export const NoteCell = (props: Props): JSX.Element => {
  const [selected, setSelected] = useState(false);
  const selectionTimeout = useRef<NodeJS.Timeout>();

  const highlight = Boolean(selected || props.highlighted);

  const _onPress = () => {
    setSelected(true);
    props.onPressItem(props.note.uuid);
    setSelected(false);
  };

  const _onPressIn = () => {
    // Debounce
    const delay = 25;
    selectionTimeout.current = setTimeout(() => {
      setSelected(true);
    }, delay);
  };

  const _onPressOut = () => {
    if (selectionTimeout.current) {
      clearTimeout(selectionTimeout.current);
    }
    setSelected(false);
  };

  const padding = 14;
  const { note } = props;
  const showPreview =
    // !this.state.options.hidePreviews &&
    !note.protected && !note.hidePreview;
  // const showTagsString =
  //   props.renderTags &&
  //   // !this.state.options.hideTags &&
  //   note.tags.length > 0 &&
  //   !note.protected;
  return (
    <TouchableContainer
      onPress={_onPress}
      onPressIn={_onPressIn}
      onPressOut={_onPressOut}
      // onLongPress={this.showActionSheet}
    >
      <Container selected={highlight} padding={padding}>
        {props.note.deleted && <DeletedText>Deleting...</DeletedText>}

        <NoteCellFlags note={note} highlight={highlight} />

        {note.errorDecrypting && (
          <NoteText selected={highlight} numberOfLines={2}>
            {'Please sign in to restore your decryption keys and notes.'}
          </NoteText>
        )}

        {note.safeTitle().length > 0 && (
          <TitleText selected={highlight}>{note.title}</TitleText>
        )}

        {note.preview_plain != null && showPreview && (
          <NoteText selected={highlight} numberOfLines={2}>
            {note.preview_plain}
          </NoteText>
        )}

        {!note.preview_plain && showPreview && note.safeText().length > 0 && (
          <NoteText selected={highlight} numberOfLines={2}>
            {note.text}
          </NoteText>
        )}

        {true && (
          <DateText numberOfLines={1} selected={highlight}>
            {props.sortType === 'client_updated_at'
              ? 'Modified ' + note.updatedAtString
              : note.createdAtString}
          </DateText>
        )}

        {false && (
          <TagsContainter>
            <TagText numberOfLines={1} selected={highlight}>
              {props.tagsString}
            </TagText>
          </TagsContainter>
        )}

        {/* {this.state.actionSheet && this.state.actionSheet} */}
      </Container>
    </TouchableContainer>
  );
};
