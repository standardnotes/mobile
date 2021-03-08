// eslint-disable-next-line no-shadow
export enum NoteSortKey {
  CreatedAt = 'created_at',
  UserUpdatedAt = 'userModifiedDate',
  Title = 'title',

  /** @legacy Use UserUpdatedAt instead */
  UpdatedAt = 'updated_at',
  /** @legacy Use UserUpdatedAt instead */
  ClientUpdatedAt = 'client_updated_at',
}
