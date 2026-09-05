import Glass from './parts/Glass.jsx'
import PourStream from './parts/PourStream.jsx'
import Splash from './parts/Splash.jsx'

/**
 * Everything the pour needs that is not part of the bottle: the tumbler, the
 * water in the air, and the spray where it lands. Kept as siblings of the
 * bottle rather than children, because none of them should inherit its tilt.
 *
 * Each piece retires itself when the pour section is off screen, so this costs
 * a handful of culled draw calls for the rest of the page.
 */
export default function PourScene({ quality, reducedMotion }) {
  return (
    <>
      <Glass quality={quality} />
      <PourStream />
      {/* Individual droplets are the first thing to go when motion is reduced
          or the GPU is weak; the stream alone still reads as a pour. */}
      {!reducedMotion && quality.splash ? <Splash /> : null}
    </>
  )
}
