/** /plugin settings screen types. */

export interface PluginSettingsProps {
  onComplete: (message?: string) => void
  /** Raw command args, e.g. "manage" or "install <plugin>". */
  args?: string
  showMcpRedirectMessage?: boolean
}

export type ViewState =
  | { type: 'help' }
  | { type: 'menu' }
  | { type: 'validate'; path?: string }
  | { type: 'marketplace-menu' }
  | { type: 'discover-plugins'; targetPlugin?: string }
  | {
      type: 'browse-marketplace'
      targetMarketplace: string
      targetPlugin?: string
    }
  | {
      type: 'manage-plugins'
      targetPlugin?: string
      targetMarketplace?: string
      action?: 'uninstall' | 'enable' | 'disable'
    }
  | { type: 'marketplace-list' }
  | { type: 'add-marketplace'; initialValue?: string }
  | {
      type: 'manage-marketplaces'
      targetMarketplace?: string
      action?: 'update' | 'remove'
    }
  | {
      type: 'failed-plugin-details'
      plugin: {
        id: string
        name: string
        marketplace: string
        errors: unknown[]
        scope: string
      }
    }
