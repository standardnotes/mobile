import { isNullOrUndefined, SNNote } from '@standardnotes/snjs';
import React, { useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import WebView from 'react-native-webview';
import styled, { ThemeContext } from 'styled-components/native';
import { NoteText } from './NoteCell.styled';

const SimpleWebView = styled(WebView)<{
  width: number;
}>`
  flex: 1;
  background-color: transparent;
  opacity: 0.99;
  min-height: 1px;
  width: ${({ width }) => width}px;
  height: 25px;
`;

type Props = {
  showPreview: boolean;
  note: SNNote;
  highlight: boolean;
};

export const NotePreview = React.memo(
  ({ note, showPreview, highlight }: Props) => {
    const theme = useContext(ThemeContext);

    const { width } = useWindowDimensions();

    const hasPlainPreview =
      !isNullOrUndefined(note.preview_plain) && note.preview_plain.length > 0;

    const hasHtmlPreview =
      !isNullOrUndefined(note.preview_html) && note.preview_html.length > 0;

    if (hasPlainPreview && showPreview) {
      return (
        <NoteText selected={highlight} numberOfLines={2}>
          {note.preview_plain}
        </NoteText>
      );
    }

    if (hasHtmlPreview && showPreview) {
      const html = `<!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <style>
              * {
                font-size: ${theme.stylekitBaseFontSize};
                color: ${
                  highlight
                    ? theme.stylekitBackgroundColor
                    : theme.stylekitForegroundColor
                };
                margin-left: 0;
                margin-right: 0;
                max-width: 100%;
                overflow-x: hidden;
              }
            </style>
          </head>
          <body>${note.preview_html}</body>
        </html>`;

      return (
        <SimpleWebView
          width={width}
          originWhitelist={['*']}
          source={{ html }}
          scalesPageToFit={true}
          bounces={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (!hasPlainPreview && showPreview && note.safeText().length > 0) {
      return (
        <NoteText selected={highlight} numberOfLines={2}>
          {note.text}
        </NoteText>
      );
    }

    return <></>;
  }
);
