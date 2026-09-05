import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sectionProgress } from '../../scroll/scrollState.js'
import { bottleRuntime } from '../runtime.js'
import { GLASS, lipDirection, lipPoint, pourPhases } from '../pour.js'

/**
 * The water in the air between the lip and the glass.
 *
 * The mesh is a plain unit cylinder — radius 1, running 0→1 along +Y — and the
 * vertex shader sweeps it along a quadratic Bézier each frame. That curve is a
 * parabola, which is the path the water actually takes, and it costs two
 * uniforms rather than a TubeGeometry rebuilt every frame.
 *
 * Sweeping in the shader is also what makes the surface shade correctly. The
 * previous version displaced positions and left the normals cylindrical, so the
 * bulges travelling down the stream moved the silhouette but never caught the
 * light — which is exactly why it read as a flat band of colour rather than a
 * round column of water. Here the frame is rebuilt per vertex and the normal is
 * derived from it, including the radius slope, so the stream has a highlight
 * running down it and the pulses are visible as shading rather than only as
 * outline.
 */
export default function PourStream() {
  const geometry = useMemo(() => {
    // A cylinder of radius 1 from y=0 to y=1, open at both ends. Every vertex
    // therefore arrives at the shader with position.y = t along the stream and
    // position.xz = its direction around the circle, which is all the sweep
    // needs. Enough height segments to bend smoothly, enough radial ones that
    // the silhouette is round rather than faceted.
    const HEIGHT_SEGMENTS = 48
    const RADIAL = 24
    const points = []
    for (let i = 0; i <= HEIGHT_SEGMENTS; i++) {
      points.push(new THREE.Vector2(1, i / HEIGHT_SEGMENTS))
    }
    return new THREE.LatheGeometry(points, RADIAL)
  }, [])

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#6ec4e8'),
      roughness: 0.04,
      metalness: 0,
      ior: 1.333,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      side: THREE.DoubleSide,
    })

    const uniforms = {
      uTime: { value: 0 },
      uControl: { value: new THREE.Vector3() },
      uEnd: { value: new THREE.Vector3() },
      uRadius: { value: 0.05 },
      uWobble: { value: 0.012 },
      // Visible span of the stream. The head falls when the pour starts and the
      // tail drains from the lip when it stops.
      uHead: { value: 0 },
      uTail: { value: 0 },
    }
    m.userData.uniforms = uniforms

    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.uniforms.uRimColor = { value: new THREE.Color('#e2f7ff') }

      shader.vertexShader =
        `uniform float uTime;
         uniform vec3 uControl;
         uniform vec3 uEnd;
         uniform float uRadius;
         uniform float uWobble;
         uniform float uHead;
         uniform float uTail;

         // Quadratic Bézier with p0 at the origin: the mesh is positioned at
         // the lip, so the whole curve is expressed relative to it.
         vec3 bezier(float t) {
           float u = 1.0 - t;
           return 2.0 * u * t * uControl + t * t * uEnd;
         }
         vec3 bezierTangent(float t) {
           return 2.0 * (1.0 - 2.0 * t) * uControl + 2.0 * t * uEnd;
         }

         // Lateral meander, growing with the fall. Real streams are never
         // perfectly plumb.
         vec3 meander(float t) {
           float a = uWobble * t * t;
           return vec3(sin(t * 13.0 - uTime * 7.0) * a * 0.6,
                       0.0,
                       cos(t * 11.0 - uTime * 6.0) * a);
         }

         float streamRadius(float t) {
           // Water clings and swells where it leaves the rim, then narrows:
           // a falling stream accelerates, so the same volume per second has
           // to fit through less cross-section. Gentle, because over 10cm the
           // real narrowing is slight — the old 1.0 -> 0.3 was an 11x area
           // change, which is a cone, not a stream.
           float swell = 1.0 + 0.34 * exp(-t * 11.0);
           float taper = mix(1.0, 0.58, sqrt(t));

           // Travelling volume pulses. Low frequency and generous amplitude on
           // purpose: at the size this draws on screen the previous settings
           // moved the silhouette by about a pixel, which is indistinguishable
           // from a smooth cone. Two slow waves plus a faster one that only
           // appears in the lower half, where a real stream starts to break up.
           float pulse = sin(t * 12.0 - uTime * 8.0) * 0.10
                       + sin(t * 19.0 - uTime * 13.0) * 0.06;
           pulse += sin(t * 31.0 - uTime * 21.0) * 0.07 * smoothstep(0.5, 1.0, t);
           float body = taper * swell * (1.0 + pulse * smoothstep(0.06, 0.5, t));

           // Ends: the head falling on start, the tail draining on stop. Both
           // taper to a point rather than cutting off square. The edges are
           // pushed just past 0 and 1 so that a fully-open stream is attached
           // at the lip and solid at the tip, rather than pinched at both.
           float hd = uHead * 1.2;
           float tl = uTail * 1.2 - 0.2;
           float lead = smoothstep(hd, hd - 0.16, t);
           float trail = smoothstep(tl, tl + 0.16, t);
           return body * lead * trail;
         }

         varying float vStreamT;
         vec3 vStreamPosition;
        ` + shader.vertexShader

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <beginnormal_vertex>',
          `float t = clamp(position.y, 0.0, 1.0);
           vec2 around = normalize(position.xz);

           vec3 tangent = normalize(bezierTangent(t));
           // The pour happens in the XY plane, so Z is always a safe reference
           // for the frame — tangent can never be parallel to it.
           vec3 frameA = normalize(cross(tangent, vec3(0.0, 0.0, 1.0)));
           vec3 frameB = cross(frameA, tangent);
           vec3 radial = frameA * around.x + frameB * around.y;

           float r = streamRadius(t);
           vStreamPosition = bezier(t) + meander(t) + radial * (r * uRadius);

           // Surface normal of a swept tube leans along the axis wherever the
           // radius is changing. Without this the swell and the pulses would
           // move the outline but not the shading, which is what made the old
           // stream look like a flat ribbon.
           float dr = (streamRadius(min(t + 0.012, 1.0)) - r) / 0.012 * uRadius;
           float speed = max(length(bezierTangent(t)), 1e-4);
           vec3 objectNormal = normalize(radial - tangent * (dr / speed));
           vStreamT = t;`,
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = vStreamPosition;')

      shader.fragmentShader =
        'uniform vec3 uRimColor;\nvarying float vStreamT;\n' +
        shader.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             // Thicker water reads darker, and the column gathers as it falls,
             // so the head is paler than the tail. A flat colour top to bottom
             // is a large part of what made this look printed on.
             diffuseColor.rgb *= mix(1.18, 0.82, vStreamT);`,
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
             // A bright edge is most of what makes a water column read as
             // translucent while staying opaque to the renderer.
             float fres = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 1.8);
             totalEmissiveRadiance += uRimColor * fres * 0.7;`,
          )
    }
    m.customProgramCacheKey = () => 'aquem-pour-stream-v2'
    return m
  }, [])

  const meshRef = useRef()

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const scratch = useMemo(
    () => ({
      lip: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      target: new THREE.Vector3(),
      control: new THREE.Vector3(),
      end: new THREE.Vector3(),
    }),
    [],
  )
  const head = useRef(0)
  const tail = useRef(0)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const mesh = meshRef.current
    if (!mesh) return

    const p = sectionProgress('pour')
    const engaged = p > 0.0005 && p < 0.9995
    const phases = pourPhases(engaged ? p : 0)
    const u = material.userData.uniforms
    u.uTime.value += dt

    // Damped so the stream still behaves if the wheel is thrown rather than
    // scrolled: the head cannot arrive before it has fallen.
    const smooth = 1 - Math.exp(-7 * dt)
    head.current = THREE.MathUtils.lerp(head.current, engaged ? phases.flowOn : 0, smooth)
    tail.current = THREE.MathUtils.lerp(tail.current, engaged ? phases.flowOff : 0, smooth)

    if (head.current - tail.current < 0.02) {
      mesh.visible = false
      return
    }
    mesh.visible = true
    u.uHead.value = head.current
    u.uTail.value = tail.current

    // Start the stream at the rim's low edge rather than the centre of the
    // neck opening, so it leaves the bottle instead of crossing over it.
    lipPoint(bottleRuntime.mouth, bottleRuntime.tilt, bottleRuntime.scale, scratch.lip)
    mesh.position.copy(scratch.lip)

    // Sink the landing point just under the surface: a stream that stops
    // exactly at the waterline shows its open end as a hard disc.
    scratch.target.set(GLASS.x, GLASS.floor + bottleRuntime.glassLevel - 0.05, 0)
    scratch.end.copy(scratch.target).sub(scratch.lip)

    // Control point one third along the initial direction — the tangent at the
    // top of a Bézier is (control - start), so this is what sets the water
    // leaving over the lip before gravity straightens it out.
    lipDirection(bottleRuntime.tilt, scratch.dir)
    scratch.control.copy(scratch.dir).multiplyScalar(scratch.end.length() * 0.34)

    u.uControl.value.copy(scratch.control)
    u.uEnd.value.copy(scratch.end)
    u.uRadius.value = 0.05
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
}
