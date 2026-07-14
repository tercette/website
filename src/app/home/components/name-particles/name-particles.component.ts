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
 * Transforma o <h1> do hero ("Leandro Tercette") em milhares de partículas
 * WebGL (three.js Points + ShaderMaterial). As partículas começam espalhadas,
 * se montam formando o nome, flutuam suavemente e se dispersam quando o mouse
 * passa perto — reagrupando em seguida.
 *
 * Técnica: o texto é rasterizado num canvas 2D só para amostrar as posições
 * dos pixels (a "máscara"); cada pixel opaco vira uma partícula cuja posição
 * de destino é lida dali. O <h1> real permanece no DOM (transparente) para
 * SEO/acessibilidade e para preservar o layout responsivo.
 */
@Component({
  selector: 'app-name-particles',
  template: '<canvas #canvas class="name-particles-canvas"></canvas>',
  styleUrls: ['./name-particles.component.css'],
})
export class NameParticlesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private points?: THREE.Points;
  private material!: THREE.ShaderMaterial;

  private frameId = 0;
  private startTime = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private h1El: HTMLElement | null = null;
  private resizeTimer: any = null;

  private readonly mouseTarget = new THREE.Vector2(-9999, -9999);
  private readonly mouse = new THREE.Vector2(-9999, -9999);

  private readonly onResize = () => {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.rebuild(), 200);
  };

  private readonly onPointerMove = (e: PointerEvent) => {
    const host = this.hostEl.nativeElement.getBoundingClientRect();
    this.mouseTarget.set(
      e.clientX - host.left,
      this.height - (e.clientY - host.top) // converte para coords de mundo (y para cima)
    );
  };

  private readonly onPointerLeave = () => {
    this.mouseTarget.set(-9999, -9999);
  };

  constructor(private hostEl: ElementRef<HTMLElement>, private zone: NgZone) {}

  // abaixo desta largura o efeito é desligado (mesmo breakpoint do _hero.scss):
  // no mobile mostra o <h1> normal, o que preserva a rolagem por toque e a bateria.
  private static readonly MOBILE_MAX = 992;

  private isMobile(): boolean {
    return window.innerWidth < NameParticlesComponent.MOBILE_MAX;
  }

  ngAfterViewInit(): void {
    const host = this.hostEl.nativeElement;
    this.h1El = host.parentElement?.querySelector('h1') ?? null;

    this.initThree();

    // aguarda a fonte carregar para amostrar a tipografia correta
    const fonts = (document as any).fonts;
    const ready = fonts?.ready ?? Promise.resolve();
    ready.then(() => this.rebuild());

    this.zone.runOutsideAngular(() => {
      this.startTime = performance.now();
      this.animate();
    });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerdown', this.onPointerMove);
    document.addEventListener('mouseleave', this.onPointerLeave);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.resizeTimer);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerMove);
    document.removeEventListener('mouseleave', this.onPointerLeave);
    this.disposePoints();
    this.material?.dispose();
    this.renderer?.dispose();
  }

  private initThree(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        u_time: { value: 0 },
        u_progress: { value: 0 },
        u_mouse: { value: this.mouse },
        u_pixelRatio: { value: 1 },
      },
      vertexShader: NameParticlesComponent.VERTEX,
      fragmentShader: NameParticlesComponent.FRAGMENT,
    });
  }

  /** (Re)constrói a nuvem de partículas a partir da posição/tamanho atual do <h1>. */
  private rebuild(): void {
    const host = this.hostEl.nativeElement;
    host.style.display = '';
    if (this.h1El) this.h1El.style.color = 'transparent';

    this.width = host.clientWidth;
    this.height = host.clientHeight;
    if (!this.width || !this.height || !this.h1El) return;

    // no mobile usa DPR menor para aliviar a GPU (mantém a rolagem fluida)
    this.dpr = Math.min(window.devicePixelRatio || 1, this.isMobile() ? 1.5 : 2);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.material.uniforms['u_pixelRatio'].value = this.dpr;

    // câmera ortográfica em pixels: x[0,W], y[0,H] com y para cima
    this.camera = new THREE.OrthographicCamera(
      0, this.width, this.height, 0, -10, 10
    );
    this.camera.position.z = 1;

    const targets = this.sampleName();
    this.buildPoints(targets);

    // reinicia a animação de montagem
    this.startTime = performance.now();
    this.material.uniforms['u_progress'].value = 0;
  }

  /**
   * Rasteriza o nome num canvas 2D alinhado exatamente onde o <h1> está e
   * devolve as posições (em coords de mundo) dos pixels opacos, amostradas
   * a cada `gap` pixels.
   */
  private sampleName(): Array<{ x: number; y: number }> {
    const h1 = this.h1El!;
    const host = this.hostEl.nativeElement;
    const hostRect = host.getBoundingClientRect();
    const h1Rect = h1.getBoundingClientRect();
    const cs = getComputedStyle(h1);

    const fontSize = parseFloat(cs.fontSize) || 96;
    const fontWeight = cs.fontWeight || '900';
    const fontFamily = cs.fontFamily || 'Roboto, sans-serif';
    const lineHeight = fontSize * 1.0; // _hero.scss usa line-height:1

    // offset do texto dentro do host
    const offX = h1Rect.left - hostRect.left;
    const offY = h1Rect.top - hostRect.top;

    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(this.width));
    c.height = Math.max(1, Math.floor(this.height));
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // respeita o alinhamento do <h1> (ex.: centralizado no mobile) para as
    // partículas caírem exatamente onde o texto real aparece
    const align = cs.textAlign;
    let drawX = offX;
    if (align === 'center') {
      ctx.textAlign = 'center';
      drawX = offX + h1Rect.width / 2;
    } else if (align === 'right' || align === 'end') {
      ctx.textAlign = 'right';
      drawX = offX + h1Rect.width;
    } else {
      ctx.textAlign = 'left';
      drawX = offX;
    }

    // duas linhas: "Leandro" / "Tercette"
    const lines = (h1.textContent || 'Leandro Tercette').trim().split(/\s+/);
    const line1 = lines[0] ?? 'Leandro';
    const line2 = lines.slice(1).join(' ') || '';
    ctx.fillText(line1, drawX, offY);
    if (line2) ctx.fillText(line2, drawX, offY + lineHeight);

    const img = ctx.getImageData(0, 0, c.width, c.height).data;

    // densidade das partículas em função do tamanho da fonte.
    // no mobile usa menos partículas para a rolagem ficar fluida.
    const gap = Math.max(2, Math.round(fontSize / (this.isMobile() ? 28 : 44)));
    const targets: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < c.height; y += gap) {
      for (let x = 0; x < c.width; x += gap) {
        const alpha = img[(y * c.width + x) * 4 + 3];
        if (alpha > 128) {
          // world y é invertido em relação ao canvas (topo = height)
          targets.push({ x, y: this.height - y });
        }
      }
    }
    return targets;
  }

  private buildPoints(targets: Array<{ x: number; y: number }>): void {
    this.disposePoints();
    const n = targets.length;
    if (n === 0) return;

    const positions = new Float32Array(n * 3); // posição inicial (espalhada)
    const aTarget = new Float32Array(n * 2); // destino (o nome)
    const aSize = new Float32Array(n);
    const aSeed = new Float32Array(n);

    const fontSize = parseFloat(getComputedStyle(this.h1El!).fontSize) || 96;
    // partículas maiores que o espaçamento para fecharem os vãos (nome sólido)
    const pSize = Math.max(2.2, fontSize / 30);

    for (let i = 0; i < n; i++) {
      const t = targets[i];
      // começa espalhado por todo o host
      positions[i * 3 + 0] = Math.random() * this.width;
      positions[i * 3 + 1] = Math.random() * this.height;
      positions[i * 3 + 2] = 0;
      aTarget[i * 2 + 0] = t.x;
      aTarget[i * 2 + 1] = t.y;
      aSize[i] = pSize * (0.7 + Math.random() * 0.7);
      aSeed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(aTarget, 2));
    geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private disposePoints(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.points = undefined;
    }
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    if (!this.camera || !this.points) return;

    const t = (performance.now() - this.startTime) / 1000;
    // montagem: progride de 0 a 1 em ~2s com easing
    const prog = Math.min(1, t / 2.0);
    this.material.uniforms['u_progress'].value = prog * prog * (3 - 2 * prog);
    this.material.uniforms['u_time'].value = t;

    this.mouse.lerp(this.mouseTarget, 0.15);
    this.renderer.render(this.scene, this.camera);
  };

  private static readonly VERTEX = /* glsl */ `
    attribute vec2 aTarget;
    attribute float aSize;
    attribute float aSeed;

    uniform float u_time;
    uniform float u_progress;
    uniform float u_pixelRatio;
    uniform vec2  u_mouse;

    varying vec3 vColor;

    vec3 palette(float t) {
      return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0) * t + vec3(0.55, 0.4, 0.75)));
    }

    void main() {
      vec2 start = position.xy;
      float p = u_progress;

      vec2 pos = mix(start, aTarget, p);

      // flutuação sutil depois de montado
      pos.x += sin(u_time * 0.9 + aSeed * 30.0) * 1.6 * p;
      pos.y += cos(u_time * 0.8 + aSeed * 24.0) * 1.6 * p;

      // repulsão pelo mouse
      vec2 d = pos - u_mouse;
      float dist = length(d);
      float R = 90.0;
      float force = smoothstep(R, 0.0, dist);
      pos += normalize(d + vec2(0.0001)) * force * 55.0;

      // cor iridescente ao longo da largura do nome
      vColor = palette(aTarget.x * 0.0016 + 0.15 + u_time * 0.02);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
      // partículas encolhem à medida que se materializam (finas quando montadas)
      gl_PointSize = aSize * u_pixelRatio * (1.15 - 0.6 * p);
    }
  `;

  private static readonly FRAGMENT = /* glsl */ `
    precision highp float;
    varying vec3 vColor;

    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      // borda mais dura -> partícula mais "cheia" -> nome mais sólido
      float a = smoothstep(0.5, 0.34, d);
      if (a < 0.01) discard;
      gl_FragColor = vec4(vColor, a);
    }
  `;
}
