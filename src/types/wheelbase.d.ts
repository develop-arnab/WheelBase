import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type El<P = object> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & P

type Theme = {
  'primary-color'?: string
  'secondary-color'?: string
  'text-color'?: string
  'text-secondary-color'?: string
  'surface-color'?: string
  'card-color'?: string
  'border-color'?: string
}

type Common = Theme & {
  'dealer-id'?: string
  locale?: string
  'store-type'?: 'rv' | 'auto'
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'wheelbase-store': El<Common & { 'hide-filters'?: boolean; 'hide-hero'?: boolean; 'show-reviews'?: boolean }>
      'wheelbase-rentals-list': El<Common & { filters?: string; locations?: string; 'hide-prices-until-dates'?: boolean }>
      'listing-details': El<Common & { 'rental-id'?: string; 'show-reviews'?: boolean; 'show-discount-code'?: boolean }>
      'landing-widget': El<Theme & { 'target-url'?: string; layout?: 'full' | 'horizontal' | 'compact'; 'show-times'?: boolean; locale?: string }>
    }
  }
}

export {}
