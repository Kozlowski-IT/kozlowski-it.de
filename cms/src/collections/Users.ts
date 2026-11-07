import type { CollectionConfig } from 'payload'
import { edgeHeaderStrategy } from '../auth/edgeHeader'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  // edge02-Header zuerst; die lokale Passwort-Strategie bleibt aktiv (Break-Glass, nur intern
  // erreichbar — edge02 sperrt die Passwort-Routen öffentlich).
  auth: { strategies: [edgeHeaderStrategy] },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
