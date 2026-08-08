export type PresenceCursor = {
  from: number;
  to: number;
};

export type PresencePeer = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  color: string;
  cursor?: PresenceCursor;
  updatedAt: number;
};
