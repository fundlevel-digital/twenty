import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { RecordTableLookupTargetFieldSelectPage } from '@/object-record/record-column-lookup/components/RecordTableLookupTargetFieldSelectPage';
import { getLookupRelationSelection } from '@/object-record/record-column-lookup/utils/getLookupRelationSelection';
import { type ReactNode, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { Dropdown } from 'twenty-ui/components/navigation';

type LookupSelectPage = {
  id: string;
  label: string;
  relationPathFieldMetadataIds: string[];
};

type RecordTableLookupTargetFieldSelectMenuProps = {
  relationFieldMetadataItem: FieldMetadataItem;
  onSelect: (
    field: FieldMetadataItem,
    relationPathFieldMetadataIds: string[],
  ) => void;
  children?: ReactNode;
};

export const RecordTableLookupTargetFieldSelectMenu = ({
  relationFieldMetadataItem,
  onSelect,
  children,
}: RecordTableLookupTargetFieldSelectMenuProps) => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const [pages, setPages] = useState<LookupSelectPage[]>([]);
  const selection = getLookupRelationSelection({
    relationFieldMetadataItem,
    objectMetadataItems,
  });
  if (!isDefined(selection)) {
    return null;
  }
  const rootPage = {
    id: relationFieldMetadataItem.id,
    label: relationFieldMetadataItem.label,
    relationPathFieldMetadataIds: selection.relationPathFieldMetadataIds,
  };

  return (
    <>
      {[rootPage, ...pages].map((page) => (
        <Dropdown.Page key={page.id} id={page.id}>
          <RecordTableLookupTargetFieldSelectPage
            relationFieldMetadataItem={relationFieldMetadataItem}
            relationPathFieldMetadataIds={page.relationPathFieldMetadataIds}
            label={page.label}
            onNavigate={(nextPage) =>
              setPages((currentPages) =>
                currentPages.some(
                  (currentPage) => currentPage.id === nextPage.id,
                )
                  ? currentPages
                  : [...currentPages, nextPage],
              )
            }
            onSelect={onSelect}
          >
            {page.id === rootPage.id ? children : undefined}
          </RecordTableLookupTargetFieldSelectPage>
        </Dropdown.Page>
      ))}
    </>
  );
};
