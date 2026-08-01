"use strict";

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const container = document.querySelector(".morph-scene");

if (!container) {
  throw new Error(".morph-scene 요소를 찾지 못했습니다.");
}

container
  .querySelectorAll("canvas")
  .forEach((canvas) => canvas.remove());

/* =========================================================
   설정
========================================================= */

const SETTINGS = {
  desktopParticleCount: 1200,
  mobileParticleCount: 700,
  builderRatio: 0.88,

  /*
    전체 입자 가운데 은하를 만드는 비율입니다.
    나머지는 주변에 흩어진 채 유지됩니다.
  */
  builderRatio: 0.76,

  animationSpeed: 1.2,

  outerBeginTime: 1.2,
  outerEndTime: 5.9,

  middleBeginTime: 3.7,
  middleEndTime: 9.6,

  innerBeginTime: 6,
  innerEndTime: 14,

  minimumJoinDuration: 2.7,
  maximumJoinDuration: 8.7,

  /*
    최종 은하 크기
  */
  galaxyRadiusXScale: 0.56,
  galaxyRadiusZScale: 0.29,
  galaxyThicknessScale: 0.032,

  /*
    은하 중심부의 빈 공간 크기
  */
  galaxyHoleSize: 0.30,

  /*
    은하 기울기
  */
  galaxyTiltX: -0.28,
  galaxyTiltZ: -0.14,

  /*
    완성된 은하 회전 속도
  */
  galaxyRotationSpeed: 0.12,

  /*
    마우스 움직임
  */
  pointerParallaxX: 0.48,
  pointerParallaxY: 0.32
};

const PARTICLE_COLOR = new THREE.Color("#000000");

/* =========================================================
   Three.js 장면
========================================================= */

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 0, 11.5);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(
    window.devicePixelRatio || 1,
    2
  )
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight,
  false
);

renderer.setClearColor(0xffffff, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = "intro-webgl-canvas";

container.appendChild(renderer.domElement);

/* =========================================================
   입자 셰이더
========================================================= */

const particleMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthTest: true,
  depthWrite: false,
  blending: THREE.NormalBlending,

  uniforms: {
    uPixelRatio: {
      value: Math.min(
        window.devicePixelRatio || 1,
        2
      )
    }
  },

  vertexShader: `
    attribute float aSize;
    attribute float aOpacity;
    attribute vec3 color;

    uniform float uPixelRatio;

    varying float vOpacity;
    varying vec3 vColor;

    void main() {
      vec4 modelPosition =
        modelMatrix *
        vec4(position, 1.0);

      vec4 viewPosition =
        viewMatrix *
        modelPosition;

      gl_Position =
        projectionMatrix *
        viewPosition;

      float perspectiveScale =
        12.0 /
        max(
          2.0,
          -viewPosition.z
        );

      gl_PointSize =
        aSize *
        uPixelRatio *
        perspectiveScale;

      vOpacity = aOpacity;
      vColor = color;
    }
  `,

  fragmentShader: `
    varying float vOpacity;
    varying vec3 vColor;

    void main() {
      vec2 point =
        gl_PointCoord -
        vec2(0.5);

      float squareDistance =
        max(
          abs(point.x),
          abs(point.y)
        );

      float edge =
        1.0 -
        smoothstep(
          0.46,
          0.5,
          squareDistance
        );

      if (edge <= 0.001) {
        discard;
      }

      gl_FragColor =
        vec4(
          vColor,
          vOpacity * edge
        );
    }
  `
});

/* =========================================================
   상태
========================================================= */

let points = null;
let particleGeometry = null;
let particles = [];

let positions = null;
let sizes = null;
let opacities = null;
let colors = null;

let visibleWidth = 0;
let visibleHeight = 0;

let galaxyRadiusX = 0;
let galaxyRadiusZ = 0;
let galaxyThickness = 0;

let cloudRadiusX = 0;
let cloudRadiusY = 0;
let cloudRadiusZ = 0;

let startTime = null;
let animationFrameId = null;
let resizeTimer = null;

const pointerTarget = {
  x: 0,
  y: 0
};

const pointerCurrent = {
  x: 0,
  y: 0
};

/* =========================================================
   공통 함수
========================================================= */

function clamp(
  value,
  minimum = 0,
  maximum = 1
) {
  return Math.min(
    Math.max(value, minimum),
    maximum
  );
}

function lerp(
  start,
  end,
  progress
) {
  return (
    start +
    (end - start) *
    progress
  );
}

function smootherstep(progress) {
  const value = clamp(progress);

  return (
    value *
    value *
    value *
    (
      value *
      (
        value * 6 -
        15
      ) +
      10
    )
  );
}

function randomBetween(
  minimum,
  maximum
) {
  return (
    minimum +
    Math.random() *
    (maximum - minimum)
  );
}

function shuffle(array) {
  for (
    let index = array.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
        (index + 1)
      );

    [
      array[index],
      array[randomIndex]
    ] = [
      array[randomIndex],
      array[index]
    ];
  }

  return array;
}

/* =========================================================
   화면 크기 계산
========================================================= */

function calculateWorldSize() {
  const verticalFov =
    THREE.MathUtils.degToRad(
      camera.fov
    );

  visibleHeight =
    2 *
    Math.tan(verticalFov / 2) *
    camera.position.z;

  visibleWidth =
    visibleHeight *
    camera.aspect;

  galaxyRadiusX =
    Math.min(
      visibleWidth,
      visibleHeight
    ) *
    SETTINGS.galaxyRadiusXScale;

  galaxyRadiusZ =
    Math.min(
      visibleWidth,
      visibleHeight
    ) *
    SETTINGS.galaxyRadiusZScale;

  galaxyThickness =
    Math.min(
      visibleWidth,
      visibleHeight
    ) *
    SETTINGS.galaxyThicknessScale;

  cloudRadiusX =
    visibleWidth *
    0.43;

  cloudRadiusY =
    visibleHeight *
    0.255;

  cloudRadiusZ =
    Math.max(
      galaxyRadiusX * 2.3,
      4
    );
}

/* =========================================================
   초기 흩어진 입자 위치
========================================================= */

function createCloudPosition() {
  const yDirection =
    randomBetween(-1, 1);

  const angle =
    randomBetween(
      0,
      Math.PI * 2
    );

  const horizontal =
    Math.sqrt(
      Math.max(
        0,
        1 -
        yDirection *
        yDirection
      )
    );

  const radius =
    lerp(
      0.22,
      1,
      Math.cbrt(Math.random())
    );

  return {
    x:
      Math.cos(angle) *
      horizontal *
      cloudRadiusX *
      radius,

    y:
      yDirection *
      cloudRadiusY *
      radius,

    z:
      Math.sin(angle) *
      horizontal *
      cloudRadiusZ *
      radius
  };
}

/* =========================================================
   은하수 목표 좌표 생성
========================================================= */

function createGalaxyTargets(count) {
  const targets = [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const randomValue =
      Math.random();

    let layer;
    let radialProgress;

    /*
      바깥 고리에 가장 많은 입자를 배치합니다.
    */
    if (randomValue < 0.58) {
      layer = "outer";

      radialProgress =
        randomBetween(
          0.66,
          1
        );
    } else if (
      randomValue < 0.87
    ) {
      layer = "middle";

      radialProgress =
        randomBetween(
          0.4,
          0.72
        );
    } else {
      layer = "inner";

      radialProgress =
        randomBetween(
          SETTINGS.galaxyHoleSize + 0.07,
          0.70
        );
    }

    /*
      중심이 완전히 꽉 차지 않도록
      최소 반지름을 유지합니다.
    */
    radialProgress =
      Math.max(
        radialProgress,
        SETTINGS.galaxyHoleSize
      );

    /*
      은하의 소용돌이 방향을 위한 각도입니다.
    */
    const baseAngle =
      randomBetween(
        0,
        Math.PI * 2
      );

    const spiralAmount =
      radialProgress *
      Math.PI *
      1.45;

    const angle =
      baseAngle +
      spiralAmount +
      randomBetween(
        -0.24,
        0.24
      );

    /*
      완벽한 타원이 아니라
      먼지처럼 약간 흔들린 고리로 만듭니다.
    */
    const radialNoise =
      randomBetween(
        0.93,
        1.07
      );

    const radius =
      radialProgress *
      radialNoise;

    const thicknessFalloff =
      Math.pow(
        1 -
        radialProgress,
        0.7
      );

    targets.push({
      x:
        Math.cos(angle) *
        galaxyRadiusX *
        radius,

      y:
        randomBetween(
          -galaxyThickness,
          galaxyThickness
        ) *
        (
          0.35 +
          thicknessFalloff
        ),

      z:
        Math.sin(angle) *
        galaxyRadiusZ *
        radius,

      layer,

      radiusProgress:
        radialProgress,

      angleOffset:
        randomBetween(
          -0.08,
          0.08
        )
    });
  }

  shuffle(targets);

  return targets;
}

/* =========================================================
   입자 시스템 생성
========================================================= */

function disposeParticleSystem() {
  if (!points) {
    return;
  }

  scene.remove(points);

  if (particleGeometry) {
    particleGeometry.dispose();
  }

  points = null;
  particleGeometry = null;
}

function buildParticleSystem() {
  disposeParticleSystem();
  calculateWorldSize();

  const isMobile =
    window.innerWidth <
    768;

  const particleCount =
    isMobile
      ? SETTINGS.mobileParticleCount
      : SETTINGS.desktopParticleCount;

  const builderCount =
    Math.floor(
      particleCount *
      SETTINGS.builderRatio
    );

  const builderIndexes =
    Array.from(
      {
        length: particleCount
      },
      (_, index) => index
    );

  shuffle(builderIndexes);

  const builderIndexSet =
    new Set(
      builderIndexes.slice(
        0,
        builderCount
      )
    );

  const galaxyTargets =
    createGalaxyTargets(
      builderCount
    );

  particles = [];

  positions =
    new Float32Array(
      particleCount * 3
    );

  sizes =
    new Float32Array(
      particleCount
    );

  opacities =
    new Float32Array(
      particleCount
    );

  colors =
    new Float32Array(
      particleCount * 3
    );

  let targetIndex = 0;

  for (
    let index = 0;
    index < particleCount;
    index += 1
  ) {
    const cloudPosition =
      createCloudPosition();

    const isBuilder =
      builderIndexSet.has(index);

    let target = null;

    let joinStart =
      Number.POSITIVE_INFINITY;

    if (isBuilder) {
      target =
        galaxyTargets[
          targetIndex
        ];

      targetIndex += 1;

      if (
        target.layer === "outer"
      ) {
        joinStart =
          randomBetween(
            SETTINGS.outerBeginTime,
            SETTINGS.outerEndTime
          );
      } else if (
        target.layer === "middle"
      ) {
        joinStart =
          randomBetween(
            SETTINGS.middleBeginTime,
            SETTINGS.middleEndTime
          );
      } else {
        joinStart =
          randomBetween(
            SETTINGS.innerBeginTime,
            SETTINGS.innerEndTime
          );
      }
    }

    const sourceSize =
      randomBetween(
        isMobile ? 2.6 : 5.2,
        isMobile ? 6 : 7
      );

    const targetSize =
      randomBetween(
        isMobile ? 5.2 : 6,
        isMobile ? 7.2 : 8.6
      );

    particles.push({
      isBuilder,

      sourceX:
        cloudPosition.x,

      sourceY:
        cloudPosition.y,

      sourceZ:
        cloudPosition.z,

      target,
      joinStart,

      joinDuration:
        randomBetween(
          SETTINGS.minimumJoinDuration,
          SETTINGS.maximumJoinDuration
        ),

      phase:
        randomBetween(
          0,
          Math.PI * 2
        ),

      speed:
        randomBetween(
          0.11,
          0.21
        ),

      verticalSpeed:
        randomBetween(
          0.15,
          0.31
        ),

      orbitDirection:
        Math.random() < 0.18
          ? -1
          : 1,

      sourceSize,
      targetSize
    });
  }

  particleGeometry =
    new THREE.BufferGeometry();

  const positionAttribute =
    new THREE.BufferAttribute(
      positions,
      3
    );

  const sizeAttribute =
    new THREE.BufferAttribute(
      sizes,
      1
    );

  const opacityAttribute =
    new THREE.BufferAttribute(
      opacities,
      1
    );

  const colorAttribute =
    new THREE.BufferAttribute(
      colors,
      3
    );

  positionAttribute.setUsage(
    THREE.DynamicDrawUsage
  );

  sizeAttribute.setUsage(
    THREE.DynamicDrawUsage
  );

  opacityAttribute.setUsage(
    THREE.DynamicDrawUsage
  );

  colorAttribute.setUsage(
    THREE.DynamicDrawUsage
  );

  particleGeometry.setAttribute(
    "position",
    positionAttribute
  );

  particleGeometry.setAttribute(
    "aSize",
    sizeAttribute
  );

  particleGeometry.setAttribute(
    "aOpacity",
    opacityAttribute
  );

  particleGeometry.setAttribute(
    "color",
    colorAttribute
  );

  points =
    new THREE.Points(
      particleGeometry,
      particleMaterial
    );

  points.frustumCulled =
    false;

  scene.add(points);
}

/* =========================================================
   초기 흩어진 입자 움직임
========================================================= */

function calculateOrbitPosition(
  particle,
  elapsed
) {
  const angleY =
    elapsed *
    particle.speed *
    particle.orbitDirection +
    particle.phase;

  const cosY =
    Math.cos(angleY);

  const sinY =
    Math.sin(angleY);

  let x =
    particle.sourceX *
    cosY +
    particle.sourceZ *
    sinY;

  let z =
    -particle.sourceX *
    sinY +
    particle.sourceZ *
    cosY;

  let y =
    particle.sourceY;

  const angleX =
    Math.sin(
      elapsed * 0.12 +
      particle.phase * 0.18
    ) *
    0.045;

  const cosX =
    Math.cos(angleX);

  const sinX =
    Math.sin(angleX);

  const rotatedY =
    y * cosX -
    z * sinX;

  const rotatedZ =
    y * sinX +
    z * cosX;

  y = rotatedY;
  z = rotatedZ;

  const angleZ =
    Math.sin(
      elapsed * 0.14
    ) *
    0.035;

  const cosZ =
    Math.cos(angleZ);

  const sinZ =
    Math.sin(angleZ);

  const rotatedX =
    x * cosZ -
    y * sinZ;

  const finalY =
    x * sinZ +
    y * cosZ;

  x = rotatedX;
  y = finalY;

  x +=
    Math.sin(
      elapsed *
      particle.verticalSpeed +
      particle.phase
    ) *
    0.1;

  y +=
    Math.cos(
      elapsed *
      particle.verticalSpeed *
      0.73 +
      particle.phase
    ) *
    0.07;

  z +=
    Math.sin(
      elapsed * 0.18 +
      particle.phase * 1.3
    ) *
    0.12;

  return {
    x,
    y,
    z
  };
}

/* =========================================================
   은하수 회전 좌표
========================================================= */

function calculateGalaxyPosition(
  target,
  elapsed
) {
  const rotationAngle =
    elapsed *
    SETTINGS.galaxyRotationSpeed +
    target.angleOffset;

  const cosRotation =
    Math.cos(rotationAngle);

  const sinRotation =
    Math.sin(rotationAngle);

  /*
    은하의 자체 회전
  */
  let x =
    target.x *
    cosRotation +
    target.z *
    sinRotation;

  let z =
    -target.x *
    sinRotation +
    target.z *
    cosRotation;

  let y =
    target.y;

  /*
    은하를 뒤로 기울입니다.
  */
  const cosTiltX =
    Math.cos(
      SETTINGS.galaxyTiltX
    );

  const sinTiltX =
    Math.sin(
      SETTINGS.galaxyTiltX
    );

  const tiltedY =
    y *
    cosTiltX -
    z *
    sinTiltX;

  const tiltedZ =
    y *
    sinTiltX +
    z *
    cosTiltX;

  y = tiltedY;
  z = tiltedZ;

  /*
    화면에서 대각선으로 보이도록
    한 번 더 기울입니다.
  */
  const cosTiltZ =
    Math.cos(
      SETTINGS.galaxyTiltZ
    );

  const sinTiltZ =
    Math.sin(
      SETTINGS.galaxyTiltZ
    );

  const tiltedX =
    x *
    cosTiltZ -
    y *
    sinTiltZ;

  const finalY =
    x *
    sinTiltZ +
    y *
    cosTiltZ;

  x = tiltedX;
  y = finalY;

  return {
    x,
    y,
    z
  };
}

/* =========================================================
   입자 업데이트
========================================================= */

function updateParticles(elapsed) {
  if (!particleGeometry) {
    return;
  }

  for (
    let index = 0;
    index < particles.length;
    index += 1
  ) {
    const particle =
      particles[index];

    const orbitPosition =
      calculateOrbitPosition(
        particle,
        elapsed
      );

    let currentX =
      orbitPosition.x;

    let currentY =
      orbitPosition.y;

    let currentZ =
      orbitPosition.z;

    let joinProgress = 0;

    if (
      particle.isBuilder &&
      particle.target
    ) {
      joinProgress =
        smootherstep(
          (
            elapsed -
            particle.joinStart
          ) /
          particle.joinDuration
        );

      const galaxyPosition =
        calculateGalaxyPosition(
          particle.target,
          elapsed
        );

      const horizontalDistance =
        Math.max(
          Math.hypot(
            orbitPosition.x,
            orbitPosition.z
          ),
          0.001
        );

      const tangentX =
        -orbitPosition.z /
        horizontalDistance;

      const tangentZ =
        orbitPosition.x /
        horizontalDistance;

      const curveAmount =
        Math.sin(
          Math.PI *
          joinProgress
        ) *
        Math.pow(
          1 -
          joinProgress,
          0.62
        ) *
        galaxyRadiusX *
        0.34;

      currentX =
        lerp(
          orbitPosition.x,
          galaxyPosition.x,
          joinProgress
        ) +
        tangentX *
        curveAmount;

      currentY =
        lerp(
          orbitPosition.y,
          galaxyPosition.y,
          joinProgress
        ) +
        Math.sin(
          Math.PI *
          joinProgress
        ) *
        Math.sin(
          particle.phase
        ) *
        galaxyThickness *
        1.7;

      currentZ =
        lerp(
          orbitPosition.z,
          galaxyPosition.z,
          joinProgress
        ) +
        tangentZ *
        curveAmount;
    }

    const positionIndex =
      index * 3;

    positions[positionIndex] =
      currentX;

    positions[positionIndex + 1] =
      currentY;

    positions[positionIndex + 2] =
      currentZ;

    const sourceSize =
      particle.sourceSize;

    const finalSize =
      particle.targetSize;

    sizes[index] =
      lerp(
        sourceSize,
        finalSize,
        joinProgress
      );

    /*
      모든 입자의 불투명도를 동일하게 유지합니다.
    */
    opacities[index] = 1;

    /*
      모든 입자의 색상을 완전한 검정으로 유지합니다.
    */
    colors[positionIndex] =
      PARTICLE_COLOR.r;

    colors[positionIndex + 1] =
      PARTICLE_COLOR.g;

    colors[positionIndex + 2] =
      PARTICLE_COLOR.b;
  }

  particleGeometry
    .getAttribute("position")
    .needsUpdate = true;

  particleGeometry
    .getAttribute("aSize")
    .needsUpdate = true;

  particleGeometry
    .getAttribute("aOpacity")
    .needsUpdate = true;

  particleGeometry
    .getAttribute("color")
    .needsUpdate = true;
}

/* =========================================================
   마우스 움직임
========================================================= */

window.addEventListener(
  "pointermove",
  (event) => {
    pointerTarget.x =
      event.clientX /
      window.innerWidth *
      2 -
      1;

    pointerTarget.y =
      event.clientY /
      window.innerHeight *
      2 -
      1;
  }
);

window.addEventListener(
  "pointerleave",
  () => {
    pointerTarget.x = 0;
    pointerTarget.y = 0;
  }
);

/* =========================================================
   애니메이션
========================================================= */

const TARGET_FPS =
  window.innerWidth < 768
    ? 24
    : 30;

const FRAME_INTERVAL =
  1000 / TARGET_FPS;

let previousFrameTime = 0;

function animate(timestamp) {

  animationFrameId =

    requestAnimationFrame(

      animate

    );

  if (previousFrameTime === 0) {

    previousFrameTime =

      timestamp;

  }

  const frameDelta =

    timestamp -

    previousFrameTime;

  if (

    frameDelta <

    FRAME_INTERVAL

  ) {

    return;

  }

  previousFrameTime =

    timestamp -

    (

      frameDelta %

      FRAME_INTERVAL

    );

  if (startTime === null) {

    startTime = timestamp;

  }

  const elapsed =
    (
      (
        timestamp -
        startTime
      ) /
      1000
    ) *
    SETTINGS.animationSpeed;

  pointerCurrent.x +=
    (
      pointerTarget.x -
      pointerCurrent.x
    ) *
    0.035;

  pointerCurrent.y +=
    (
      pointerTarget.y -
      pointerCurrent.y
    ) *
    0.035;

  camera.position.x =
    pointerCurrent.x *
    SETTINGS.pointerParallaxX;

  camera.position.y =
    -pointerCurrent.y *
    SETTINGS.pointerParallaxY;

  camera.lookAt(
    0,
    0,
    0
  );

  updateParticles(elapsed);

  renderer.render(
    scene,
    camera
  );

  animationFrameId =
    requestAnimationFrame(
      animate
    );
}

/* =========================================================
   리사이즈
========================================================= */

function resize() {
  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  camera.aspect =
    width /
    height;

  camera.updateProjectionMatrix();

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      2
    )
  );

  renderer.setSize(
    width,
    height,
    false
  );

  particleMaterial.uniforms
    .uPixelRatio.value =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

  buildParticleSystem();

  startTime = null;
}

window.addEventListener(
  "resize",
  () => {
    window.clearTimeout(
      resizeTimer
    );

    resizeTimer =
      window.setTimeout(
        resize,
        180
      );
  }
);

/* =========================================================
   시작
========================================================= */

buildParticleSystem();

const reducedMotion =
  window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

if (reducedMotion) {
  const finalElapsed =
    SETTINGS.innerEndTime +
    SETTINGS.maximumJoinDuration;

  updateParticles(
    finalElapsed
  );

  renderer.render(
    scene,
    camera
  );
} else {
  animationFrameId =
    requestAnimationFrame(
      animate
    );
}

/* =========================================================
   정리
========================================================= */

window.addEventListener(
  "pagehide",
  () => {
    if (
      animationFrameId !== null
    ) {
      cancelAnimationFrame(
        animationFrameId
      );
    }

    window.clearTimeout(
      resizeTimer
    );

    disposeParticleSystem();

    particleMaterial.dispose();
    renderer.dispose();
  },
  {
    once: true
  }
);