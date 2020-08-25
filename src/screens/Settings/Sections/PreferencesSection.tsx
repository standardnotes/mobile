import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { ApplicationContext } from '@Root/ApplicationContext';
import React, { useContext, useMemo, useState } from 'react';
import { CollectionSort, MobilePrefKey } from 'snjs';

export const PreferencesSection = () => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [sortBy, setSortBy] = useState<CollectionSort>(() =>
    application!
      .getPrefsService()
      .getValue(MobilePrefKey.SortNotesBy, CollectionSort.UpdatedAt)
  );
  const [sortReverse, setSortReverse] = useState<boolean>(() =>
    application!
      .getPrefsService()
      .getValue(MobilePrefKey.SortNotesReverse, false)
  );
  const [hideDates, setHideDates] = useState<boolean>(() =>
    application!.getPrefsService().getValue(MobilePrefKey.NotesHideDate, false)
  );
  const [hidePreviews, setHidePreviews] = useState<boolean>(() =>
    application!
      .getPrefsService()
      .getValue(MobilePrefKey.NotesHideNotePreview, false)
  );
  const [hideTags, setHideTags] = useState<boolean>(() =>
    application!.getPrefsService().getValue(MobilePrefKey.NotesHideTags, false)
  );

  const sortOptions = useMemo(() => {
    return [
      { key: CollectionSort.CreatedAt, label: 'Date Added' },
      { key: CollectionSort.UpdatedAt, label: 'Date Modified' },
      { key: CollectionSort.Title, label: 'Title' },
    ];
  }, []);

  const toggleReverseSort = () => {
    application
      ?.getPrefsService()
      .setUserPrefValue(MobilePrefKey.SortNotesReverse, !sortReverse, true);
    setSortReverse(value => !value);
  };

  const changeSortOption = (key: CollectionSort) => {
    application
      ?.getPrefsService()
      .setUserPrefValue(MobilePrefKey.SortNotesBy, key, true);
    setSortBy(key);
  };

  const toggleNotesTagsHidden = () => {
    application
      ?.getPrefsService()
      .setUserPrefValue(MobilePrefKey.NotesHideTags, !hideTags, true);
    setHideTags(value => !value);
  };
  const toggleNotesPreviewHidden = () => {
    application
      ?.getPrefsService()
      .setUserPrefValue(
        MobilePrefKey.NotesHideNotePreview,
        !hidePreviews,
        true
      );
    setHidePreviews(value => !value);
  };
  const toggleNotesDateHidden = () => {
    application
      ?.getPrefsService()
      .setUserPrefValue(MobilePrefKey.NotesHideDate, !hideDates, true);
    setHideDates(value => !value);
  };

  return (
    <>
      <TableSection>
        <SectionHeader
          title={'Sort Notes By'}
          buttonText={
            sortReverse ? 'Disable Reverse Sort' : 'Enable Reverse Sort'
          }
          buttonAction={toggleReverseSort}
        />
        {sortOptions.map((option, i) => {
          return (
            <SectionedAccessoryTableCell
              onPress={() => {
                changeSortOption(option.key);
              }}
              text={option.label}
              key={option.key}
              first={i === 0}
              last={i === sortOptions.length - 1}
              selected={() => option.key === sortBy}
            />
          );
        })}
      </TableSection>

      <TableSection>
        <SectionHeader title={'Note List Options'} />

        <SectionedAccessoryTableCell
          onPress={toggleNotesPreviewHidden}
          text={'Hide note previews'}
          first
          selected={() => hidePreviews}
        />

        <SectionedAccessoryTableCell
          onPress={toggleNotesTagsHidden}
          text={'Hide note tags'}
          selected={() => hideTags}
        />

        <SectionedAccessoryTableCell
          onPress={toggleNotesDateHidden}
          text={'Hide note dates'}
          last
          selected={() => hideDates}
        />
      </TableSection>
    </>
  );
};
