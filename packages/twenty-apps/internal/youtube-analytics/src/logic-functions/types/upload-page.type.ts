import { type UploadCandidate } from 'src/logic-functions/types/upload-candidate.type';

export type UploadPage = {
  candidates: UploadCandidate[];
  nextPageToken: string | undefined;
  rawItemCount: number;
};
