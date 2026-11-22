import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';

export const StyledBetterListsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

export const StyledBetterListField = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;
