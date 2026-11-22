import styled from '@emotion/styled';
import { themeCssVariables as theme } from 'twenty-ui/theme';
export { Button } from 'twenty-ui/primitives/input';
export const Panel = styled.section`
  background: ${() => theme.background.primary};
  color: ${() => theme.font.color.primary};
  font-family: ${() => theme.font.family};
  font-size: ${() => theme.font.size.md};
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;
export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${() => theme.spacing[2]};
  min-width: 0;
`;
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${() => theme.spacing[2]} ${() => theme.spacing[3]};
  border-bottom: 1px solid ${() => theme.border.color.light};
`;
export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[4]};
  overflow: auto;
  padding: ${() => theme.spacing[3]};
  min-height: 0;
`;
export const Thread = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[2]};
  padding: ${() => theme.spacing[3]};
  border: 1px solid ${() => theme.border.color.light};
  border-radius: ${() => theme.border.radius.md};
  &:hover [data-comment-actions],
  &:focus-within [data-comment-actions] {
    opacity: 1;
  }
`;
export const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${() => theme.spacing[2]};
  min-width: 0;
`;
export const Actions = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity calc(${() => theme.animation.duration.fast} * 1s);
  &:focus-within {
    opacity: 1;
  }
  @media (hover: none) {
    opacity: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
export const Body = styled.p`
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: ${() => theme.text.lineHeight.lg};
`;
export const MessageBody = styled.div`
  padding-left: ${() => theme.spacing[6]};
`;
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
export const ComposerInput = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${() => theme.spacing[2]};
`;
export const ComposerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: ${() => theme.spacing[6]};
`;
export const Textarea = styled.textarea`
  font: inherit;
  line-height: ${() => theme.text.lineHeight.lg};
  color: inherit;
  background: transparent;
  border: none;
  outline: none;
  resize: vertical;
  min-height: ${() => theme.spacing[12]};
  flex: 1;
  min-width: 0;
  padding: 0;
  &::placeholder {
    color: ${() => theme.font.color.light};
  }
`;
export const Reply = styled.div`
  border-left: 1px solid ${() => theme.border.color.light};
  margin-left: ${() => theme.spacing[2]};
  padding-left: ${() => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[2]};
`;
export const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${() => theme.spacing[8]} ${() => theme.spacing[4]};
  gap: ${() => theme.spacing[2]};
  color: ${() => theme.font.color.tertiary};
`;
export const Notice = styled.div`
  border: 1px solid ${() => theme.border.color.light};
  border-radius: ${() => theme.border.radius.md};
  padding: ${() => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${() => theme.spacing[2]};
`;
export const InlineMention = styled.span`
  color: ${() => theme.color.blue};
  font-weight: ${() => theme.font.weight.medium};
`;
