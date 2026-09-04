export const PRODUCT = {
  brand: 'AQUEM',
  name: 'Vessel One',
  tagline: 'A bottle built to disappear into your day — and to keep 750 ml ice-cold for 24 hours.',
}

export const COLORS = [
  { id: 'sage', label: 'Sage', hex: '#8ea28c' },
  { id: 'slate', label: 'Slate', hex: '#5b6570' },
  { id: 'clay', label: 'Clay', hex: '#c07a5c' },
  { id: 'ink', label: 'Ink', hex: '#22262c' },
  { id: 'glacier', label: 'Glacier', hex: '#9fc4d6' },
  { id: 'bone', label: 'Bone', hex: '#e6e1d6' },
]

export const FINISHES = [
  { id: 'gloss', label: 'Gloss', note: 'Polished, high-clarity shell' },
  { id: 'frosted', label: 'Frosted', note: 'Soft-touch matte, fingerprint-proof' },
  { id: 'chrome', label: 'Chrome', note: 'Mirror-finished steel, fully opaque' },
]

export const CAPACITIES = [
  { id: 500, label: '500 ml', sub: 'Everyday', scale: 0.86, weight: '286 g', height: '22.4 cm' },
  { id: 750, label: '750 ml', sub: 'Signature', scale: 1, weight: '340 g', height: '26.8 cm' },
  { id: 1000, label: '1 L', sub: 'Trail', scale: 1.12, weight: '392 g', height: '30.1 cm' },
]

export const FEATURES = [
  {
    id: 'insulation',
    focus: 'body',
    icon: 'thermometer',
    title: '24 hours cold, 12 hours hot',
    body: 'A double-wall vacuum chamber sits between two shells of 18/8 steel, so the outside stays dry and the inside stays exactly where you left it.',
    stat: '24 h',
    statLabel: 'cold retention',
  },
  {
    id: 'cap',
    focus: 'cap',
    icon: 'cap',
    title: 'One-turn leakproof cap',
    body: 'A machined thread and a food-grade silicone gasket seal in a single quarter-turn. The loop is cast into the cap, not glued on, so it will not shear off in a pack.',
    stat: '1/4',
    statLabel: 'turn to seal',
  },
  {
    id: 'capacity',
    focus: 'label',
    icon: 'drop',
    title: '750 ml, in a one-hand grip',
    body: 'A 68 mm barrel clears every cup holder and bike cage we could find, while the tapered waist keeps the centre of gravity low when it is full.',
    stat: '68 mm',
    statLabel: 'barrel diameter',
  },
  {
    id: 'eco',
    focus: 'base',
    icon: 'leaf',
    title: '90% recycled, 100% recyclable',
    body: 'The shell is recycled steel, the cap is bio-based resin, and the whole bottle comes apart with a coin so every part can be recycled separately.',
    stat: '90%',
    statLabel: 'recycled steel',
  },
]

export const SPECS = [
  { label: 'Capacity', value: '500 ml · 750 ml · 1 L' },
  { label: 'Height', value: '26.8 cm (750 ml)' },
  { label: 'Barrel diameter', value: '68 mm' },
  { label: 'Weight, empty', value: '340 g (750 ml)' },
  { label: 'Shell', value: '18/8 stainless, 90% recycled' },
  { label: 'Insulation', value: 'Double-wall vacuum' },
  { label: 'Cap', value: 'Bio-resin, silicone gasket' },
  { label: 'Mouth opening', value: '42 mm — fits ice cubes' },
  { label: 'Finish', value: 'Gloss · Frosted · Chrome' },
  { label: 'Dishwasher', value: 'Top rack safe' },
  { label: 'Certification', value: 'BPA-free, LFGB tested' },
  { label: 'Warranty', value: 'Lifetime on the vacuum seal' },
]
