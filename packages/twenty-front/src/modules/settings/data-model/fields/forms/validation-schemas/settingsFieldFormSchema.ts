import { settingsFieldComputationSchema } from '@/settings/data-model/fields/forms/validation-schemas/settingsFieldComputationSchema';
import { settingsDataModelFieldDescriptionFormSchema } from '@/settings/data-model/fields/forms/components/SettingsDataModelFieldDescriptionForm';
import { settingsDataModelFieldIconLabelFormSchema } from '@/settings/data-model/fields/forms/components/SettingsDataModelFieldIconLabelForm';
import { settingsDataModelFieldSettingsFormSchema } from '@/settings/data-model/fields/forms/validation-schemas/settingsDataModelFieldSettingsFormSchema';
import { isDefined } from 'twenty-shared/utils';
import { z } from 'zod';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import { settingsDataModelFieldTypeFormSchema } from '@/settings/data-model/fields/forms/validation-schemas/settingsDataModelFieldTypeFormSchema';

type SettingsFieldFormSchemaOptions = {
  existingOtherLabels?: string[];
  sourceObjectMetadataId?: string;
};

export const settingsFieldFormSchema = (
  options: SettingsFieldFormSchemaOptions = {},
) => {
  const { existingOtherLabels, sourceObjectMetadataId } = options;

  const baseSchema = z
    .object({})
    .extend(
      settingsDataModelFieldIconLabelFormSchema(existingOtherLabels).shape,
    )
    .extend(settingsDataModelFieldDescriptionFormSchema().shape)
    .extend(settingsDataModelFieldTypeFormSchema.shape)
    .and(
      z.union([
        settingsDataModelFieldSettingsFormSchema.and(
          z.object({ computation: z.null().optional() }),
        ),
        z
          .object({
            type: z.enum([
              FieldMetadataType.NUMBER,
              FieldMetadataType.TEXT,
              FieldMetadataType.BOOLEAN,
              FieldMetadataType.DATE,
              FieldMetadataType.DATE_TIME,
              FieldMetadataType.SELECT,
            ]),
            computation: settingsFieldComputationSchema,
            settings: z.unknown().optional(),
            options: z.unknown().optional(),
          })
          .refine(
            (data) =>
              data.type !== FieldMetadataType.SELECT ||
              data.computation.kind === 'FORMULA',
          ),
      ]),
    )
    .refine((data) => {
      const formData = data as {
        type?: FieldMetadataType;
        morphRelationObjectMetadataIds?: string[];
      };
      if (formData.type !== FieldMetadataType.MORPH_RELATION) {
        return true;
      }
      if (!isDefined(sourceObjectMetadataId)) {
        return true;
      }
      if (
        !isDefined(formData.morphRelationObjectMetadataIds) ||
        formData.morphRelationObjectMetadataIds.length <= 1
      ) {
        return true;
      }
      if (
        formData.morphRelationObjectMetadataIds.includes(sourceObjectMetadataId)
      ) {
        return false;
      }
      return true;
    });

  return baseSchema;
};
