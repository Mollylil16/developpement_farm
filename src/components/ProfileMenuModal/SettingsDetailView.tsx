/**
 * Vue détaillée des paramètres (sous-vues selon settingsTab)
 */

import React from 'react';
import SettingsAccountView from './settings/SettingsAccountView';
import SettingsSecurityView from './settings/SettingsSecurityView';
import SettingsNotificationsView from './settings/SettingsNotificationsView';
import SettingsPreferencesView from './settings/SettingsPreferencesView';
import SettingsMarketplaceView from './settings/SettingsMarketplaceView';

type SettingsTab = 'account' | 'security' | 'notifications' | 'preferences' | 'marketplace';

interface SettingsDetailViewProps {
  settingsTab: SettingsTab;
  onBack: () => void;
}

export default function SettingsDetailView({ settingsTab, onBack }: SettingsDetailViewProps) {
  switch (settingsTab) {
    case 'account':
      return <SettingsAccountView onBack={onBack} />;
    case 'security':
      return <SettingsSecurityView onBack={onBack} />;
    case 'notifications':
      return <SettingsNotificationsView onBack={onBack} />;
    case 'preferences':
      return <SettingsPreferencesView onBack={onBack} />;
    case 'marketplace':
      return <SettingsMarketplaceView onBack={onBack} />;
    default:
      return null;
  }
}
