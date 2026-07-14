import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';

/**
 * Fundo WebGL do hero: um blob orgânico renderizado por raymarching
 * dentro de um único fragment shader (fullscreen quad). Puro GLSL:
 * SDF de esfera deformada por FBM noise, iluminação fresnel e paleta
 * iridescente. Reage à posição do mouse e é responsivo/leve.
 */
@Component({
  selector: 'app-hero-webgl',
  template: '<canvas #canvas class="hero-webgl-canvas"></canvas>',
  styleUrls: ['./hero-webgl.component.css'],
})
export class HeroWebglComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private material!: THREE.ShaderMaterial;
  private frameId = 0;
  private startTime = 0;

  // mouse alvo (suavizado a cada frame para um movimento fluido)
  private readonly mouseTarget = new THREE.Vector2(0, 0);
  private readonly mouse = new THREE.Vector2(0, 0);

  private readonly onResize = () => this.resize();
  private readonly onPointerMove = (e: PointerEvent) => {
    this.mouseTarget.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1)
    );
  };

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.init();
    // roda o loop fora do Angular para não disparar change detection a 60fps
    this.zone.runOutsideAngular(() => {
      this.startTime = performance.now();
      this.animate();
    });
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointerMove);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    this.material?.dispose();
    this.renderer?.dispose();
  }

  private init(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    // câmera ortográfica simples: o quad cobre toda a tela
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_mouse: { value: this.mouse },
      },
      vertexShader: HeroWebglComponent.VERTEX,
      fragmentShader: HeroWebglComponent.FRAGMENT,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(quad);

    this.resize();
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement ?? document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    // limita o DPR para não pesar em telas retina
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.material.uniforms['u_resolution'].value.set(w * dpr, h * dpr);
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    const t = (performance.now() - this.startTime) / 1000;
    // suaviza o mouse (lerp) para um movimento orgânico
    this.mouse.lerp(this.mouseTarget, 0.05);
    this.material.uniforms['u_time'].value = t;
    this.renderer.render(this.scene, this.camera);
  };

  private static readonly VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  private static readonly FRAGMENT = /* glsl */ `
    precision highp float;

    varying vec2 vUv;
    uniform float u_time;
    uniform vec2  u_resolution;
    uniform vec2  u_mouse;

    // ---- ruído 3D (value noise + fbm) ----
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                     mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                     mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    // rotação 2D
    mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

    // ---- SDF do blob: esfera deformada por ruído animado ----
    float map(vec3 p) {
      float d = length(p) - 1.0;
      d += 0.45 * fbm(p * 1.3 + vec3(0.0, u_time * 0.35, 0.0));
      return d * 0.55;
    }

    vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.0015, 0.0);
      return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)));
    }

    // paleta iridescente (cosseno, à la Inigo Quilez)
    vec3 palette(float t) {
      return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0) * t + vec3(0.15, 0.45, 0.75)));
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

      // desloca o orbe para a esquerda (atrás do nome), longe da foto à direita.
      // em telas estreitas (mobile) a foto some, então centraliza de volta.
      float wide = step(1.1, u_resolution.x / u_resolution.y);
      vec2 suv = uv + vec2(0.42 * wide, 0.0);

      // câmera
      vec3 ro = vec3(0.0, 0.0, 3.2);
      vec3 rd = normalize(vec3(suv, -1.6));

      // rotaciona a cena com o tempo e o mouse
      float yaw = u_time * 0.15 + u_mouse.x * 0.9;
      float pitch = u_mouse.y * 0.6;
      ro.xz *= rot(yaw);  rd.xz *= rot(yaw);
      ro.yz *= rot(pitch); rd.yz *= rot(pitch);

      // raymarch
      float t = 0.0;
      float hit = 0.0;
      for (int i = 0; i < 90; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.001) { hit = 1.0; break; }
        if (t > 8.0) break;
        t += d;
      }

      vec3 col = vec3(0.0);
      float alpha = 0.0;

      if (hit > 0.5) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        vec3 v = -rd;

        // fresnel para o brilho de borda
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);

        // luz principal
        vec3 lightDir = normalize(vec3(0.6, 0.8, 0.5));
        float diff = clamp(dot(n, lightDir), 0.0, 1.0);

        // cor iridescente variando com normal, view e ruído de superfície
        float irid = 0.5 + 0.5 * dot(n, v);
        vec3 base = palette(irid + 0.15 * fbm(p * 2.0) + u_time * 0.03);

        col = base * (0.25 + 0.9 * diff);
        col += fres * palette(irid + 0.4) * 1.4;   // brilho de borda iridescente
        col += pow(diff, 16.0) * 0.6;               // specular

        alpha = clamp(0.85 + fres, 0.0, 1.0);
      }

      // glow suave ao redor do blob (mesmo onde não há hit)
      float glow = exp(-3.0 * length(uv)) * 0.35;
      col += palette(0.6 + u_time * 0.02) * glow;
      alpha = max(alpha, glow);

      // leve tonemap / gamma
      col = col / (col + vec3(1.0));
      col = pow(col, vec3(0.4545));

      gl_FragColor = vec4(col, alpha);
    }
  `;
}
