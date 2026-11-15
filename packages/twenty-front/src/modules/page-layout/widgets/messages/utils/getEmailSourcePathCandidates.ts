import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export type EmailSourcePathCandidate = {
  fieldMetadataIds: string[];
  fieldLabels: string[];
};

const PERSON_OBJECT_NAME_SINGULAR = 'person';
const MAX_EMAIL_SOURCE_PATH_LENGTH = 4;
const MAX_EMAIL_SOURCE_PATH_CANDIDATES = 50;

// Mirrors the server walk: relation hops only, never through system objects or back through a visited object
export const getEmailSourcePathCandidates = ({
  rootObjectMetadataItem,
  objectMetadataItems,
}: {
  rootObjectMetadataItem: EnrichedObjectMetadataItem;
  objectMetadataItems: EnrichedObjectMetadataItem[];
}): EmailSourcePathCandidate[] => {
  const objectMetadataItemById = new Map(
    objectMetadataItems.map((objectMetadataItem) => [
      objectMetadataItem.id,
      objectMetadataItem,
    ]),
  );

  const candidates: EmailSourcePathCandidate[] = [];

  let frontier = [
    {
      objectMetadataItem: rootObjectMetadataItem,
      candidate: { fieldMetadataIds: [], fieldLabels: [] },
      visitedObjectIds: new Set([rootObjectMetadataItem.id]),
    },
  ] as {
    objectMetadataItem: EnrichedObjectMetadataItem;
    candidate: EmailSourcePathCandidate;
    visitedObjectIds: Set<string>;
  }[];

  for (let depth = 0; depth < MAX_EMAIL_SOURCE_PATH_LENGTH; depth++) {
    const nextFrontier: typeof frontier = [];

    for (const {
      objectMetadataItem,
      candidate,
      visitedObjectIds,
    } of frontier) {
      for (const field of objectMetadataItem.fields) {
        const targetObjectId = field.relation?.targetObjectMetadata.id;

        if (
          field.type !== FieldMetadataType.RELATION ||
          !field.isActive ||
          !isDefined(targetObjectId) ||
          visitedObjectIds.has(targetObjectId)
        ) {
          continue;
        }

        const targetObjectMetadataItem =
          objectMetadataItemById.get(targetObjectId);

        if (!isDefined(targetObjectMetadataItem)) {
          continue;
        }

        const nextCandidate = {
          fieldMetadataIds: [...candidate.fieldMetadataIds, field.id],
          fieldLabels: [...candidate.fieldLabels, field.label],
        };

        if (
          targetObjectMetadataItem.nameSingular === PERSON_OBJECT_NAME_SINGULAR
        ) {
          candidates.push(nextCandidate);

          if (candidates.length >= MAX_EMAIL_SOURCE_PATH_CANDIDATES) {
            return candidates;
          }

          continue;
        }

        if (targetObjectMetadataItem.isSystem) {
          continue;
        }

        nextFrontier.push({
          objectMetadataItem: targetObjectMetadataItem,
          candidate: nextCandidate,
          visitedObjectIds: new Set([...visitedObjectIds, targetObjectId]),
        });
      }
    }

    frontier = nextFrontier;
  }

  return candidates;
};
