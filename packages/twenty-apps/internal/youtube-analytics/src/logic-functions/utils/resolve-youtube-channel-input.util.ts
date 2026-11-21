import { type YoutubeChannelRecordIdentity } from 'src/logic-functions/types/youtube-channel-record-identity.type';
import { type YoutubeChannelInput } from 'src/logic-functions/types/youtube-channel-input.type';
import { isDefined } from 'src/utils/is-defined';

export const resolveYoutubeChannelInput = (
  identity: YoutubeChannelRecordIdentity,
): YoutubeChannelInput | null => {
  if (identity.youtubeId?.startsWith('UC') === true) {
    return { kind: 'id', value: identity.youtubeId };
  }

  const urlChannelId = identity.youtubeUrl?.match(
    /youtube\.com\/channel\/(UC[0-9A-Za-z_-]{22})/,
  )?.[1];

  if (isDefined(urlChannelId)) {
    return { kind: 'id', value: urlChannelId };
  }

  const handle =
    identity.youtubeHandle ??
    identity.youtubeUrl?.match(/youtube\.com\/@([^/?#]+)/)?.[1];

  if (!isDefined(handle)) {
    return null;
  }

  return { kind: 'handle', value: handle.replace(/^@/, '') };
};
