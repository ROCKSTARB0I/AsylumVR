// Tape: the found-footage look. Every frame of the game is "recorded":
// a VHS composite (chroma bleed, tape wobble, head-switching noise at the
// bottom, tracking bands, grain, soft scanlines, crushed blacks), and when
// the camcorder is up, its night-vision mode (amplified green, heavy grain).
import * as THREE from '../vendor/three.module.js';

const COMMON = `
  float h1(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h1(i), h1(i+vec2(1,0)), f.x), mix(h1(i+vec2(0,1)), h1(i+vec2(1,1)), f.x), f.y); }
  vec3 toYIQ(vec3 c){ return vec3(dot(c, vec3(0.299,0.587,0.114)), dot(c, vec3(0.596,-0.274,-0.322)), dot(c, vec3(0.211,-0.523,0.312))); }
  vec3 fromYIQ(vec3 y){ return vec3(y.x + 0.956*y.y + 0.621*y.z, y.x - 0.272*y.y - 0.647*y.z, y.x - 1.106*y.y + 1.703*y.z); }
`;

// mode: 0 = the eye (light tape look), 1 = camcorder, 2 = camcorder night vision
export const VHS_FRAG = `
  uniform sampler2D src; uniform float t, mode, glitch, hurt, fear, aspect, battery, fade, zoom, exposure, stat;
  varying vec2 vUv;
  ${COMMON}
  vec3 sampleTape(vec2 uv){
    // the luma is sharp-ish, the colour smears to the right like real tape
    vec3 c = texture2D(src, uv).rgb;
    vec3 y = toYIQ(c);
    vec3 acc = vec3(0.0); float w = 0.0;
    for (int i = 0; i < 6; i++){ float o = float(i) * 0.0028; vec3 s = toYIQ(texture2D(src, uv - vec2(o, 0.0)).rgb); float k = 1.0 - float(i) / 6.0; acc += s * k; w += k; }
    acc /= w; y.yz = acc.yz * 1.05;
    return fromYIQ(y);
  }
  void main(){
    vec2 uv = vUv;
    float strength = mode < 0.5 ? 0.45 : 1.0;
    // tape wobble: the whole frame breathes sideways, each line jitters a little
    float line = floor(uv.y * 240.0);
    uv.x += (vn(vec2(t * 2.0, 0.0)) - 0.5) * 0.0016 * strength + (h1(vec2(line, floor(t * 30.0))) - 0.5) * 0.0009 * strength;
    // tracking band rolling up the frame now and then
    float band = smoothstep(0.03, 0.0, abs(fract(uv.y - t * 0.07) - 0.5)) * (0.3 + glitch);
    uv.x += band * (h1(vec2(line, t)) - 0.5) * 0.02 * strength;
    // head-switching noise at the bottom
    float hs = smoothstep(0.035, 0.0, uv.y) * strength;
    uv.x += hs * (0.02 + 0.03 * h1(vec2(line, t)));
    // glitch tears when something is close
    if (glitch > 0.01) { float tear = step(1.0 - glitch * 0.25, h1(vec2(floor(uv.y * 40.0), floor(t * 20.0)))); uv.x += tear * (h1(vec2(line, t * 3.0)) - 0.5) * 0.12 * glitch; }
    // zoom (camcorder)
    uv = (uv - 0.5) / zoom + 0.5;
    vec3 c = sampleTape(uv);
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    if (mode > 1.5) {
      // night vision: huge gain on the dim scene, green phosphor, blooming highlights
      float v = 1.0 - exp(-lum * 18.0);
      v = pow(v, 0.85);
      c = vec3(0.32, 1.0, 0.42) * v + vec3(0.6, 1.0, 0.65) * smoothstep(0.75, 1.0, v) * 0.35;
      c *= 0.85 + 0.15 * battery;
    } else {
      c = mix(vec3(lum), c, mode > 0.5 ? 0.8 : 0.85) * (mode > 0.5 ? 1.15 : 1.0);
      c = 1.0 - exp(-c * exposure);
      c = pow(c, vec3(1.0 / 2.2));
    }
    // crushed, slightly lifted blacks like cheap tape
    c = max(c - 0.006, 0.0) * 1.02 + vec3(0.012, 0.012, 0.016) * strength;
    // grain
    float gs = mode > 1.5 ? 0.22 : (mode > 0.5 ? 0.09 : 0.06);
    float g = h1(vUv * vec2(640.0, 480.0) + fract(t * 61.3) * 100.0) - 0.5;
    c += g * gs * (0.5 + 0.5 * (1.0 - lum)) + g * fear * 0.05;
    c += (h1(vec2(line, floor(t * 60.0))) - 0.5) * 0.02 * strength;      // line noise
    c += band * 0.08 + hs * h1(vUv * 300.0 + t) * 0.4;
    // scanlines and vignette
    c *= 0.93 + 0.07 * sin(vUv.y * 3.14159 * 480.0);
    vec2 q = vUv - 0.5; q.x *= aspect;
    c *= 1.0 - dot(q, q) * (mode > 0.5 ? 0.9 : 0.75);
    // hurt: the picture reddens and pulses at the edges
    c = mix(c, c * vec3(1.3, 0.35, 0.3), hurt * smoothstep(0.2, 0.8, length(q)) );
    // a burst of dead-channel static over everything
    c = mix(c, vec3(h1(vUv * vec2(640.0, 480.0) + fract(t * 91.7) * 50.0)) * (0.6 + 0.4 * h1(vec2(line, t))), clamp(stat, 0.0, 1.0));
    c *= 1.0 - fade;
    gl_FragColor = vec4(c, 1.0);
  }`;

export const QUAD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export function makeTape() {
  const uniforms = { src: { value: null }, t: { value: 0 }, mode: { value: 0 }, glitch: { value: 0 }, hurt: { value: 0 }, fear: { value: 0 }, aspect: { value: 1.5 }, battery: { value: 1 }, fade: { value: 0 }, zoom: { value: 1 }, exposure: { value: 2.6 }, stat: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: QUAD_VERT, fragmentShader: VHS_FRAG, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { uniforms, mat, scene, cam };
}

// The material for the flip-out screen on the camcorder in VR: same tape,
// sampling the camcorder's own render, plus its on-screen display.
export function makeScreenMaterial(rtTex, osdTex) {
  const uniforms = { src: { value: rtTex }, osd: { value: osdTex }, t: { value: 0 }, mode: { value: 2 }, glitch: { value: 0 }, hurt: { value: 0 }, fear: { value: 0 }, aspect: { value: 1.33 }, battery: { value: 1 }, fade: { value: 0 }, zoom: { value: 1 }, exposure: { value: 2.6 }, stat: { value: 0 } };
  const frag = VHS_FRAG.replace('uniform sampler2D src;', 'uniform sampler2D src; uniform sampler2D osd;')
    .replace('gl_FragColor = vec4(c, 1.0);', 'vec4 o = texture2D(osd, vUv); c = mix(c, o.rgb, o.a); gl_FragColor = vec4(c, 1.0);');
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: frag });
  mat.toneMapped = false;
  return mat;
}

// In VR a full-screen pass costs too much, so the eye view gets a light
// grain-and-vignette veil on a quad pinned in front of the face.
export function makeVeil() {
  const uniforms = { t: { value: 0 }, hurt: { value: 0 }, fear: { value: 0 }, fade: { value: 0 }, stat: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float t, hurt, fear, fade, stat; varying vec2 vUv; ${COMMON}
      void main(){ vec2 q = vUv - 0.5; float r = length(q) * 1.6;
        float g = h1(vUv * 900.0 + fract(t * 37.0) * 50.0);
        float vig = smoothstep(0.35, 1.0, r);
        // VHS: scanlines, a slow tracking band rolling up the picture, a little warm cast
        float scan = step(0.5, fract(vUv.y * 360.0)) * 0.09;
        float by = fract(t * 0.085); float band = (1.0 - smoothstep(0.0, 0.035, abs(vUv.y - by))) * (0.16 + 0.1 * h1(vec2(floor(vUv.x * 160.0), floor(t * 30.0))));
        vec3 col = mix(vec3(g * 0.5) + vec3(0.03, 0.02, 0.0), vec3(g), band * 2.5);
        col = mix(col, vec3(0.4, 0.0, 0.0), hurt * vig);
        float a = 0.05 + scan + band + 0.03 * fear + vig * (0.55 + hurt * 0.4);
        a = max(a, fade);
        col = mix(col, vec3(g), stat); a = max(a, stat * 0.95);
        gl_FragColor = vec4(col * (1.0 - fade), a); }` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), mat); m.position.z = -0.6; m.renderOrder = 999; m.frustumCulled = false;
  return { mesh: m, uniforms };
}
