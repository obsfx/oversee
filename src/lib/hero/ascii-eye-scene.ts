import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, TextureLoader, Vector2, type Texture, type WebGLRenderer } from "three";
import { GlyphAtlasBuilder } from "@/src/lib/hero/glyph-atlas";
import type { HeroFrame } from "@/src/lib/hero/types";

export class AsciiEyeScene {
  readonly maxPixelRatio = 2;

  private static readonly vertexShader = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

  private static readonly fragmentShader = `
uniform float uTime;
uniform float uLift;
uniform float uReady;
uniform float uPixelRatio;
uniform vec2 uPointer;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform float uGlyphCount;
uniform sampler2D uPainting;
uniform sampler2D uGlyphs;

const vec3 INK = vec3(0.067, 0.055, 0.106);
const vec2 IRIS = vec2(0.555, 0.57);
const vec2 EYE_SPAN = vec2(0.82, 0.8);
const float IRIS_HEIGHT = 0.6;

// Hash without Sine by Dave Hoskins, MIT License: https://www.shadertoy.com/view/4djSRW
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float brightness(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec2 paintingUv(vec2 fragCoord) {
  float unit = max(uResolution.x / EYE_SPAN.x, uResolution.y / EYE_SPAN.y);
  vec2 uv = IRIS + (fragCoord - uResolution * vec2(0.5, IRIS_HEIGHT)) / unit;
  vec2 toIris = uv - IRIS;
  float distance = length(toIris);
  vec2 look = clamp(uPointer, vec2(-1.0), vec2(1.0)) * vec2(0.022, 0.014);
  uv -= look * smoothstep(0.13, 0.03, distance);
  float dilate = uLift * smoothstep(0.07, 0.0, distance) * 0.32;
  return IRIS + (uv - IRIS) * (1.0 - dilate);
}

void main() {
  vec2 cellSize = uCell * uPixelRatio;
  vec2 fromTop = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 cell = floor(fromTop / cellSize);
  vec2 local = fract(fromTop / cellSize);
  vec2 center = (cell + 0.5) * cellSize;
  vec3 paint = texture2D(uPainting, paintingUv(vec2(center.x, uResolution.y - center.y))).rgb;
  float light = pow(smoothstep(0.015, 0.42, brightness(paint)), 0.72);

  float tick = floor(uTime * 7.0);
  float level = floor(light * (uGlyphCount - 0.001));
  if (hash12(cell + tick * 0.37) > 0.993 && light > 0.08) {
    level = floor(hash12(cell * 1.7 + tick) * uGlyphCount);
  }
  float ink = texture2D(uGlyphs, vec2((level + local.x) / uGlyphCount, 1.0 - local.y)).a;

  vec3 tint = mix(paint * 1.8, vec3(0.96, 0.92, 0.86), 0.18 + 0.3 * light);
  vec3 color = tint * ink * (0.3 + 1.05 * light);
  gl_FragColor = vec4(mix(INK, INK + color, uReady), 1.0);
}
`;

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly material = new ShaderMaterial({
    vertexShader: AsciiEyeScene.vertexShader,
    fragmentShader: AsciiEyeScene.fragmentShader,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uLift: { value: 0 },
      uReady: { value: 0 },
      uPixelRatio: { value: 1 },
      uPointer: { value: new Vector2() },
      uResolution: { value: new Vector2(1, 1) },
      uCell: { value: new Vector2(7, 12) },
      uGlyphCount: { value: 1 },
      uPainting: { value: null },
      uGlyphs: { value: null },
    },
  });
  private readonly textures: Texture[] = [];
  private loaded = 0;
  private isDisposed = false;

  constructor(renderer: WebGLRenderer, paintingUrl: string) {
    this.renderer = renderer;
    this.scene.add(new Mesh(this.geometry, this.material));
    new TextureLoader().loadAsync(paintingUrl).then((texture) => {
      this.attach("uPainting", texture);
    });
    GlyphAtlasBuilder.create().then((atlas) => {
      this.material.uniforms.uGlyphCount.value = atlas.count;
      this.material.uniforms.uCell.value.set(atlas.cellWidth, atlas.cellHeight);
      this.attach("uGlyphs", atlas.texture);
    });
  }

  resize(width: number, height: number): void {
    const pixelRatio = this.renderer.getPixelRatio();
    this.material.uniforms.uPixelRatio.value = pixelRatio;
    this.material.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  }

  render({ time, pointer, focus }: HeroFrame): void {
    const uniforms = this.material.uniforms;
    uniforms.uTime.value = time;
    uniforms.uLift.value = Math.max(...focus);
    uniforms.uPointer.value.set(pointer.x, pointer.y);
    if (this.loaded === 2) {
      uniforms.uReady.value = Math.min(1, uniforms.uReady.value + 0.04);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.isDisposed = true;
    this.geometry.dispose();
    this.material.dispose();
    this.textures.forEach((texture) => {
      texture.dispose();
    });
  }

  private attach(name: string, texture: Texture): void {
    if (this.isDisposed) {
      texture.dispose();
      return;
    }
    this.textures.push(texture);
    this.material.uniforms[name].value = texture;
    this.loaded++;
  }
}
