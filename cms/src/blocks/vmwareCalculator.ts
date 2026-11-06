import type { Block, Field } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { ltext } from '../fields/common'

/** Auswahl-Optionen: value (für die Rechenlogik, fest) + label (Text). */
const options = (name: string): Field => ({
  name,
  type: 'array',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'value', type: 'text', required: true, admin: { width: '40%' } },
        ltext('label', { required: true, admin: { width: '60%' } }),
      ],
    },
  ],
})

/**
 * VMware-Ausstieg-Rechner (section.rechner-wrap). Texte im CMS; Standardwerte,
 * Vorauswahl und Rechenlogik bleiben im Code (assets/js/vmware-rechner.js + Template).
 */
export const vmwareCalculator: Block = {
  slug: 'vmwareCalculator',
  interfaceName: 'VmwareCalculatorBlock',
  fields: [
    ...sectionFields(),
    variantField(['default']),
    ltext('heading'),
    {
      name: 'labels',
      type: 'group',
      fields: [
        ltext('hosts'),
        ltext('vms'),
        ltext('sockets'),
        ltext('cores'),
        ltext('costLegend'),
        ltext('costKnown'),
        ltext('costEstimate'),
        ltext('vmwareCost'),
        ltext('vmwareCostPlaceholder'),
        ltext('edition'),
        ltext('estimateHint'),
        ltext('proxmoxTier'),
        ltext('contractEnd'),
        ltext('monthAria'),
        ltext('yearAria'),
        ltext('featuresLegend'),
        ltext('calculate'),
      ],
    },
    options('editions'),
    options('tiers'),
    options('months'),
    options('features'),
  ],
}
