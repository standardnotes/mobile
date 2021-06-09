import { SectionedAccessoryTableCell } from '@Components/SectionedAccessoryTableCell';
import { SectionHeader } from '@Components/SectionHeader';
import { TableSection } from '@Components/TableSection';
import { PrefKey } from '@Lib/preferences_manager';
import { ApplicationContext } from '@Root/ApplicationContext';
import { CollectionSort } from '@standardnotes/snjs';
import React, { useContext, useMemo, useState } from 'react';

export const PreferencesSection = () => {
  // Context
  const application = useContext(ApplicationContext);

  // State
  const [sortBy, setSortBy] = useState<CollectionSort>(() =>
    application!
      .getLocalPreferences()
      .getValue(PrefKey.SortNotesBy, CollectionSort.CreatedAt)
  );
  const [sortReverse, setSortReverse] = useState<boolean>(() =>
    application!.getLocalPreferences().getValue(PrefKey.SortNotesReverse, false)
  );
  const [hideDates, setHideDates] = useState<boolean>(() =>
    application!.getLocalPreferences().getValue(PrefKey.NotesHideDate, false)
  );
  const [hidePreviews, setHidePreviews] = useState<boolean>(() =>
    application!
      .getLocalPreferences()
      .getValue(PrefKey.NotesHideNotePreview, false)
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
      ?.getLocalPreferences()
      .setUserPrefValue(PrefKey.SortNotesReverse, !sortReverse);
    setSortReverse(value => !value);
  };

  const changeSortOption = (key: CollectionSort) => {
    application
      ?.getLocalPreferences()
      .setUserPrefValue(PrefKey.SortNotesBy, key);
    setSortBy(key);
  };
  const toggleNotesPreviewHidden = () => {
    application
      ?.getLocalPreferences()
      .setUserPrefValue(PrefKey.NotesHideNotePreview, !hidePreviews);
    setHidePreviews(value => !value);
  };
  const toggleNotesDateHidden = () => {
    application
      ?.getLocalPreferences()
      .setUserPrefValue(PrefKey.NotesHideDate, !hideDates);
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
          onPress={toggleNotesDateHidden}
          text={'Hide note dates'}
          last
          selected={() => hideDates}
        />
      </TableSection>
    </>
  );
};
