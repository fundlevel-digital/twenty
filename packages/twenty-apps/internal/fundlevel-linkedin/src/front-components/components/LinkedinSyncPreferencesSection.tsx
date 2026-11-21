import { t } from 'twenty-sdk/front-component';
import { Section } from 'twenty-ui/components/layout';
import { IconBrandLinkedin, IconMail } from 'twenty-ui/icon';
import { LinkedinVisibilityIcon } from 'src/front-components/components/LinkedinVisibilityIcon';
import { SettingsRadioCard } from 'src/front-components/components/SettingsRadioCard';
import { StyledSettingsCard } from 'src/front-components/components/StyledSettingsCard';
import { SettingsOptionCardContentToggle } from 'src/front-components/components/SettingsOptionCardContentToggle';
import { type LinkedinSettings } from 'src/types/linkedin-settings.type';

type LinkedinSyncPreferencesSectionProps = {
  settings: LinkedinSettings;
  isConnectionPrivacyReady: boolean;
  onChange: (update: Partial<LinkedinSettings>) => void;
};
export const LinkedinSyncPreferencesSection = ({
  settings,
  isConnectionPrivacyReady,
  onChange,
}: LinkedinSyncPreferencesSectionProps) => (
  <>
    <Section.Root>
      <Section.Header
        title={t('Connection Visibility')}
        description={t(
          'Choose who can see your LinkedIn connections and invitations. Message visibility is configured separately.',
        )}
      />
      <SettingsRadioCard
        value={settings.connectionsVisibility ?? 'WORKSPACE'}
        onChange={(connectionsVisibility) =>
          onChange({ connectionsVisibility })
        }
        options={[
          {
            value: 'WORKSPACE',
            cardMedia: <LinkedinVisibilityIcon isBodyActive />,
            title: t('Workspace'),
            description: t(
              'Everyone in your workspace can see your connections.',
            ),
          },
          {
            value: 'OWNER',
            isDisabled: !isConnectionPrivacyReady,
            cardMedia: <LinkedinVisibilityIcon isBodyActive={false} />,
            title: t('Only Me'),
            description: isConnectionPrivacyReady
              ? t('Only you can see your connections.')
              : t('An administrator must enable private connections first.'),
          },
        ]}
      />
    </Section.Root>
    <Section.Root>
      <Section.Header
        title={t('LinkedIn Inboxes')}
        description={t('Choose which additional inboxes to sync.')}
      />
      <StyledSettingsCard>
        <SettingsOptionCardContentToggle
          Icon={IconBrandLinkedin}
          title={t('Sales Navigator')}
          description={t('Include Sales Navigator conversations')}
          checked={settings.areSalesNavigatorChatsImported !== false}
          onChange={(areSalesNavigatorChatsImported) =>
            onChange({ areSalesNavigatorChatsImported })
          }
          divider
        />
        <SettingsOptionCardContentToggle
          Icon={IconMail}
          title={t('InMail')}
          description={t('Include InMail conversations')}
          checked={settings.areInMailChatsImported !== false}
          onChange={(areInMailChatsImported) =>
            onChange({ areInMailChatsImported })
          }
        />
      </StyledSettingsCard>
    </Section.Root>
  </>
);
