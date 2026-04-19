(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const MAX_STEP = 5;
  const STEP_COPY = [
    {
      title: "Motional EMF",
      subtitle: "How does motion become electricity?",
      explanation: "A moving conductor in a magnetic field pushes charge and starts voltage separation."
    },
    {
      title: "Charge Separation",
      subtitle: "Moving charges are pushed by v x B.",
      explanation: "Electrons drift to one side of the rod, so one end turns negative and the other positive."
    },
    {
      title: "EMF Creation",
      subtitle: "Potential difference builds across the rod.",
      explanation: "Motional EMF follows ε = Bℓv: stronger field, longer rod, or faster motion gives more voltage."
    },
    {
      title: "Current Flow",
      subtitle: "A closed loop lets current circulate.",
      explanation: "Once the loop closes, the induced EMF drives continuous current around the circuit."
    },
    {
      title: "Lenz's Law",
      subtitle: "Induced effects oppose the change in flux.",
      explanation: "The induced current opposes motion, so extra mechanical work is required to keep the rod moving."
    },
    {
      title: "Applications",
      subtitle: "Mechanical motion powers real electrical loads.",
      explanation: "Generators scale this same physics to convert rotation into power for real electrical systems."
    }
  ];

  const elements = {
    presentation: document.getElementById("presentation"),
    svg: document.getElementById("sceneSvg"),
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    stepValue: document.getElementById("stepValue"),
    explanation: document.getElementById("explanation")
  };

  if (
    !elements.presentation || !elements.svg || !elements.title || !elements.subtitle || !elements.stepValue || !elements.explanation
  ) {
    return;
  }

  const state = {
    step: 0,
    transitionToken: 0,
    currentOffset: 0,
    currentSpeed: 0,
    currentSpeedTarget: 0,
    generatorSpin: 0,
    rodBaseX: 140,
    lenzPhase: 0,
    overlayTimer: null,
    lastTs: 0,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  const scene = initScene(elements.svg);

  function svgEl(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, String(value)));
    return node;
  }

  function makeAnim(node, opacity = 0) {
    node.classList.add("anim");
    node.style.opacity = String(opacity);
    return node;
  }

  function initScene(svg) {
    svg.replaceChildren();

    const defs = svgEl("defs");
    const glow = svgEl("filter", { id: "glow" });
    glow.append(
      svgEl("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "3", result: "blur" }),
      svgEl("feMerge", {}),
    );
    glow.lastChild.append(svgEl("feMergeNode", { in: "blur" }), svgEl("feMergeNode", { in: "SourceGraphic" }));

    const arrowMarker = svgEl("marker", {
      id: "arrowHead",
      viewBox: "0 0 10 10",
      markerWidth: "8",
      markerHeight: "8",
      refX: "8",
      refY: "5",
      orient: "auto-start-reverse"
    });
    arrowMarker.append(svgEl("path", { d: "M0,0 L10,5 L0,10 z", fill: "#6af2ff" }));

    const rodGradient = svgEl("linearGradient", { id: "rodGradient", x1: "0%", y1: "0%", x2: "100%", y2: "0%" });
    rodGradient.append(
      svgEl("stop", { offset: "0%", "stop-color": "#6ea7ff" }),
      svgEl("stop", { offset: "55%", "stop-color": "#9fd0ff" }),
      svgEl("stop", { offset: "100%", "stop-color": "#6ea7ff" })
    );

    defs.append(glow, arrowMarker, rodGradient);
    svg.append(defs);

    const magneticField = makeAnim(svgEl("g", { id: "magneticField" }), 0.2);
    for (let y = 150; y <= 560; y += 55) {
      for (let x = 260; x <= 940; x += 55) {
        magneticField.append(svgEl("line", { x1: String(x - 6), y1: String(y - 6), x2: String(x + 6), y2: String(y + 6), class: "magnetic-cross" }));
        magneticField.append(svgEl("line", { x1: String(x + 6), y1: String(y - 6), x2: String(x - 6), y2: String(y + 6), class: "magnetic-cross" }));
      }
    }

    const rodGroup = makeAnim(svgEl("g", { id: "rodGroup" }), 0);
    rodGroup.append(svgEl("rect", { x: "0", y: "0", width: "320", height: "24", rx: "12", class: "rod" }));
    const negCap = svgEl("circle", { cx: "12", cy: "12", r: "14", class: "rod-cap cap-negative" });
    const posCap = svgEl("circle", { cx: "308", cy: "12", r: "14", class: "rod-cap cap-positive" });
    rodGroup.append(negCap, posCap);

    const electrons = makeAnim(svgEl("g", { id: "electrons" }), 0);
    const electronNodes = [];
    for (let i = 0; i < 10; i += 1) {
      const electron = svgEl("circle", {
        cx: String(18 + i * 29),
        cy: String(10 + (i % 2 === 0 ? 5 : 15)),
        r: "3.8",
        class: "electron"
      });
      electrons.append(electron);
      electronNodes.push(electron);
    }
    rodGroup.append(electrons);

    const electricField = makeAnim(svgEl("g", { id: "electricField" }), 0);
    for (let i = 0; i < 5; i += 1) {
      const y = 278 + i * 20;
      electricField.append(
        svgEl("line", { x1: "500", y1: String(y), x2: "700", y2: String(y), class: "ef-arrow", "marker-end": "url(#arrowHead)" })
      );
    }

    const circuitPath = makeAnim(
      svgEl("path", {
        id: "circuitPath",
        d: "M440 332 L440 485 L860 485 L860 332 L760 332",
        class: "circuit"
      }),
      0
    );

    const currentParticles = makeAnim(svgEl("g", { id: "currentParticles" }), 0);
    const particles = [];
    for (let i = 0; i < 14; i += 1) {
      const particle = svgEl("circle", { r: "4", class: "current-dot" });
      currentParticles.append(particle);
      particles.push(particle);
    }

    const lenzGroup = makeAnim(svgEl("g", { id: "lenzGroup" }), 0);
    lenzGroup.append(svgEl("line", { x1: "820", y1: "255", x2: "690", y2: "255", class: "lenz-arrow", "marker-end": "url(#arrowHead)" }));

    const generator = makeAnim(svgEl("g", { id: "generator" }), 0);
    generator.append(
      svgEl("circle", { cx: "600", cy: "335", r: "62", class: "generator-ring" }),
      svgEl("line", { x1: "600", y1: "273", x2: "600", y2: "397", class: "generator-axis" }),
      svgEl("line", { x1: "538", y1: "335", x2: "662", y2: "335", class: "generator-axis" })
    );

    const skyline = makeAnim(svgEl("g", { id: "skyline" }), 0);
    const baseY = 595;
    const buildings = [
      [160, 170], [230, 210], [300, 150], [380, 240], [470, 180], [560, 260], [660, 190], [760, 230], [850, 170], [930, 210]
    ];
    buildings.forEach(([x, h], idx) => {
      skyline.append(svgEl("rect", { x: String(x), y: String(baseY - h), width: "52", height: String(h), class: "building" }));
      for (let wy = baseY - h + 12; wy < baseY - 10; wy += 24) {
        skyline.append(svgEl("rect", { x: String(x + 10 + (idx % 2) * 8), y: String(wy), width: "8", height: "10", class: "window" }));
      }
    });

    svg.append(magneticField, circuitPath, currentParticles, electricField, lenzGroup, rodGroup, generator, skyline);

    return {
      magneticField,
      rodGroup,
      negCap,
      posCap,
      electronNodes,
      electricField,
      circuitPath,
      currentParticles,
      particles,
      lenzGroup,
      generator,
      skyline,
      circuitLen: circuitPath.getTotalLength()
    };
  }

  function setOverlay() {
    const copy = STEP_COPY[state.step];
    elements.presentation.classList.add("overlay-out");
    if (state.overlayTimer) {
      window.clearTimeout(state.overlayTimer);
    }
    state.overlayTimer = window.setTimeout(() => {
      elements.title.textContent = copy.title;
      elements.subtitle.textContent = copy.subtitle;
      elements.explanation.textContent = copy.explanation;
      elements.presentation.classList.remove("overlay-out");
    }, state.reducedMotion ? 0 : 170);
  }

  function setStep(nextStep, instant = false) {
    const clamped = Math.max(0, Math.min(MAX_STEP, nextStep));
    if (clamped === state.step && !instant) return;

    const token = ++state.transitionToken;
    scene.skyline.classList.remove("lights-on");
    scene.circuitPath.classList.remove("drawn");
    elements.presentation.classList.add("scene-transitioning");

    // Transition-out phase keeps continuity but reduces visual clutter.
    if (!instant) {
      scene.electricField.style.opacity = "0";
      scene.lenzGroup.style.opacity = "0";
      scene.generator.style.opacity = state.step === 5 ? "0.35" : scene.generator.style.opacity;
      scene.skyline.style.opacity = state.step === 5 ? "0.25" : scene.skyline.style.opacity;
      state.currentSpeedTarget = 0;
    }

    const delay = instant || state.reducedMotion ? 0 : 260;
    window.setTimeout(() => {
      if (token !== state.transitionToken) return;
      state.step = clamped;
      elements.stepValue.textContent = `${state.step} / ${MAX_STEP}`;
      elements.presentation.dataset.step = String(state.step);
      renderStep();
      elements.presentation.classList.remove("scene-transitioning");
    }, delay);
  }

  function setTranslate(node, x, y, rotate = 0) {
    node.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;
  }

  function setElectronShift(shift) {
    scene.electronNodes.forEach((node, idx) => {
      const bias = (idx % 3) * 0.35;
      node.style.transform = `translate(${-shift - bias * 6}px, 0px)`;
    });
  }

  function reveal(node, opacity, delay = 0) {
    node.style.transitionDelay = `${delay}ms`;
    node.style.opacity = String(opacity);
  }

  function setFocus(levels) {
    reveal(scene.magneticField, levels.magnetic ?? 0.18, 0);
    reveal(scene.rodGroup, levels.rod ?? 0, 70);
    reveal(scene.electricField, levels.electric ?? 0, 120);
    reveal(scene.circuitPath, levels.circuit ?? 0, 140);
    reveal(scene.currentParticles, levels.current ?? 0, 220);
    reveal(scene.lenzGroup, levels.lenz ?? 0, 170);
    reveal(scene.generator, levels.generator ?? 0, 140);
    reveal(scene.skyline, levels.skyline ?? 0, 240);
  }

  function resetVisuals() {
    setFocus({ magnetic: 0.2, rod: 0, electric: 0, circuit: 0, current: 0, lenz: 0, generator: 0, skyline: 0 });
    scene.circuitPath.classList.remove("drawn");
    scene.skyline.classList.remove("lights-on");
    reveal(scene.negCap, 0, 120);
    reveal(scene.posCap, 0, 180);
    state.rodBaseX = 140;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    setTranslate(scene.generator, 0, 0, state.generatorSpin);
    setElectronShift(0);
    elements.title.classList.remove("intro-title");
    elements.subtitle.classList.remove("intro-subtitle");
  }

  function intro() {
    setFocus({ magnetic: 0.32 });
    elements.title.classList.add("intro-title");
    elements.subtitle.classList.add("intro-subtitle");
  }

  function chargeSeparation() {
    setFocus({ magnetic: 0.5, rod: 1 });
    state.rodBaseX = 440;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    reveal(scene.negCap, 1, 280);
    reveal(scene.posCap, 1, 380);
    setElectronShift(36);
  }

  function emf() {
    chargeSeparation();
    setFocus({ magnetic: 0.42, rod: 0.95, electric: 1 });
  }

  function current() {
    emf();
    setFocus({ magnetic: 0.32, rod: 0.92, electric: 0.8, circuit: 1, current: 1 });
    scene.circuitPath.classList.add("drawn");
    state.currentSpeedTarget = 155;
  }

  function lenz() {
    current();
    setFocus({ magnetic: 0.3, rod: 0.95, electric: 0.74, circuit: 1, current: 1, lenz: 1 });
    state.rodBaseX = 410;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    state.currentSpeedTarget = 230;
  }

  function applications() {
    lenz();
    setFocus({ magnetic: 0.24, rod: 0, electric: 0, circuit: 0.45, current: 1, lenz: 0, generator: 1, skyline: 1 });
    reveal(scene.rodGroup, 0, 120);
    scene.skyline.classList.add("lights-on");
    state.currentSpeedTarget = 280;
  }

  function renderStep() {
    setOverlay();
    state.currentSpeedTarget = 0;
    resetVisuals();
    if (state.step === 0) intro();
    if (state.step === 1) chargeSeparation();
    if (state.step === 2) emf();
    if (state.step === 3) current();
    if (state.step === 4) lenz();
    if (state.step === 5) applications();
  }

  function animateFrame(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min((ts - state.lastTs) / 1000, 0.04);
    state.lastTs = ts;

    state.currentSpeed += (state.currentSpeedTarget - state.currentSpeed) * Math.min(1, dt * 5.5);

    if (state.step >= 3) {
      state.currentOffset = (state.currentOffset + state.currentSpeed * dt) % scene.circuitLen;
      const spacing = scene.circuitLen / scene.particles.length;
      scene.particles.forEach((particle, idx) => {
        const point = scene.circuitPath.getPointAtLength((state.currentOffset + idx * spacing) % scene.circuitLen);
        particle.setAttribute("cx", point.x.toFixed(2));
        particle.setAttribute("cy", point.y.toFixed(2));
      });
    }

    if (state.step === 4) {
      state.lenzPhase += dt * 24;
      const resistance = Math.sin(state.lenzPhase) * (state.reducedMotion ? 0 : 2.4);
      setTranslate(scene.rodGroup, state.rodBaseX + resistance, 320, 0);
    }

    if (state.step === 5) {
      state.generatorSpin += state.reducedMotion ? 0.3 : 2.3;
      setTranslate(scene.generator, 0, 0, state.generatorSpin);
    }

    window.requestAnimationFrame(animateFrame);
  }

  window.addEventListener("keydown", (event) => {
    if (event.code === "ArrowRight" || event.code === "Space") {
      event.preventDefault();
      setStep(state.step + 1);
      return;
    }
    if (event.code === "ArrowLeft") {
      event.preventDefault();
      setStep(state.step - 1);
      return;
    }
    if (event.code === "KeyR") {
      window.location.reload();
    }
  });

  setStep(0, true);
  window.requestAnimationFrame(animateFrame);
})();

