"use strict";

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/* =========================================================
   HTML 요소
========================================================= */

const container =
  document.querySelector(".morph-scene");

const categoryLabels =
  Array.from(
    document.querySelectorAll(
      "[data-category-label]"
    )
  );

if (!container) {
  throw new Error(
    ".morph-scene 요소를 찾지 못했습니다."
  );
}

container
  .querySelectorAll("canvas")
  .forEach((canvas) => {
    canvas.remove();
  });

/* =========================================================
   설정
========================================================= */

const SETTINGS = {
  /* 입자 수 */
  desktopParticleCount: 1200,
  mobileParticleCount: 650,

  /* 은하에 들어오는 입자 비율 */
  builderRatio: 0.88,

  /* 전체 시간 속도 */
  animationSpeed: 1.2,

  /* 입자가 은하로 모이는 시간 */
  outerBeginTime: 1.2,
  outerEndTime: 5.9,

  middleBeginTime: 3.7,
  middleEndTime: 9.6,

  innerBeginTime: 6,
  innerEndTime: 14,

  minimumJoinDuration: 2.7,
  maximumJoinDuration: 8.7,

  /* 은하 크기 */
  galaxyRadiusXScale: 0.56,
  galaxyRadiusZScale: 0.29,
  galaxyThicknessScale: 0.032,

  /* 중앙 빈 공간 */
  galaxyHoleSize: 0.3,

  /* 은하 기울기 */
  galaxyTiltX: -0.28,
  galaxyTiltZ: -0.14,

  /* 은하 회전 속도 */
  galaxyRotationSpeed: 0.12,

  /* 첫 번째 회색 네모 등장 시간 */
  categoryRevealTime: 24.5,

  /* 네모가 펼쳐진 뒤 글자가 나오는 시간 */
  categoryTextDelay: 1.4,

  /*
    첫 번째 네모 → 첫 번째 글자 →
    두 번째 네모 순서 간격
  */
  categoryRevealInterval: 3.4,

  /* 카테고리 회전 속도 */
  categoryRotationSpeed: 0.12,

  /* 카테고리 회전 범위 */
  categoryOrbitWidth: 0.36,
  categoryOrbitHeight: 0.14,

  /* 마우스 반응 */
  pointerParallaxX: 0.48,
  pointerParallaxY: 0.32
};

const PARTICLE_COLOR =
  new THREE.Color("#000000");

/* =========================================================
   성능 설정
========================================================= */

function isMobileViewport() {
  return window.innerWidth < 768;
}

function getTargetFPS() {
  return isMobileViewport()
    ? 24
    : 30;
}

function getPixelRatio() {
  const maximumPixelRatio =
    isMobileViewport()
      ? 1
      : 1.5;

  return Math.min(
    window.devicePixelRatio || 1,
    maximumPixelRatio
  );
}

/* =========================================================
   Three.js 장면
========================================================= */

const scene =
  new THREE.Scene();

const camera =
  new THREE.PerspectiveCamera(
    42,
    window.innerWidth /
      window.innerHeight,
    0.1,
    100
  );

camera.position.set(
  0,
  0,
  11.5
);

const renderer =
  new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference:
      "high-performance"
  });

renderer.setPixelRatio(
  getPixelRatio()
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight,
  false
);

renderer.setClearColor(
  0xffffff,
  0
);

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.domElement.className =
  "intro-webgl-canvas";

container.appendChild(
  renderer.domElement
);

/* =========================================================
   입자 셰이더
========================================================= */

const particleMaterial =
  new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending:
      THREE.NormalBlending,

    uniforms: {
      uPixelRatio: {
        value: getPixelRatio()
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

let previousFrameTime = 0;

let frameInterval =
  1000 /
  getTargetFPS();

let pageHidden =
  document.hidden;

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
    Math.max(
      value,
      minimum
    ),
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
    (
      end -
      start
    ) *
    progress
  );
}

function smootherstep(progress) {
  const value =
    clamp(progress);

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
    (
      maximum -
      minimum
    )
  );
}

function shuffle(array) {
  for (
    let index =
      array.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
        (
          index + 1
        )
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
    Math.tan(
      verticalFov / 2
    ) *
    camera.position.z;

  visibleWidth =
    visibleHeight *
    camera.aspect;

  const baseSize =
    Math.min(
      visibleWidth,
      visibleHeight
    );

  galaxyRadiusX =
    baseSize *
    SETTINGS.galaxyRadiusXScale;

  galaxyRadiusZ =
    baseSize *
    SETTINGS.galaxyRadiusZScale;

  galaxyThickness =
    baseSize *
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
   초기 입자 위치
========================================================= */

function createCloudPosition() {
  const yDirection =
    randomBetween(
      -1,
      1
    );

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
      Math.cbrt(
        Math.random()
      )
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
   은하 목표 위치
========================================================= */

function createGalaxyTargets(
  count
) {
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

    if (
      randomValue < 0.58
    ) {
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
          SETTINGS.galaxyHoleSize +
            0.07,
          0.7
        );
    }

    radialProgress =
      Math.max(
        radialProgress,
        SETTINGS.galaxyHoleSize
      );

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

      angleOffset:
        randomBetween(
          -0.08,
          0.08
        )
    });
  }

  return shuffle(targets);
}

/* =========================================================
   입자 시스템
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

  const mobile =
    isMobileViewport();

  const particleCount =
    mobile
      ? SETTINGS.mobileParticleCount
      : SETTINGS.desktopParticleCount;

  const builderCount =
    Math.floor(
      particleCount *
      SETTINGS.builderRatio
    );

  const indexes =
    shuffle(
      Array.from(
        {
          length:
            particleCount
        },
        (_, index) =>
          index
      )
    );

  const builderSet =
    new Set(
      indexes.slice(
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
    const source =
      createCloudPosition();

    const isBuilder =
      builderSet.has(index);

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
        target.layer ===
        "outer"
      ) {
        joinStart =
          randomBetween(
            SETTINGS.outerBeginTime,
            SETTINGS.outerEndTime
          );
      } else if (
        target.layer ===
        "middle"
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

    particles.push({
      isBuilder,

      sourceX:
        source.x,

      sourceY:
        source.y,

      sourceZ:
        source.z,

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

      sourceSize:
        randomBetween(
          mobile
            ? 2.6
            : 5.2,
          mobile
            ? 5
            : 7
        ),

      targetSize:
        randomBetween(
          mobile
            ? 4.2
            : 6,
          mobile
            ? 6
            : 8.6
        )
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
   흩어진 입자 움직임
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
   은하 회전 위치
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
    Math.cos(
      rotationAngle
    );

  const sinRotation =
    Math.sin(
      rotationAngle
    );

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

  const cosTiltX =
    Math.cos(
      SETTINGS.galaxyTiltX
    );

  const sinTiltX =
    Math.sin(
      SETTINGS.galaxyTiltX
    );

  const tiltedY =
    y * cosTiltX -
    z * sinTiltX;

  const tiltedZ =
    y * sinTiltX +
    z * cosTiltX;

  y = tiltedY;
  z = tiltedZ;

  const cosTiltZ =
    Math.cos(
      SETTINGS.galaxyTiltZ
    );

  const sinTiltZ =
    Math.sin(
      SETTINGS.galaxyTiltZ
    );

  const tiltedX =
    x * cosTiltZ -
    y * sinTiltZ;

  const finalY =
    x * sinTiltZ +
    y * cosTiltZ;

  return {
    x:
      tiltedX,

    y:
      finalY,

    z
  };
}

/* =========================================================
   입자 업데이트
========================================================= */

function updateParticles(
  elapsed
) {
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

      const distance =
        Math.max(
          Math.hypot(
            orbitPosition.x,
            orbitPosition.z
          ),
          0.001
        );

      const tangentX =
        -orbitPosition.z /
        distance;

      const tangentZ =
        orbitPosition.x /
        distance;

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

    positions[
      positionIndex
    ] = currentX;

    positions[
      positionIndex + 1
    ] = currentY;

    positions[
      positionIndex + 2
    ] = currentZ;

    sizes[index] =
      lerp(
        particle.sourceSize,
        particle.targetSize,
        joinProgress
      );

    opacities[index] =
      1;

    colors[
      positionIndex
    ] =
      PARTICLE_COLOR.r;

    colors[
      positionIndex + 1
    ] =
      PARTICLE_COLOR.g;

    colors[
      positionIndex + 2
    ] =
      PARTICLE_COLOR.b;
  }

  particleGeometry
    .getAttribute(
      "position"
    )
    .needsUpdate = true;

  particleGeometry
    .getAttribute(
      "aSize"
    )
    .needsUpdate = true;

  particleGeometry
    .getAttribute(
      "aOpacity"
    )
    .needsUpdate = true;

  particleGeometry
    .getAttribute(
      "color"
    )
    .needsUpdate = true;
}

/* =========================================================
   카테고리 위치 및 등장
========================================================= */

function updateCategoryLabels(
  elapsed
) {
  const stage =
    document.querySelector(
      ".morph-stage"
    );

  const stageWidth =
    stage?.clientWidth ||
    window.innerWidth;

  const stageHeight =
    stage?.clientHeight ||
    window.innerHeight;

  const orbitWidth =
    stageWidth *
    SETTINGS.categoryOrbitWidth;

  const orbitHeight =
    stageHeight *
    SETTINGS.categoryOrbitHeight;

  categoryLabels.forEach(
    (
      label,
      index
    ) => {
      const baseAngle =
        Number(
          label.dataset.angle
        ) || 0;

      const radius =
        Number(
          label.dataset.radius
        ) || 1;

      const currentAngle =
        baseAngle +
        elapsed *
        SETTINGS.categoryRotationSpeed;

      const categoryX =
        Math.cos(
          currentAngle
        ) *
        orbitWidth *
        radius;

      const categoryY =
        Math.sin(
          currentAngle
        ) *
        orbitHeight *
        radius;

      label.style.transform =
        `translate3d(
          calc(-50% + ${categoryX}px),
          calc(-50% + ${categoryY}px),
          0
        )`;

      const boxRevealTime =
        SETTINGS.categoryRevealTime +
        index *
        SETTINGS.categoryRevealInterval;

      const textRevealTime =
        boxRevealTime +
        SETTINGS.categoryTextDelay;

      if (
  elapsed >=
  boxRevealTime
) {
  label.classList.add(
    "is-box-visible"
  );
}
    }
  );
}

function showAllCategoryLabels() {
  categoryLabels.forEach(
    (label) => {
      label.classList.add(
        "is-box-visible"
      );
    }
  );
}

function resetCategoryLabels() {
  categoryLabels.forEach(
    (label) => {
      label.classList.remove(
        "is-box-visible"
      );

      label.style.removeProperty(
        "transform"
      );
    }
  );
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
   브라우저 탭 비활성화
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {
    pageHidden =
      document.hidden;

    if (!pageHidden) {
      previousFrameTime =
        performance.now();
    }
  }
);

/* =========================================================
   애니메이션
========================================================= */

function animate(timestamp) {
  animationFrameId =
    requestAnimationFrame(
      animate
    );

  if (pageHidden) {
    return;
  }

  if (
    previousFrameTime === 0
  ) {
    previousFrameTime =
      timestamp;
  }

  const frameDelta =
    timestamp -
    previousFrameTime;

  if (
    frameDelta <
    frameInterval
  ) {
    return;
  }

  previousFrameTime =
    timestamp -
    (
      frameDelta %
      frameInterval
    );

  if (startTime === null) {
    startTime =
      timestamp;
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

  updateParticles(
    elapsed
  );

  updateCategoryLabels(
    elapsed
  );

  renderer.render(
    scene,
    camera
  );
}

/* =========================================================
   화면 크기 변경
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

  const pixelRatio =
    getPixelRatio();

  renderer.setPixelRatio(
    pixelRatio
  );

  renderer.setSize(
    width,
    height,
    false
  );

  particleMaterial
    .uniforms
    .uPixelRatio
    .value =
      pixelRatio;

  frameInterval =
    1000 /
    getTargetFPS();

  buildParticleSystem();
  resetCategoryLabels();

  startTime = null;
  previousFrameTime = 0;
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

  updateCategoryLabels(
    finalElapsed
  );

  showAllCategoryLabels();

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