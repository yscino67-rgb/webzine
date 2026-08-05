"use strict";

import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/* =========================================================
   HTML 요소
========================================================= */

const container =
  document.querySelector(
    ".morph-scene"
  );

const stage =
  document.querySelector(
    ".morph-stage"
  );

const categoryElements =
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

/*
  모듈이 중복 실행되는 상황에서도
  캔버스가 두 개 생기지 않도록 합니다.
*/
container
  .querySelectorAll("canvas")
  .forEach((canvas) => {
    canvas.remove();
  });

/* =========================================================
   설정
========================================================= */

const SETTINGS = {
  /*
    데스크톱 입자 수를 적절히 제한해서
    글자 등장 시에도 렌더링 부하가 크게
    증가하지 않도록 합니다.
  */
  desktopParticleCount: 800,
  desktopLowPowerParticleCount: 620,
  mobileParticleCount: 650,

  builderRatio: 0.88,

  /*
    전체 애니메이션의 기준 속도입니다.
    입자 모임 전후에 같은 시간 기준을 사용합니다.
  */
  animationSpeed: 1.2,

  outerBeginTime: 1.2,
  outerEndTime: 5.9,

  middleBeginTime: 3.7,
  middleEndTime: 9.6,

  innerBeginTime: 6,
  innerEndTime: 14,

  minimumJoinDuration: 2.7,
  maximumJoinDuration: 8.7,

  galaxyRadiusXScale: 0.56,
  galaxyRadiusZScale: 0.29,
  galaxyThicknessScale: 0.032,

  galaxyHoleSize: 0.3,

  galaxyTiltX: -0.28,
  galaxyTiltZ: -0.14,

  galaxyRotationSpeed: 0.12,

  /*
    회색 박스 등장 시간
  */
  categoryRevealTime: 15.5,

  categoryRevealInterval: 2.2,

  categoryRotationSpeed: 0.12,

  categoryOrbitWidth: 0.36,
  categoryOrbitHeight: 0.14,

  /*
    회색 박스는 5개뿐이므로
    데스크톱에서는 부드럽게 60FPS로 갱신합니다.
  */
  desktopCategoryFPS: 60,
  mobileCategoryFPS: 30,

  /*
    일시적으로 프레임이 밀렸을 때
    애니메이션 시간이 과하게 뒤처지는 것을 방지합니다.
  */
  maximumFrameDelta: 250,

  pointerParallaxX: 0.48,
  pointerParallaxY: 0.32
};

const PARTICLE_COLOR =
  new THREE.Color(
    "#000000"
  );

/* =========================================================
   성능 설정
========================================================= */

function isMobileViewport() {
  return window.innerWidth < 768;
}

function isLowPowerDesktop() {
  if (isMobileViewport()) {
    return false;
  }

  const processorCount =
    navigator.hardwareConcurrency ||
    8;

  const deviceMemory =
    navigator.deviceMemory ||
    8;

  return (
    processorCount <= 4 ||
    deviceMemory <= 4
  );
}

function getParticleCount() {
  if (isMobileViewport()) {
    return SETTINGS
      .mobileParticleCount;
  }

  return isLowPowerDesktop()
    ? SETTINGS
        .desktopLowPowerParticleCount
    : SETTINGS
        .desktopParticleCount;
}

function getTargetFPS() {
  return isMobileViewport()
    ? 30
    : 60;
}

function getCategoryTargetFPS() {
  return isMobileViewport()
    ? SETTINGS.mobileCategoryFPS
    : SETTINGS.desktopCategoryFPS;
}

function getPixelRatio() {
  const maximumPixelRatio =
    isMobileViewport()
      ? 1
      : 1.25;

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
    antialias: false,
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
        value:
          getPixelRatio()
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
   고정 회전값
========================================================= */

const COS_GALAXY_TILT_X =
  Math.cos(
    SETTINGS.galaxyTiltX
  );

const SIN_GALAXY_TILT_X =
  Math.sin(
    SETTINGS.galaxyTiltX
  );

const COS_GALAXY_TILT_Z =
  Math.cos(
    SETTINGS.galaxyTiltZ
  );

const SIN_GALAXY_TILT_Z =
  Math.sin(
    SETTINGS.galaxyTiltZ
  );

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

let positionAttribute = null;
let sizeAttribute = null;

let visibleWidth = 0;
let visibleHeight = 0;

let galaxyRadiusX = 0;
let galaxyRadiusZ = 0;
let galaxyThickness = 0;

let cloudRadiusX = 0;
let cloudRadiusY = 0;
let cloudRadiusZ = 0;

let animationFrameId = null;
let resizeTimer = null;

let previousFrameTime = 0;
let elapsedTime = 0;

let frameInterval =
  1000 /
  getTargetFPS();

let categoryFrameInterval =
  1000 /
  getCategoryTargetFPS();

let previousCategoryUpdateTime =
  0;

let previousMobileState =
  isMobileViewport();

let previousLandscapeState =
  window.innerWidth >
  window.innerHeight;

let isDisposed = false;

/*
  화면 크기를 매 프레임 DOM에서 읽지 않고
  리사이즈 때만 갱신합니다.
*/
let cachedStageWidth =
  window.innerWidth;

let cachedStageHeight =
  window.innerHeight;

let cachedCategoryOrbitWidth =
  cachedStageWidth *
  SETTINGS.categoryOrbitWidth;

let cachedCategoryOrbitHeight =
  cachedStageHeight *
  SETTINGS.categoryOrbitHeight;

const pointerTarget = {
  x: 0,
  y: 0
};

const pointerCurrent = {
  x: 0,
  y: 0
};

const orbitOutput = {
  x: 0,
  y: 0,
  z: 0
};

const galaxyOutput = {
  x: 0,
  y: 0,
  z: 0
};

/* =========================================================
   카테고리 설정
========================================================= */

const categoryItems =
  categoryElements.map(
    (element, index) => {
      return {
        element,

        baseAngle:
          Number(
            element.dataset.angle
          ) || 0,

        radius:
          Number(
            element.dataset.radius
          ) || 1,

        revealTime:
          SETTINGS
            .categoryRevealTime +
          index *
          SETTINGS
            .categoryRevealInterval,

        revealed:
          element.classList.contains(
            "is-box-visible"
          )
      };
    }
  );

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
    SETTINGS
      .galaxyRadiusXScale;

  galaxyRadiusZ =
    baseSize *
    SETTINGS
      .galaxyRadiusZScale;

  galaxyThickness =
    baseSize *
    SETTINGS
      .galaxyThicknessScale;

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

function updateCategoryStageSize() {
  cachedStageWidth =
    stage?.clientWidth ||
    window.innerWidth;

  cachedStageHeight =
    stage?.clientHeight ||
    window.innerHeight;

  cachedCategoryOrbitWidth =
    cachedStageWidth *
    SETTINGS.categoryOrbitWidth;

  cachedCategoryOrbitHeight =
    cachedStageHeight *
    SETTINGS.categoryOrbitHeight;
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
          SETTINGS
            .galaxyHoleSize +
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

  positionAttribute = null;
  sizeAttribute = null;
}

function buildParticleSystem() {
  disposeParticleSystem();

  calculateWorldSize();

  const mobile =
    isMobileViewport();

  const particleCount =
    getParticleCount();

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
      Number
        .POSITIVE_INFINITY;

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
            SETTINGS
              .outerBeginTime,
            SETTINGS
              .outerEndTime
          );
      } else if (
        target.layer ===
        "middle"
      ) {
        joinStart =
          randomBetween(
            SETTINGS
              .middleBeginTime,
            SETTINGS
              .middleEndTime
          );
      } else {
        joinStart =
          randomBetween(
            SETTINGS
              .innerBeginTime,
            SETTINGS
              .innerEndTime
          );
      }
    }

    const sourceSize =
      randomBetween(
        mobile
          ? 2.6
          : 5.2,
        mobile
          ? 5
          : 7
      );

    const targetSize =
      randomBetween(
        mobile
          ? 4.2
          : 6,
        mobile
          ? 6
          : 8.6
      );

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
          SETTINGS
            .minimumJoinDuration,
          SETTINGS
            .maximumJoinDuration
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

    const positionIndex =
      index * 3;

    positions[
      positionIndex
    ] = source.x;

    positions[
      positionIndex + 1
    ] = source.y;

    positions[
      positionIndex + 2
    ] = source.z;

    sizes[index] =
      sourceSize;

    opacities[index] = 1;

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

  particleGeometry =
    new THREE.BufferGeometry();

  positionAttribute =
    new THREE.BufferAttribute(
      positions,
      3
    );

  sizeAttribute =
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
    THREE.StaticDrawUsage
  );

  colorAttribute.setUsage(
    THREE.StaticDrawUsage
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

  points.frustumCulled = false;

  scene.add(points);
}

/* =========================================================
   흩어진 입자 움직임
========================================================= */

function calculateOrbitPosition(
  particle,
  elapsed,
  cosFrameZ,
  sinFrameZ,
  output
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

  const rotatedX =
    x * cosFrameZ -
    y * sinFrameZ;

  const finalY =
    x * sinFrameZ +
    y * cosFrameZ;

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

  output.x = x;
  output.y = y;
  output.z = z;
}

/* =========================================================
   은하 회전 위치
========================================================= */

function calculateGalaxyPosition(
  target,
  elapsed,
  output
) {
  const rotationAngle =
    elapsed *
    SETTINGS
      .galaxyRotationSpeed +
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

  const tiltedY =
    y *
    COS_GALAXY_TILT_X -
    z *
    SIN_GALAXY_TILT_X;

  const tiltedZ =
    y *
    SIN_GALAXY_TILT_X +
    z *
    COS_GALAXY_TILT_X;

  y = tiltedY;
  z = tiltedZ;

  const tiltedX =
    x *
    COS_GALAXY_TILT_Z -
    y *
    SIN_GALAXY_TILT_Z;

  const finalY =
    x *
    SIN_GALAXY_TILT_Z +
    y *
    COS_GALAXY_TILT_Z;

  output.x = tiltedX;
  output.y = finalY;
  output.z = z;
}

/* =========================================================
   입자 업데이트
========================================================= */

function updateParticles(elapsed) {
  if (
    !particleGeometry ||
    !positionAttribute ||
    !sizeAttribute
  ) {
    return;
  }

  const frameAngleZ =
    Math.sin(
      elapsed * 0.14
    ) *
    0.035;

  const cosFrameZ =
    Math.cos(
      frameAngleZ
    );

  const sinFrameZ =
    Math.sin(
      frameAngleZ
    );

  for (
    let index = 0;
    index < particles.length;
    index += 1
  ) {
    const particle =
      particles[index];

    calculateOrbitPosition(
      particle,
      elapsed,
      cosFrameZ,
      sinFrameZ,
      orbitOutput
    );

    let currentX =
      orbitOutput.x;

    let currentY =
      orbitOutput.y;

    let currentZ =
      orbitOutput.z;

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

      calculateGalaxyPosition(
        particle.target,
        elapsed,
        galaxyOutput
      );

      const distance =
        Math.max(
          Math.sqrt(
            orbitOutput.x *
            orbitOutput.x +
            orbitOutput.z *
            orbitOutput.z
          ),
          0.001
        );

      const tangentX =
        -orbitOutput.z /
        distance;

      const tangentZ =
        orbitOutput.x /
        distance;

      const joinWave =
        Math.sin(
          Math.PI *
          joinProgress
        );

      const curveAmount =
        joinWave *
        Math.pow(
          1 -
          joinProgress,
          0.62
        ) *
        galaxyRadiusX *
        0.34;

      currentX =
        lerp(
          orbitOutput.x,
          galaxyOutput.x,
          joinProgress
        ) +
        tangentX *
        curveAmount;

      currentY =
        lerp(
          orbitOutput.y,
          galaxyOutput.y,
          joinProgress
        ) +
        joinWave *
        Math.sin(
          particle.phase
        ) *
        galaxyThickness *
        1.7;

      currentZ =
        lerp(
          orbitOutput.z,
          galaxyOutput.z,
          joinProgress
        ) +
        tangentZ *
        curveAmount;
    }

    const positionIndex =
      index * 3;

    positions[
      positionIndex
    ] =
      currentX;

    positions[
      positionIndex + 1
    ] =
      currentY;

    positions[
      positionIndex + 2
    ] =
      currentZ;

    sizes[index] =
      lerp(
        particle.sourceSize,
        particle.targetSize,
        joinProgress
      );
  }

  positionAttribute
    .needsUpdate = true;

  sizeAttribute
    .needsUpdate = true;
}

/* =========================================================
   카테고리 위치 및 등장
========================================================= */

function updateCategoryLabels(
  elapsed,
  forceUpdate = false
) {
  const currentTime =
    performance.now();

  if (
    !forceUpdate &&
    currentTime -
      previousCategoryUpdateTime <
      categoryFrameInterval
  ) {
    return;
  }

  previousCategoryUpdateTime =
    currentTime;

  for (
    let index = 0;
    index < categoryItems.length;
    index += 1
  ) {
    const item =
      categoryItems[index];

    const currentAngle =
      item.baseAngle +
      elapsed *
      SETTINGS
        .categoryRotationSpeed;

    const categoryX =
      Math.cos(
        currentAngle
      ) *
      cachedCategoryOrbitWidth *
      item.radius;

    const categoryY =
      Math.sin(
        currentAngle
      ) *
      cachedCategoryOrbitHeight *
      item.radius;

    const roundedX =
      Math.round(
        categoryX * 10
      ) / 10;

    const roundedY =
      Math.round(
        categoryY * 10
      ) / 10;

    item.element
      .style
      .transform =
        `translate3d(calc(-50% + ${roundedX}px), calc(-50% + ${roundedY}px), 0)`;

    /*
      클래스는 나타나는 순간 단 한 번만 추가합니다.
      이후에는 제거하거나 다시 추가하지 않습니다.
    */
    if (
      !item.revealed &&
      elapsed >=
        item.revealTime
    ) {
      item.revealed = true;

      item.element
        .classList
        .add(
          "is-box-visible"
        );
    }
  }
}

function showAllCategoryLabels() {
  categoryItems.forEach(
    (item) => {
      item.revealed = true;

      item.element
        .classList
        .add(
          "is-box-visible"
        );
    }
  );
}

/* =========================================================
   마우스 움직임
========================================================= */

function handlePointerMove(event) {
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

function handlePointerLeave() {
  pointerTarget.x = 0;
  pointerTarget.y = 0;
}

/* =========================================================
   애니메이션
========================================================= */

function animate(timestamp) {
  if (
    isDisposed ||
    document.hidden
  ) {
    animationFrameId = null;

    return;
  }

  animationFrameId =
    requestAnimationFrame(
      animate
    );

  if (
    previousFrameTime === 0
  ) {
    previousFrameTime =
      timestamp;

    return;
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

  /*
    기존 100ms 제한보다 넉넉하게 적용해
    프레임이 잠시 밀려도 전체 진행 속도가
    갑자기 느려지지 않도록 합니다.
  */
  const safeFrameDelta =
    Math.min(
      frameDelta,
      SETTINGS
        .maximumFrameDelta
    );

  elapsedTime +=
    (
      safeFrameDelta /
      1000
    ) *
    SETTINGS.animationSpeed;

  pointerCurrent.x +=
    (
      pointerTarget.x -
      pointerCurrent.x
    ) *
    0.05;

  pointerCurrent.y +=
    (
      pointerTarget.y -
      pointerCurrent.y
    ) *
    0.05;

  camera.position.x =
    pointerCurrent.x *
    SETTINGS
      .pointerParallaxX;

  camera.position.y =
    -pointerCurrent.y *
    SETTINGS
      .pointerParallaxY;

  camera.lookAt(
    0,
    0,
    0
  );

  updateParticles(
    elapsedTime
  );

  updateCategoryLabels(
    elapsedTime
  );

  renderer.render(
    scene,
    camera
  );
}

function startAnimation() {
  if (
    isDisposed ||
    document.hidden ||
    animationFrameId !== null
  ) {
    return;
  }

  previousFrameTime = 0;

  animationFrameId =
    requestAnimationFrame(
      animate
    );
}

function stopAnimation() {
  if (
    animationFrameId !== null
  ) {
    cancelAnimationFrame(
      animationFrameId
    );

    animationFrameId = null;
  }

  previousFrameTime = 0;
}

/* =========================================================
   탭 비활성화
========================================================= */

function handleVisibilityChange() {
  if (document.hidden) {
    stopAnimation();

    return;
  }

  startAnimation();
}

/* =========================================================
   화면 크기 변경
========================================================= */

function resize() {
  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  const currentMobileState =
    isMobileViewport();

  const currentLandscapeState =
    width >
    height;

  const layoutModeChanged =
    currentMobileState !==
      previousMobileState ||
    currentLandscapeState !==
      previousLandscapeState;

  camera.aspect =
    width /
    height;

  camera
    .updateProjectionMatrix();

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

  categoryFrameInterval =
    1000 /
    getCategoryTargetFPS();

  if (layoutModeChanged) {
    buildParticleSystem();

    updateParticles(
      elapsedTime
    );
  } else {
    calculateWorldSize();
  }

  updateCategoryStageSize();

  updateCategoryLabels(
    elapsedTime,
    true
  );

  renderer.render(
    scene,
    camera
  );

  previousMobileState =
    currentMobileState;

  previousLandscapeState =
    currentLandscapeState;

  previousFrameTime =
    performance.now();
}

function handleResize() {
  window.clearTimeout(
    resizeTimer
  );

  resizeTimer =
    window.setTimeout(
      resize,
      180
    );
}

/* =========================================================
   이벤트 연결
========================================================= */

window.addEventListener(
  "pointermove",
  handlePointerMove,
  {
    passive: true
  }
);

window.addEventListener(
  "pointerleave",
  handlePointerLeave,
  {
    passive: true
  }
);

window.addEventListener(
  "resize",
  handleResize,
  {
    passive: true
  }
);

document.addEventListener(
  "visibilitychange",
  handleVisibilityChange
);

/* =========================================================
   시작
========================================================= */

buildParticleSystem();

updateCategoryStageSize();

updateCategoryLabels(
  elapsedTime,
  true
);

const reducedMotion =
  window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

if (reducedMotion) {
  elapsedTime =
    SETTINGS.innerEndTime +
    SETTINGS
      .maximumJoinDuration;

  updateParticles(
    elapsedTime
  );

  updateCategoryLabels(
    elapsedTime,
    true
  );

  showAllCategoryLabels();

  renderer.render(
    scene,
    camera
  );
} else {
  renderer.compile(
    scene,
    camera
  );

  startAnimation();
}

/* =========================================================
   완전 종료 시 정리
========================================================= */

function disposeIntro() {
  if (isDisposed) {
    return;
  }

  isDisposed = true;

  stopAnimation();

  window.clearTimeout(
    resizeTimer
  );

  window.removeEventListener(
    "pointermove",
    handlePointerMove
  );

  window.removeEventListener(
    "pointerleave",
    handlePointerLeave
  );

  window.removeEventListener(
    "resize",
    handleResize
  );

  document.removeEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  disposeParticleSystem();

  particleMaterial.dispose();

  renderer.dispose();
}

/* =========================================================
   뒤로가기 및 앞으로가기 대응
========================================================= */

function handlePageHide(event) {
  /*
    뒤로가기용 BFCache에 페이지가 보관되는 경우에는
    Three.js 자원을 없애지 않고 애니메이션만 멈춥니다.
  */
  if (event.persisted) {
    stopAnimation();

    return;
  }

  /*
    페이지가 완전히 종료될 때만 자원을 폐기합니다.
  */
  disposeIntro();
}

function handlePageShow(event) {
  /*
    일반 최초 진입은 기존 시작 코드가 담당합니다.
  */
  if (!event.persisted) {
    return;
  }

  /*
    BFCache에서 뒤로가기로 복원되었을 때
    기존 Three.js 상태를 다시 렌더링하고 재생합니다.
  */
  previousFrameTime = 0;

  updateCategoryStageSize();

  camera.aspect =
    window.innerWidth /
    window.innerHeight;

  camera
    .updateProjectionMatrix();

  const pixelRatio =
    getPixelRatio();

  renderer.setPixelRatio(
    pixelRatio
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight,
    false
  );

  particleMaterial
    .uniforms
    .uPixelRatio
    .value =
      pixelRatio;

  updateParticles(
    elapsedTime
  );

  updateCategoryLabels(
    elapsedTime,
    true
  );

  renderer.render(
    scene,
    camera
  );

  startAnimation();
}

window.addEventListener(
  "pagehide",
  handlePageHide
);

window.addEventListener(
  "pageshow",
  handlePageShow
);