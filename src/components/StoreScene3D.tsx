import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import travertineUrl from '../assets/images/floor_travertine_tile_1794562838498.jpg';

interface StoreScene3DProps {
  scrollProgress: number;
  chapterIndex: number;
  reducedMotion: boolean;
}

interface WalkingActor {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  privacyEnvelope?: THREE.Group;
  employeeReticle?: THREE.Group;
  curve?: THREE.CatmullRomCurve3;
  phaseOffset: number;
  speed: number;
  isEmployee: boolean;
}

const _camPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _curvePoint = new THREE.Vector3();
const _curveTangent = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createImmediateTravertineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c8c9d2';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2400; i += 1) {
      const x = (i * 89) % 512;
      const y = (i * 157) % 512;
      const w = 4 + (i % 14);
      const shade = 186 + ((i * 19) % 28);
      ctx.fillStyle = `rgba(${shade},${shade},${shade + 6},0.32)`;
      ctx.fillRect(x, y, w, 2);
    }
    ctx.strokeStyle = 'rgba(70, 72, 86, 0.35)';
    ctx.lineWidth = 2;
    for (let g = 0; g < 512; g += 128) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(512, g);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function createProceduralBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1600; i += 1) {
      const x = (i * 73) % 256;
      const y = (i * 139) % 256;
      const shade = 115 + ((i * 29) % 28);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 1;
    for (let g = 0; g < 256; g += 64) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(256, g);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(9, 9, 13, 0.56)');
    grad.addColorStop(0.55, 'rgba(9, 9, 13, 0.22)');
    grad.addColorStop(1, 'rgba(9, 9, 13, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildHumanFigure(options: {
  isEmployee: boolean;
  toneHex: number;
  shadowTex: THREE.Texture;
}): WalkingActor {
  const { isEmployee, toneHex, shadowTex } = options;
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: toneHex,
    roughness: isEmployee ? 0.52 : 0.65,
    metalness: 0.08,
  });
  const trouserMat = new THREE.MeshStandardMaterial({
    color: isEmployee ? 0x1b1d2e : 0x2c2d3a,
    roughness: 0.75,
    metalness: 0.05,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: isEmployee ? 0xe5e7f0 : 0xd0d1dc,
    roughness: 0.48,
    metalness: 0.05,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x101018,
    roughness: 0.42,
    metalness: 0.14,
  });

  const shadowPlane = new THREE.Mesh(
    new THREE.CircleGeometry(0.44, 24),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  root.add(shadowPlane);

  const legGeo = new THREE.CapsuleGeometry(0.085, 0.54, 6, 12);
  const leftLeg = new THREE.Mesh(legGeo, trouserMat);
  leftLeg.position.set(-0.1, 0.4, 0);
  leftLeg.castShadow = true;
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, trouserMat);
  rightLeg.position.set(0.1, 0.4, 0);
  rightLeg.castShadow = true;
  root.add(rightLeg);

  const shoeGeo = new THREE.BoxGeometry(0.12, 0.07, 0.22);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.35, 0.04);
  leftLeg.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.35, 0.04);
  rightLeg.add(rightShoe);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.185, 0.42, 8, 16),
    bodyMat,
  );
  torso.scale.set(1.12, 1, 0.72);
  torso.position.y = 1.06;
  torso.castShadow = true;
  root.add(torso);

  const shoulders = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.14, 0.24, 6, 12),
    bodyMat,
  );
  shoulders.rotation.z = Math.PI / 2;
  shoulders.scale.set(0.8, 1, 0.72);
  shoulders.position.y = 1.3;
  shoulders.castShadow = true;
  root.add(shoulders);

  const armGeo = new THREE.CapsuleGeometry(0.06, 0.42, 6, 10);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.26, 1.06, 0);
  leftArm.castShadow = true;
  root.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.26, 1.06, 0);
  rightArm.castShadow = true;
  root.add(rightArm);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.075, 0.12, 12),
    headMat,
  );
  neck.position.y = 1.44;
  root.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 18, 16),
    headMat,
  );
  head.scale.set(0.92, 1.06, 0.96);
  head.position.y = 1.6;
  head.castShadow = true;
  root.add(head);

  let employeeReticle: THREE.Group | undefined;
  let privacyEnvelope: THREE.Group | undefined;

  if (isEmployee) {
    const lanyard = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.014, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0x5146c8,
        roughness: 0.3,
        metalness: 0.25,
        emissive: 0x5146c8,
        emissiveIntensity: 0.35,
      }),
    );
    lanyard.rotation.x = Math.PI / 2.4;
    lanyard.position.set(0, 1.36, 0.04);
    root.add(lanyard);

    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.135, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0x5146c8,
        emissiveIntensity: 0.4,
      }),
    );
    badge.position.set(0.06, 1.15, 0.16);
    root.add(badge);

    // Subtle indigo floor ring always softly visible in lobby, stronger in Chapter 3
    employeeReticle = new THREE.Group();
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0x695fe0,
      transparent: true,
      opacity: 0.28,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 36), frameMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    employeeReticle.add(ring);

    const cornerGeo = new THREE.BoxGeometry(0.024, 1.82, 0.024);
    const corners = [
      [-0.36, 0.92, 0.26],
      [0.36, 0.92, 0.26],
      [-0.36, 0.92, -0.26],
      [0.36, 0.92, -0.26],
    ];
    for (const [cx, cy, cz] of corners) {
      const post = new THREE.Mesh(cornerGeo, frameMat);
      post.position.set(cx, cy, cz);
      employeeReticle.add(post);
    }
    root.add(employeeReticle);
  } else {
    privacyEnvelope = new THREE.Group();
    const maskMat = new THREE.MeshStandardMaterial({
      color: 0x8b8b98,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const headShield = new THREE.Mesh(new THREE.SphereGeometry(0.185, 20, 16), maskMat);
    headShield.position.y = 1.6;
    privacyEnvelope.add(headShield);

    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0x8b8b98,
      transparent: true,
      opacity: 0.18,
    });
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.43, 32), floorRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.03;
    privacyEnvelope.add(floorRing);
    root.add(privacyEnvelope);
  }

  return {
    group: root,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    privacyEnvelope,
    employeeReticle,
    phaseOffset: Math.random() * Math.PI * 2,
    speed: isEmployee ? 0 : 0.045,
    isEmployee,
  };
}

function buildCeilingCameraPod(): THREE.Group {
  const pod = new THREE.Group();

  const mountStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0x262734, roughness: 0.35, metalness: 0.75 }),
  );
  mountStem.position.y = -0.11;
  pod.add(mountStem);

  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.17, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a1b24, roughness: 0.28, metalness: 0.8 }),
  );
  housing.position.y = -0.26;
  pod.add(housing);

  const lensDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshPhysicalMaterial({
      color: 0x0a0b12,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    }),
  );
  lensDome.rotation.x = Math.PI;
  lensDome.position.y = -0.3;
  pod.add(lensDome);

  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.01, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0x5146c8 }),
  );
  accentRing.rotation.x = Math.PI / 2;
  accentRing.position.y = -0.32;
  pod.add(accentRing);

  return pod;
}

export const StoreScene3D: React.FC<StoreScene3DProps> = ({
  scrollProgress,
  chapterIndex,
  reducedMotion,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(scrollProgress);
  const chapterRef = useRef(chapterIndex);
  const reducedMotionRef = useRef(reducedMotion);
  const mouseRef = useRef({ x: 0, y: 0 });
  const requestRenderRef = useRef<(() => void) | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    progressRef.current = scrollProgress;
    chapterRef.current = chapterIndex;
    reducedMotionRef.current = reducedMotion;
    requestRenderRef.current?.();
  }, [scrollProgress, chapterIndex, reducedMotion]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b11);
    scene.fog = new THREE.FogExp2(0x0b0b11, 0.017);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const aspect =
      (container.clientWidth || window.innerWidth) /
      (container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(aspect < 0.85 ? 54 : 42, aspect, 0.1, 80);

    // Frame the store lobby on the right half so headline on left stays legible and unobstructed
    _camPos.set(-2.35, 2.2, 5.8);
    _camTarget.set(1.1, 1.05, -1.2);
    camera.position.copy(_camPos);
    camera.lookAt(_camTarget);

    // 3-point warm/cool architectural studio lighting rig
    const hemiLight = new THREE.HemisphereLight(0xe5eafc, 0x22232f, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.25);
    keyLight.position.set(6, 11, 7);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd4dbff, 0.85);
    fillLight.position.set(-5, 6, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x7c72ee, 1.05);
    rimLight.position.set(4, 4, -8);
    scene.add(rimLight);

    // Immediate procedural travertine CanvasTexture on frame 0 + seamless image upgrade on load
    const immediateFloorTex = createImmediateTravertineTexture();
    immediateFloorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const bumpTex = createProceduralBumpTexture();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: immediateFloorTex,
      bumpMap: bumpTex,
      bumpScale: 0.015,
      roughness: 0.64,
      metalness: 0.06,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const textureLoader = new THREE.TextureLoader();
    const loadedFloorTex = textureLoader.load(travertineUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      floorMat.map = tex;
      floorMat.needsUpdate = true;
      requestRenderRef.current?.();
    });

    // Architectural store backdrop & side structural walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1c1d27,
      roughness: 0.82,
      metalness: 0.08,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(17, 5.6, 0.35), wallMat);
    backWall.position.set(0, 2.8, -7.2);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.6, 16), wallMat);
    leftWall.position.set(-7.8, 2.8, -0.5);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.6, 16), wallMat);
    rightWall.position.set(7.8, 2.8, -0.5);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Subtle illuminated architectural ceiling skylight strips
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x2c2e3d,
      roughness: 0.42,
      metalness: 0.55,
    });
    const lightStripMat = new THREE.MeshBasicMaterial({ color: 0xd9def5 });
    for (let z = -5.0; z <= 3.5; z += 2.8) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.16, 0.24), beamMat);
      beam.position.set(0, 4.95, z);
      scene.add(beam);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.04, 0.08), lightStripMat);
      strip.position.set(0, 4.85, z);
      scene.add(strip);
    }

    // Store Checkout Service Desk (composite multi-part group)
    const counterGroup = new THREE.Group();
    const counterBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.96, 0.88),
      new THREE.MeshStandardMaterial({ color: 0x171822, roughness: 0.38, metalness: 0.28 }),
    );
    counterBody.position.y = 0.48;
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    counterGroup.add(counterBody);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.68, 0.06, 0.96),
      new THREE.MeshStandardMaterial({ color: 0x353748, roughness: 0.25, metalness: 0.45 }),
    );
    counterTop.position.y = 0.99;
    counterGroup.add(counterTop);

    const posScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.26, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.15, metalness: 0.6 }),
    );
    posScreen.position.set(-0.7, 1.18, 0.05);
    posScreen.rotation.x = -0.2;
    counterGroup.add(posScreen);

    counterGroup.position.set(0.5, 0, -4.4);
    scene.add(counterGroup);

    // Two Travertine Display Plinths
    const plinthStoneMat = new THREE.MeshStandardMaterial({
      color: 0xe2e3ea,
      roughness: 0.56,
      metalness: 0.05,
    });
    const steelFrameMat = new THREE.MeshStandardMaterial({
      color: 0x2d2f3c,
      roughness: 0.32,
      metalness: 0.72,
    });
    const merchMat = new THREE.MeshStandardMaterial({
      color: 0x242636,
      roughness: 0.82,
      metalness: 0.04,
    });

    const createDisplayTable = (px: number, pz: number) => {
      const table = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.1, 1.05), plinthStoneMat);
      slab.position.y = 0.78;
      slab.castShadow = true;
      slab.receiveShadow = true;
      table.add(slab);

      const legOffsets = [
        [-0.94, 0.37, -0.44],
        [0.94, 0.37, -0.44],
        [-0.94, 0.37, 0.44],
        [0.94, 0.37, 0.44],
      ];
      for (const [lx, ly, lz] of legOffsets) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.05), steelFrameMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        table.add(leg);
      }

      const fold1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.34), merchMat);
      fold1.position.set(-0.5, 0.875, 0.06);
      table.add(fold1);

      const fold2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.24, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.06 }),
      );
      fold2.position.set(0.45, 0.95, -0.1);
      table.add(fold2);

      table.position.set(px, 0, pz);
      return table;
    };

    scene.add(createDisplayTable(-1.6, -0.6));
    scene.add(createDisplayTable(2.6, -1.4));

    // Shelving Bays along right architectural wall (visible in hero right side)
    for (let i = 0; i < 3; i += 1) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 2.6, 1.85),
        new THREE.MeshStandardMaterial({ color: 0x252734, roughness: 0.65, metalness: 0.12 }),
      );
      shelf.position.set(7.1, 1.3, -3.5 + i * 2.2);
      shelf.receiveShadow = true;
      scene.add(shelf);
    }

    // Ceiling CCTV Optical Sensor Pods
    const cameraPositions: Array<[number, number, number]> = [
      [0.8, 4.85, -2.2],
      [-2.8, 4.85, 0.6],
      [3.4, 4.85, 0.8],
    ];
    for (const [cx, cy, cz] of cameraPositions) {
      const pod = buildCeilingCameraPod();
      pod.position.set(cx, cy, cz);
      scene.add(pod);
    }

    // Chapter 1 visual: Time-slice optical video frames under main ceiling sensor
    const frameSlicesGroup = new THREE.Group();
    const sliceMaterials: THREE.MeshBasicMaterial[] = [];
    for (let i = 0; i < 5; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: i === 2 ? 0x695fe0 : 0x8b8b98,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        wireframe: true,
      });
      sliceMaterials.push(mat);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), mat);
      plane.position.set(0.8, 3.1 - i * 0.25, -2.2 + (i - 2) * 0.62);
      plane.rotation.x = -0.35;
      frameSlicesGroup.add(plane);
    }
    scene.add(frameSlicesGroup);

    // Chapter 2 visual: Curved indigo visitor paths & floor dwell zone rings
    const pathCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.9, 0.04, 4.2),
      new THREE.Vector3(-0.3, 0.04, 1.6),
      new THREE.Vector3(-1.4, 0.04, 0.2),
      new THREE.Vector3(-0.6, 0.04, -2.2),
      new THREE.Vector3(0.6, 0.04, -3.3),
    ]);
    const pathCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.2, 0.04, 4.0),
      new THREE.Vector3(1.4, 0.04, 1.1),
      new THREE.Vector3(2.5, 0.04, -0.4),
      new THREE.Vector3(1.5, 0.04, -2.7),
      new THREE.Vector3(0.2, 0.04, -3.4),
    ]);

    const activityGroup = new THREE.Group();
    const pathMat = new THREE.MeshBasicMaterial({
      color: 0x5146c8,
      transparent: true,
      opacity: 0,
    });
    activityGroup.add(new THREE.Mesh(new THREE.TubeGeometry(pathCurve1, 48, 0.032, 8, false), pathMat));
    activityGroup.add(new THREE.Mesh(new THREE.TubeGeometry(pathCurve2, 48, 0.032, 8, false), pathMat));

    const zoneRingCoords: Array<[number, number, number]> = [
      [0.5, -3.4, 1.35],
      [-1.6, -0.6, 1.45],
      [2.6, -1.4, 1.45],
      [0.8, 2.8, 1.15],
    ];
    for (const [zx, zz, r] of zoneRingCoords) {
      const zRing = new THREE.Mesh(new THREE.RingGeometry(r - 0.05, r, 48), pathMat);
      zRing.rotation.x = -Math.PI / 2;
      zRing.position.set(zx, 0.028, zz);
      activityGroup.add(zRing);
    }
    scene.add(activityGroup);

    // Chapter 4 visual: Privacy Boundary Prism over central corridor
    const boundaryGroup = new THREE.Group();
    const boundaryGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x5146c8,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const boundaryPanel = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 0.05), boundaryGlassMat);
    boundaryPanel.position.set(0.8, 1.65, -2.0);
    boundaryGroup.add(boundaryPanel);
    scene.add(boundaryGroup);

    // Grounded Composite Actors: 2 Registered Employees + 4 Anonymous Customers
    const shadowTex = createContactShadowTexture();
    const actors: WalkingActor[] = [];

    const employee1 = buildHumanFigure({ isEmployee: true, toneHex: 0x2e3168, shadowTex });
    employee1.group.position.set(0.35, 0, -5.05);
    scene.add(employee1.group);
    actors.push(employee1);

    const employee2 = buildHumanFigure({ isEmployee: true, toneHex: 0x2e3168, shadowTex });
    employee2.group.position.set(1.55, 0, -2.25);
    employee2.group.rotation.y = -0.35;
    scene.add(employee2.group);
    actors.push(employee2);

    const customerLoop1 = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.3, 0, 2.8),
        new THREE.Vector3(0.2, 0, 1.1),
        new THREE.Vector3(-0.8, 0, 0.2),
        new THREE.Vector3(0.1, 0, -1.7),
        new THREE.Vector3(0.6, 0, -2.9),
        new THREE.Vector3(-0.2, 0, 0.9),
      ],
      true,
    );

    const customerLoop2 = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(2.0, 0, 2.6),
        new THREE.Vector3(1.2, 0, 0.6),
        new THREE.Vector3(2.4, 0, -0.5),
        new THREE.Vector3(1.6, 0, -2.8),
        new THREE.Vector3(3.1, 0, -0.8),
        new THREE.Vector3(2.4, 0, 1.8),
      ],
      true,
    );

    const customerSpecs = [
      { tone: 0xd8d9e2, curve: customerLoop1, phase: 0.08, speed: 0.036 },
      { tone: 0xa4a6b2, curve: customerLoop1, phase: 0.56, speed: 0.036 },
      { tone: 0xc5c6d2, curve: customerLoop2, phase: 0.22, speed: 0.032 },
      { tone: 0x7d7f8f, curve: customerLoop2, phase: 0.72, speed: 0.032 },
    ];

    for (const spec of customerSpecs) {
      const actor = buildHumanFigure({ isEmployee: false, toneHex: spec.tone, shadowTex });
      actor.curve = spec.curve;
      actor.phaseOffset = spec.phase;
      actor.speed = spec.speed;
      spec.curve.getPointAt(spec.phase, _curvePoint);
      actor.group.position.copy(_curvePoint);
      scene.add(actor.group);
      actors.push(actor);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
      const ny = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
      mouseRef.current.x = nx;
      mouseRef.current.y = ny;
      if (isSoftwareGl) requestRenderRef.current?.();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const nextAspect = w / h;
      camera.fov = nextAspect < 0.85 ? 54 : 42;
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    // Camera keyframes offset left/down cleanly so the right 55% of viewport stages the 3D workplace!
    const cameraKeyframes: Array<{ pos: [number, number, number]; look: [number, number, number] }> = [
      { pos: [-2.35, 2.2, 5.8], look: [1.1, 1.05, -1.2] }, // 0: Lobby (actors clearly visible on right)
      { pos: [-0.8, 4.35, 1.6], look: [0.8, 1.8, -2.3] }, // 1: Overhead CCTV frame stream
      { pos: [-5.6, 5.8, 4.8], look: [0.8, 0.35, -1.4] }, // 2: Elevated architectural floorplan
      { pos: [-0.85, 1.62, 1.0], look: [1.15, 1.35, -2.1] }, // 3: Eye-level employee vs customer distinction
      { pos: [-2.6, 2.35, 2.5], look: [1.1, 1.3, -2.0] }, // 4: Privacy boundary prism cutaway
      { pos: [-4.2, 4.1, 5.2], look: [0.9, 0.9, -1.6] }, // 5: Isometric overview into live demo
    ];

    let smoothedProgress = progressRef.current;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;

    function applySceneState(elapsed: number, delta: number) {
      const targetProgress = progressRef.current;
      smoothedProgress = THREE.MathUtils.damp(
        smoothedProgress,
        targetProgress,
        reducedMotionRef.current ? 30 : 6.5,
        Math.min(delta, 0.1),
      );

      const scaled = smoothedProgress * (cameraKeyframes.length - 1);
      const idxA = Math.min(cameraKeyframes.length - 1, Math.floor(scaled));
      const idxB = Math.min(cameraKeyframes.length - 1, idxA + 1);
      const localT = scaled - idxA;
      const smoothT = localT * localT * (3 - 2 * localT);

      const kfA = cameraKeyframes[idxA];
      const kfB = cameraKeyframes[idxB];

      _targetPos.set(
        THREE.MathUtils.lerp(kfA.pos[0], kfB.pos[0], smoothT) +
          (reducedMotionRef.current ? 0 : mouseRef.current.x * 0.28),
        THREE.MathUtils.lerp(kfA.pos[1], kfB.pos[1], smoothT) +
          (reducedMotionRef.current ? 0 : -mouseRef.current.y * 0.15),
        THREE.MathUtils.lerp(kfA.pos[2], kfB.pos[2], smoothT),
      );
      _targetLook.set(
        THREE.MathUtils.lerp(kfA.look[0], kfB.look[0], smoothT),
        THREE.MathUtils.lerp(kfA.look[1], kfB.look[1], smoothT),
        THREE.MathUtils.lerp(kfA.look[2], kfB.look[2], smoothT),
      );

      _camPos.lerp(_targetPos, reducedMotionRef.current ? 1 : Math.min(1, delta * 7));
      _camTarget.lerp(_targetLook, reducedMotionRef.current ? 1 : Math.min(1, delta * 7));
      camera.position.copy(_camPos);
      camera.lookAt(_camTarget);

      const walkTime = reducedMotionRef.current ? 0.25 : elapsed;
      for (const actor of actors) {
        if (!actor.isEmployee && actor.curve) {
          const u = (actor.phaseOffset + walkTime * actor.speed) % 1;
          actor.curve.getPointAt(u, _curvePoint);
          actor.curve.getTangentAt(u, _curveTangent);
          actor.group.position.copy(_curvePoint);
          const heading = Math.atan2(_curveTangent.x, _curveTangent.z);
          actor.group.rotation.y = heading;

          const stride = reducedMotionRef.current
            ? 0
            : Math.sin(walkTime * 4.2 + actor.phaseOffset * 10);
          actor.leftLeg.rotation.x = stride * 0.36;
          actor.rightLeg.rotation.x = -stride * 0.36;
          actor.leftArm.rotation.x = -stride * 0.25;
          actor.rightArm.rotation.x = stride * 0.25;
        }

        if (actor.employeeReticle) {
          const highlightDistinction = THREE.MathUtils.clamp(
            1 - Math.abs(smoothedProgress - 0.56) * 4.0,
            0,
            1,
          );
          const lobbyPresence = THREE.MathUtils.clamp(1 - smoothedProgress * 6.0, 0, 1);
          const opacityVal = Math.max(lobbyPresence * 0.32, highlightDistinction * 0.78);
          actor.employeeReticle.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
              mat.opacity = opacityVal;
            }
          });
        }

        if (actor.privacyEnvelope) {
          const showPriv = THREE.MathUtils.clamp(
            1 - Math.abs(smoothedProgress - 0.56) * 4.0,
            0,
            1,
          );
          const lobbyPresence = THREE.MathUtils.clamp(1 - smoothedProgress * 6.0, 0, 1);
          let childIdx = 0;
          actor.privacyEnvelope.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mat = (obj as THREE.Mesh).material as
                | THREE.MeshBasicMaterial
                | THREE.MeshStandardMaterial;
              mat.opacity = childIdx === 0 ? showPriv * 0.72 : Math.max(lobbyPresence * 0.2, showPriv * 0.55);
              childIdx += 1;
            }
          });
        }
      }

      const showSlices = THREE.MathUtils.clamp(1 - Math.abs(smoothedProgress - 0.2) * 5.0, 0, 1);
      sliceMaterials.forEach((mat, i) => {
        mat.opacity = showSlices * (0.3 + (i === 2 ? 0.35 : 0));
      });
      if (!reducedMotionRef.current) {
        frameSlicesGroup.position.z = Math.sin(elapsed * 0.9) * 0.22;
      }

      const showPaths = THREE.MathUtils.clamp(1 - Math.abs(smoothedProgress - 0.38) * 4.2, 0, 1);
      pathMat.opacity = showPaths * 0.82;

      const showBoundary = THREE.MathUtils.clamp(1 - Math.abs(smoothedProgress - 0.74) * 4.6, 0, 1);
      boundaryGlassMat.opacity = showBoundary * 0.28;
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const delta = Math.max(0.001, (now - prevTimeMs) / 1000);
        const elapsed = (now - startTimeMs) / 1000;
        prevTimeMs = now;
        applySceneState(elapsed, delta);
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.max(0.001, (now - prevTimeMs) / 1000);
      const elapsed = (now - startTimeMs) / 1000;
      prevTimeMs = now;
      applySceneState(elapsed, delta);
      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    // Paint frame 0 immediately so initial mount never shows a blank canvas
    applySceneState(0, 0.016);
    renderer.render(scene, camera);

    if (reducedMotionRef.current) {
      requestRender();
    } else {
      tick();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      immediateFloorTex.dispose();
      loadedFloorTex.dispose();
      bumpTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, []);

  if (webglFailed) {
    return (
      <div
        data-testid="scene-3d-fallback"
        className="w-full h-full bg-gradient-to-b from-[#09090D] via-[#15151C] to-[#09090D] flex items-center justify-center p-8"
      >
        <div className="max-w-lg text-center border border-white/10 rounded-lg p-8 bg-[#15151C]">
          <p className="text-xs tracking-wide text-[#8B8B98] mb-2">Spatial Store Simulation</p>
          <p className="font-editorial text-lg text-white/90">
            Interactive architectural view showing registered staff recognition at the service desk
            and anonymous customer flow across the store gallery.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="scene-3d-canvas"
      data-chapter={chapterIndex}
      className="w-full h-full"
    />
  );
};
