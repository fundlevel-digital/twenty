export type ListOption = {
  id: string;
  value: string;
  label: string;
  position: number;
  color: string;
};
export type ListObject = {
  id: string;
  nameSingular: string;
  namePlural: string;
  labelPlural: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  isSystem: boolean;
  fieldsList: {
    id: string;
    name: string;
    type: string;
    options: ListOption[] | null;
  }[];
};
export type ListConfiguration = {
  parentObjectName: string;
  emoji: string;
  slug: string;
};
export type NavigationItem = {
  id: string;
  type: string;
  name: string | null;
  parentId: string | null;
  targetObjectMetadataId: string | null;
  userWorkspaceId: string | null;
  position: number;
};
