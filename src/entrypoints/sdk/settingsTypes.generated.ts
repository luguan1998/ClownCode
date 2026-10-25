// Auto-generated settings type. Inferred from the settings Zod schema in
// utils/settings/types.ts (single source of truth).

import type { z } from 'zod/v4'
import type { SettingsSchema } from '../../utils/settings/types.js'

export type Settings = z.infer<ReturnType<typeof SettingsSchema>>
