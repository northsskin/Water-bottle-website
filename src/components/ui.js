/**
 * On phones the 3D canvas sits directly behind the copy — there is no empty
 * column to slide the bottle into — so every text block that would otherwise
 * overlap it gets a frosted card. On md and up the card dissolves and the text
 * sits on the plain background beside the bottle.
 */
export const glassOnMobile =
  'rounded-3xl border border-ink-900/6 bg-bone-50/75 p-7 shadow-soft backdrop-blur-md ' +
  'md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none'
