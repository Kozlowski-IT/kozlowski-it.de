import type { Block } from 'payload'
import { hero } from './hero'
import { text } from './text'
import { cards } from './cards'
import { steps } from './steps'
import { faq } from './faq'
import { ctaBar } from './ctaBar'
import { figure } from './figure'
import { contactForm } from './contactForm'
import { vmwareCalculator } from './vmwareCalculator'

/** Bausteinkatalog (Spec §4.3, Migrations-Teilmenge). */
export const blocks: Block[] = [
  hero,
  text,
  cards,
  steps,
  faq,
  ctaBar,
  figure,
  contactForm,
  vmwareCalculator,
]
