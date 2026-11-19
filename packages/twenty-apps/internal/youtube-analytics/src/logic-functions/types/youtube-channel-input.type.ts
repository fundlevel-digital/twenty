export type YoutubeChannelInput =
  | { kind: 'id'; value: string }
  | { kind: 'handle'; value: string };
