import { EffectComposer, Bloom, Vignette, DepthOfField, SMAA } from '@react-three/postprocessing'

/**
 * The cinematic layer. Lives in the lazily-loaded 3D chunk, and only mounts at
 * all above the bottom tier — the page is fully functional without it.
 *
 * Bloom is set to a high threshold on purpose: it should catch the specular hits
 * on the cap and the bright waterline, not wash the whole bone-coloured page.
 */
export default function Effects({ quality, focusDistance }) {
  if (!quality.bloom) return null

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* The page is bone-white, which sits close to the bloom threshold all by
          itself. Kept high and gentle so only true speculars — the cap, the
          waterline — pick up a glow, rather than the whole background hazing. */}
      <Bloom intensity={0.34} luminanceThreshold={0.95} luminanceSmoothing={0.12} mipmapBlur />
      {quality.depthOfField ? (
        <DepthOfField focusDistance={focusDistance} focalLength={0.06} bokehScale={2.4} />
      ) : null}
      <Vignette offset={0.5} darkness={0.26} />
      <SMAA />
    </EffectComposer>
  )
}
