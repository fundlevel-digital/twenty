import styled from '@emotion/styled';
import { themeCssVariables as theme } from 'twenty-ui/theme';
export const Panel = styled.section`
  background: ${() => theme.background.primary};
  color: ${() => theme.font.color.primary};
  font-family: ${() => theme.font.family};
  font-size: ${() => theme.font.size.md};
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  padding: ${() => theme.spacing[4]};
  gap: ${() => theme.spacing[4]};
  box-sizing: border-box;
`;
export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${() => theme.spacing[2]};
  flex-wrap: wrap;
`;
export const Thread = styled.article`
  border: 1px solid ${() => theme.border.color.medium};
  border-radius: ${() => theme.border.radius.md};
  padding: ${() => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[3]};
  &:target {
    border-color: ${() => theme.color.blue};
  }
`;
export const Muted = styled.span`
  color: ${() => theme.font.color.tertiary};
`;
export const Body = styled.p`
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: ${() => theme.text.lineHeight.lg};
`;
export { Button } from 'twenty-ui/primitives/input';
export const ComposerBox = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[2]};
  border: 1px solid ${() => theme.border.color.medium};
  border-radius: ${() => theme.border.radius.md};
  padding: ${() => theme.spacing[2]};
  &:focus-within {
    border-color: ${() => theme.color.blue};
  }
`;
export const Textarea = styled.textarea`
  font: inherit;
  color: inherit;
  background: transparent;
  border: none;
  outline: none;
  resize: vertical;
  min-height: ${() => theme.spacing[16]};
  width: 100%;
  box-sizing: border-box;
  &::placeholder {
    color: ${() => theme.font.color.light};
  }
`;
export const Input = styled.input`
  font: inherit;
  color: inherit;
  background: ${() => theme.background.primary};
  border: 1px solid ${() => theme.border.color.medium};
  border-radius: ${() => theme.border.radius.md};
  padding: ${() => theme.spacing[2]};
  box-sizing: border-box;
  width: 100%;
`;
export const Reply = styled.div`
  border-left: 1px solid ${() => theme.border.color.light};
  padding-left: ${() => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[2]};
`;
