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
 * Fundo global de ondas suaves em WebGL (three.js). Um canvas fixo que cobre a
 * viewport inteira, atrás de todo o conteúdo, com ondas animadas em tons do
 * tema (navy). Faz um leve parallax conforme a página é rolada.
 *
 * Renderizado num único fullscreen quad + fragment shader (GLSL): base em
 * degradê escuro + camadas de senoides que ondulam com o tempo e deslocam com
 * o scroll. Mantido bem sutil para não prejudicar a legibilidade do conteúdo.
 */
@Component({
  selector: 'app-bg-waves',
  template: '<canvas #canvas class="bg-waves-canvas"></canvas>',
  styleUrls: ['./bg-waves.component.css'],
})
export class BgWavesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private material!: THREE.ShaderMaterial;
  private frameId = 0;
  private startTime = 0;

  private scrollTarget = 0;
  private scrollValue = 0;

  private readonly onResize = () => this.resize();
  private readonly onScroll = () => {
    this.scrollTarget = window.scrollY || window.pageYOffset || 0;
  };

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.init();
    this.zone.runOutsideAngular(() => {
      this.startTime = performance.now();
      this.animate();
    });
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    this.material?.dispose();
    this.renderer?.dispose();
  }

  private init(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_scroll: { value: 0 },
      },
      vertexShader: BgWavesComponent.VERTEX,
      fragmentShader: BgWavesComponent.FRAGMENT,
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.resize();
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.material.uniforms['u_resolution'].value.set(w * dpr, h * dpr);
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    const t = (performance.now() - this.startTime) / 1000;
    // suaviza o scroll para o parallax não ficar "duro"
    this.scrollValue += (this.scrollTarget - this.scrollValue) * 0.08;
    this.material.uniforms['u_time'].value = t;
    this.material.uniforms['u_scroll'].value = this.scrollValue;
    this.renderer.render(this.scene, this.camera);
  };

  private static readonly VERTEX = /* glsl */ `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  private static readonly FRAGMENT = /* glsl */ `
    precision highp float;

    uniform float u_time;
    uniform vec2  u_resolution;
    uniform float u_scroll;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;

      // coordenada vertical deslocada pelo scroll -> parallax das ondas
      float scroll = u_scroll * 0.0012;
      float y = uv.y + scroll;

      // base: degradê escuro em tons do tema (navy)
      vec3 top = vec3(0.043, 0.063, 0.117);   // ~#0b1020
      vec3 bot = vec3(0.024, 0.039, 0.078);   // ~#060a14
      vec3 col = mix(bot, top, uv.y);

      // cores sutis das ondas (índigo / teal)
      vec3 c1 = vec3(0.20, 0.35, 0.70);
      vec3 c2 = vec3(0.15, 0.55, 0.55);
      vec3 c3 = vec3(0.35, 0.25, 0.65);

      // 3 camadas de senoides deslizando
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float speed = 0.06 + fi * 0.02;
        float freq = 1.6 + fi * 0.9;
        float amp = 0.06 + fi * 0.015;
        // posição vertical de cada onda, animada e afetada pelo scroll
        float base = 0.30 + fi * 0.22;
        float wave = base
          + amp * sin(uv.x * 6.28318 * freq + u_time * speed * 6.28318 + fi * 1.7)
          + amp * 0.5 * sin(uv.x * 6.28318 * (freq * 0.5) - u_time * speed * 3.0);
        wave += scroll * (0.4 + fi * 0.25);

        float d = abs(y - wave);
        // linha suave + brilho ao redor
        float line = smoothstep(0.06, 0.0, d) * 0.12;
        float glow = smoothstep(0.28, 0.0, d) * 0.05;

        vec3 wc = i == 0 ? c1 : (i == 1 ? c2 : c3);
        col += wc * (line + glow);
      }

      // vinheta leve nas bordas para dar profundidade
      float vig = smoothstep(1.2, 0.2, length(uv - 0.5));
      col *= 0.85 + 0.15 * vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `;
}
