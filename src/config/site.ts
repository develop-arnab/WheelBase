/*
  One place for brand, navigation and integration settings.
*/
export const site = {
  name: 'Premium Jeep Rentals',
  tagline: 'For when “a rental car” just won’t do.',
  legalName: 'DWPT LLC',
  region: 'Boston, Cape Cod, Nantucket and Martha’s Vineyard',
  nav: [
    { label: 'Places', href: '#places' },
    { label: 'How it works', href: '#how' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
} as const

/*
  Wheelbase (Phase 2). Set VITE_WHEELBASE_DEALER_ID in .env.local and
  "Reserve" opens the live Wheelbase store instead of the Phase 1 request sheet.
  Docs: https://docs.wheelbasepro.com/docs
*/
export const wheelbase = {
  dealerId: (import.meta.env.VITE_WHEELBASE_DEALER_ID as string | undefined) || '',
  scriptUrl: 'https://d2toxav8qvoos4.cloudfront.net/latest/wheelbase-widget.js',
  locale: 'en-us',
  storeType: 'auto',
  theme: {
    primaryColor: '#c2413b',
    secondaryColor: '#3a4f66',
    textColor: '#0b2540',
    textSecondaryColor: '#6b7d8f',
    surfaceColor: '#ffffff',
    cardColor: '#ffffff',
    borderColor: '#d6dfe7',
  },
} as const
