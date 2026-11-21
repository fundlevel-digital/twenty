export type ProviderMessageMetadata = {
  permalink?: string;
  editedAt?: string;
  deletedAt?: string;
  reactions?: { name: string; count: number; users: string[] }[];
  updatedAt: string;
};
