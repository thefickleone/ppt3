(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const MAX_PAGE = 11;

  const elements = {
    presentation: document.getElementById("presentation"),
    svg: document.getElementById("sceneSvg"),
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    stepValue: document.getElementById("stepValue"),
    explanation: document.getElementById("explanation"),
    velocitySlider: document.getElementById("velocitySlider"),
    velocityValue: document.getElementById("velocityValue")
  };

  if (
    !elements.presentation || !elements.svg || !elements.title || !elements.subtitle || !elements.stepValue || !elements.explanation ||
    !elements.velocitySlider || !elements.velocityValue
  ) {
    return;
  }

  const state = {
    page: 0,
    transitionToken: 0,
    currentOffset: 0,
    currentSpeed: 0,
    currentSpeedTarget: 0,
    generatorSpin: 0,
    rodBaseX: 140,
    motionPhase: 0,
    simulationVelocity: 0.55,
    simulationTravel: 0,
    lenzPhase: 0,
    energyPhase: 0,
    overlayTimer: null,
    inputCooldownUntil: 0,
    lastTs: 0,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  const scene = initScene(elements.svg);

  const pages = [
    {
      title: "Motional EMF",
      subtitle: "How does motion become electricity?",
      explanation: "",
      render: pageIntro
    },
    {
      title: "Real-World Examples",
      subtitle: "Motion and electricity already surround us",
      explanation: "Generator, turbine, and dynamo are real systems using this same motional EMF principle.",
      render: pageExamples
    },
    {
      title: "Rod Question",
      subtitle: "What if a conductor moves through B?",
      explanation: "What if the rod starts moving?",
      render: pageRodQuestion
    },
    {
      title: "Motion and Separation",
      subtitle: "v x B pushes charges apart",
      explanation: "Chapter 4: As the rod moves, electrons drift and clear polarity builds at opposite ends.",
      render: pageMotion
    },
    {
      title: "EMF Formation",
      subtitle: "Internal field appears",
      explanation: "Chapter 5: Separation creates an internal electric field that leads to a measurable EMF.",
      render: pageEMF
    },
    {
      title: "Derivation",
      subtitle: "epsilon = B l v",
      explanation: "Chapter 6: Emphasize the relation between field strength, rod length, and speed.",
      render: pageDerivation
    },
    {
      title: "Simulation View",
      subtitle: "Full setup before current",
      explanation: "Use the velocity slider: higher v increases rod speed, charge separation, and EMF intensity.",
      render: pageSimulation
    },
    {
      title: "Current Flow",
      subtitle: "Closed loop conduction",
      explanation: "",
      render: pageCurrent
    },
    {
      title: "Lenz's Law",
      subtitle: "Opposition to change",
      explanation: "Chapter 9: Induced effects resist motion, slowing the rod unless extra work is supplied.",
      render: pageLenz
    },
    {
      title: "Energy Conversion",
      subtitle: "Mechanical to electrical",
      explanation: "Chapter 10: Energy arrows show mechanical input transformed into electrical output.",
      render: pageEnergy
    },
    {
      title: "Applications",
      subtitle: "Generator to city power",
      explanation: "Chapter 11: Rotational induction scales to practical generation and city lighting.",
      render: pageApplications
    },
    {
      title: "Eddy Currents",
      subtitle: "Induced loops in bulk conductors",
      explanation: "Chapter 12: Changing magnetic fields induce circulating currents that dissipate energy as heat.",
      render: pageEddy
    }
  ];

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

    const rodLengthMarker = makeAnim(svgEl("line", {
      x1: "0",
      y1: "-12",
      x2: "320",
      y2: "-12",
      class: "rod-length-marker",
      "marker-start": "url(#arrowHead)",
      "marker-end": "url(#arrowHead)"
    }), 0);
    rodGroup.append(rodLengthMarker);

    const velocityArrow = makeAnim(svgEl("line", {
      x1: "338",
      y1: "12",
      x2: "412",
      y2: "12",
      class: "velocity-arrow",
      "marker-end": "url(#arrowHead)"
    }), 0);
    rodGroup.append(velocityArrow);

    const rodField = makeAnim(svgEl("g", { id: "rodField" }), 0);
    for (let i = 0; i < 4; i += 1) {
      const x = 62 + i * 62;
      rodField.append(
        svgEl("line", { x1: String(x), y1: "12", x2: String(x + 36), y2: "12", class: "rod-field-arrow", "marker-end": "url(#arrowHead)" })
      );
    }
    rodGroup.append(rodField);

    const emfCore = makeAnim(svgEl("g", { id: "emfCore" }), 0);
    emfCore.append(
      svgEl("circle", { cx: "160", cy: "12", r: "7", class: "emf-core" }),
      svgEl("circle", { cx: "160", cy: "12", r: "13", class: "emf-ring" })
    );
    rodGroup.append(emfCore);

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
        d: "M572 332 L440 332 L440 485 L860 485 L860 332 L892 332",
        class: "circuit"
      }),
      0
    );

    const currentParticles = makeAnim(svgEl("g", { id: "currentParticles" }), 0);
    const particles = [];
    for (let i = 0; i < 18; i += 1) {
      const particle = svgEl("circle", { r: "4", class: "current-dot" });
      currentParticles.append(particle);
      particles.push(particle);
    }

    const lenzGroup = makeAnim(svgEl("g", { id: "lenzGroup" }), 0);
    lenzGroup.append(svgEl("line", { x1: "820", y1: "255", x2: "690", y2: "255", class: "lenz-arrow", "marker-end": "url(#arrowHead)" }));

    const loopDirection = makeAnim(svgEl("g", { id: "loopDirection" }), 0);
    loopDirection.append(
      svgEl("line", { x1: "440", y1: "470", x2: "440", y2: "398", class: "direction-arrow", "marker-end": "url(#arrowHead)" }),
      svgEl("line", { x1: "500", y1: "485", x2: "620", y2: "485", class: "direction-arrow", "marker-end": "url(#arrowHead)" }),
      svgEl("line", { x1: "860", y1: "368", x2: "860", y2: "446", class: "direction-arrow", "marker-end": "url(#arrowHead)" }),
      svgEl("line", { x1: "810", y1: "332", x2: "730", y2: "332", class: "direction-arrow", "marker-end": "url(#arrowHead)" })
    );

    const energyFlow = makeAnim(svgEl("g", { id: "energyFlow" }), 0);
    energyFlow.append(
      svgEl("line", { x1: "320", y1: "220", x2: "500", y2: "220", class: "mech-arrow", "marker-end": "url(#arrowHead)" }),
      svgEl("line", { x1: "700", y1: "220", x2: "900", y2: "220", class: "elec-arrow", "marker-end": "url(#arrowHead)" }),
      svgEl("line", { x1: "600", y1: "245", x2: "600", y2: "290", class: "energy-link", "marker-end": "url(#arrowHead)" })
    );

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

    svg.append(magneticField, circuitPath, currentParticles, electricField, loopDirection, lenzGroup, energyFlow, rodGroup, generator, skyline);

    return {
      magneticField,
      rodGroup,
      negCap,
      posCap,
      electronNodes,
      rodLengthMarker,
      velocityArrow,
      rodField,
      emfCore,
      electricField,
      circuitPath,
      currentParticles,
      particles,
      loopDirection,
      lenzGroup,
      energyFlow,
      generator,
      skyline,
      circuitLen: circuitPath.getTotalLength()
    };
  }

  function setOverlay() {
    const copy = pages[state.page];
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

  function updateProgressUI() {
    elements.stepValue.textContent = `${state.page} / ${MAX_PAGE}`;
  }

  function setPage(nextPage, instant = false) {
    const clamped = Math.max(0, Math.min(MAX_PAGE, nextPage));
    if (clamped === state.page && !instant) return;

    const token = ++state.transitionToken;
    scene.skyline.classList.remove("lights-on");
    scene.circuitPath.classList.remove("drawn");
    elements.presentation.classList.add("scene-transitioning");

    // Transition-out phase keeps continuity but reduces visual clutter.
    if (!instant) {
      scene.electricField.style.opacity = "0";
      scene.lenzGroup.style.opacity = "0";
      scene.generator.style.opacity = state.page >= 9 ? "0.35" : scene.generator.style.opacity;
      scene.skyline.style.opacity = state.page >= 10 ? "0.25" : scene.skyline.style.opacity;
      state.currentSpeedTarget = 0;
    }

    const delay = instant || state.reducedMotion ? 0 : 260;
    window.setTimeout(() => {
      if (token !== state.transitionToken) return;
      state.page = clamped;
      if (state.page === 3) {
        state.motionPhase = 0;
      }
      if (state.page === 6) {
        state.simulationTravel = 0;
      }
      updateProgressUI();
      elements.presentation.dataset.page = String(state.page);
      renderPage();
      elements.presentation.classList.remove("scene-transitioning");
    }, delay);
  }

  function nextPage() {
    if (state.page < MAX_PAGE) {
      setPage(state.page + 1);
    }
  }

  function prevPage() {
    if (state.page > 0) {
      setPage(state.page - 1);
    }
  }

  function setCircuitProgress(progress) {
    const dashTotal = 1300;
    scene.circuitPath.style.opacity = String(0.2 + progress * 0.8);
    scene.circuitPath.style.strokeDashoffset = String(dashTotal * (1 - progress));
  }

  function setTranslate(node, x, y, rotate = 0) {
    node.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;
  }

  function applyChargeSeparationPhase(phase, useRevealDelay = false) {
    const p = Math.max(0, Math.min(1, phase));
    state.rodBaseX = 440 + p * 132;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    setElectronShift(2 + p * 34);

    const capOpacity = 0.28 + p * 0.72;
    if (useRevealDelay) {
      reveal(scene.negCap, capOpacity, 180);
      reveal(scene.posCap, capOpacity, 240);
    } else {
      scene.negCap.style.opacity = String(capOpacity);
      scene.posCap.style.opacity = String(capOpacity);
    }

    const glowSize = 4 + p * 14;
    const glowAlpha = 0.34 + p * 0.56;
    scene.negCap.style.filter = `drop-shadow(0 0 ${glowSize}px rgba(89,243,255,${glowAlpha}))`;
    scene.posCap.style.filter = `drop-shadow(0 0 ${glowSize}px rgba(255,95,109,${glowAlpha}))`;
  }

  function updateSimulationUI() {
    elements.velocityValue.textContent = state.simulationVelocity.toFixed(2);
  }

  function updateSimulationFromVelocity(dt = 0) {
    const v = state.simulationVelocity;
    const separation = 0.28 + v * 0.72;

    if (dt > 0) {
      state.simulationTravel += dt * (0.9 + v * 3.5);
    }
    const sway = Math.sin(state.simulationTravel) * (6 + v * 26);
    state.rodBaseX = 468 + sway;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);

    setElectronShift(6 + separation * 30);
    scene.negCap.style.opacity = String(0.32 + separation * 0.68);
    scene.posCap.style.opacity = String(0.32 + separation * 0.68);

    const glow = 7 + separation * 14;
    scene.negCap.style.filter = `drop-shadow(0 0 ${glow}px rgba(89,243,255,${0.42 + separation * 0.5}))`;
    scene.posCap.style.filter = `drop-shadow(0 0 ${glow}px rgba(255,95,109,${0.42 + separation * 0.5}))`;

    scene.electricField.style.opacity = String(0.35 + v * 0.65);
    scene.rodField.style.opacity = String(0.3 + v * 0.7);
    scene.emfCore.style.opacity = String(0.28 + v * 0.72);
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
    reveal(scene.rodLengthMarker, levels.length ?? 0, 220);
    reveal(scene.velocityArrow, levels.velocity ?? 0, 290);
    reveal(scene.rodField, levels.rodField ?? 0, 150);
    reveal(scene.emfCore, levels.emfCore ?? 0, 220);
    reveal(scene.electricField, levels.electric ?? 0, 120);
    reveal(scene.circuitPath, levels.circuit ?? 0, 140);
    reveal(scene.currentParticles, levels.current ?? 0, 220);
    reveal(scene.loopDirection, levels.direction ?? 0, 180);
    reveal(scene.lenzGroup, levels.lenz ?? 0, 170);
    reveal(scene.energyFlow, levels.energy ?? 0, 210);
    reveal(scene.generator, levels.generator ?? 0, 140);
    reveal(scene.skyline, levels.skyline ?? 0, 240);
  }

  function resetVisuals() {
    setFocus({ magnetic: 0.2, rod: 0, length: 0, velocity: 0, rodField: 0, emfCore: 0, electric: 0, circuit: 0, current: 0, direction: 0, lenz: 0, energy: 0, generator: 0, skyline: 0 });
    scene.circuitPath.classList.remove("drawn");
    scene.circuitPath.style.strokeDashoffset = "1300";
    scene.skyline.classList.remove("lights-on");
    reveal(scene.negCap, 0, 120);
    reveal(scene.posCap, 0, 180);
    scene.negCap.style.filter = "";
    scene.posCap.style.filter = "";
    state.rodBaseX = 140;
    state.motionPhase = 0;
    state.simulationTravel = 0;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    setTranslate(scene.generator, 0, 0, state.generatorSpin);
    setElectronShift(0);
    elements.title.classList.remove("intro-title");
    elements.subtitle.classList.remove("intro-subtitle");
  }

  function pageIntro() {
    setFocus({ magnetic: 0.28, rod: 0 });
    elements.title.classList.add("intro-title");
    elements.subtitle.classList.add("intro-subtitle");
  }

  function pageExamples() {
    setFocus({ magnetic: 0.25, generator: 0.36, skyline: 0.2, energy: 0.24 });
    state.currentSpeedTarget = 42;
  }

  function pageRodQuestion() {
    setFocus({ magnetic: 0.32, rod: 1 });
    state.rodBaseX = 440;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    reveal(scene.negCap, 0.35, 160);
    reveal(scene.posCap, 0.35, 210);
    setElectronShift(0);
  }

  function pageMotion() {
    setFocus({ magnetic: 0.46, rod: 1 });
    applyChargeSeparationPhase(state.motionPhase, true);
  }

  function pageEMF() {
    applyChargeSeparationPhase(1, true);
    setFocus({ magnetic: 0.42, rod: 1, rodField: 1, emfCore: 1, electric: 1 });
    scene.negCap.style.filter = "drop-shadow(0 0 16px rgba(89,243,255,0.92))";
    scene.posCap.style.filter = "drop-shadow(0 0 16px rgba(255,95,109,0.92))";
    elements.presentation.dataset.emphasis = "emf";
  }

  function pageDerivation() {
    pageEMF();
    setFocus({ magnetic: 0.58, rod: 0.98, length: 1, velocity: 1, rodField: 1, emfCore: 1, electric: 1 });
    elements.presentation.dataset.emphasis = "equation";
  }

  function pageSimulation() {
    pageEMF();
    setFocus({ magnetic: 0.34, rod: 0.92, rodField: 0.8, emfCore: 0.78, electric: 0.85, circuit: 0.78, direction: 0.55 });
    setCircuitProgress(0.78);
    updateSimulationFromVelocity(0);
  }

  function pageCurrent() {
    pageSimulation();
    setFocus({ magnetic: 0.32, rod: 0.9, electric: 0.74, circuit: 1, current: 1, direction: 1 });
    setCircuitProgress(1);
    state.currentSpeedTarget = 150;
    elements.presentation.dataset.emphasis = "current";
  }

  function pageLenz() {
    pageCurrent();
    setFocus({ magnetic: 0.3, rod: 0.95, electric: 0.72, circuit: 1, current: 1, direction: 1, lenz: 1 });
    state.rodBaseX = 404;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    state.currentSpeedTarget = 82;
    elements.presentation.dataset.emphasis = "lenz";
  }

  function pageEnergy() {
    pageLenz();
    setFocus({ magnetic: 0.24, rod: 0.55, electric: 0.2, circuit: 0.62, current: 0.9, direction: 0.9, lenz: 0.3, energy: 1, generator: 0.72, skyline: 0.18 });
    state.currentSpeedTarget = 118;
  }

  function pageApplications() {
    pageEnergy();
    setFocus({ magnetic: 0.22, rod: 0.08, electric: 0, circuit: 0.38, current: 0.88, direction: 0.78, lenz: 0, energy: 1, generator: 1, skyline: 1 });
    reveal(scene.rodGroup, 0, 120);
    scene.skyline.classList.add("lights-on");
    state.currentSpeedTarget = 155;
  }

  function pageEddy() {
    setFocus({ magnetic: 0.56, rod: 0, electric: 0.2, circuit: 0.9, current: 1, direction: 1, lenz: 0.6, energy: 0.26, generator: 0.28, skyline: 0.12 });
    setCircuitProgress(1);
    state.currentSpeedTarget = 118;
    scene.skyline.classList.remove("lights-on");
  }

  function renderPage() {
    setOverlay();
    state.currentSpeedTarget = 0;
    resetVisuals();
    elements.presentation.dataset.emphasis = "none";
    pages[state.page].render();
  }

  function animateFrame(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min((ts - state.lastTs) / 1000, 0.04);
    state.lastTs = ts;

    state.currentSpeed += (state.currentSpeedTarget - state.currentSpeed) * Math.min(1, dt * 5.5);

    if (state.page === 6) {
      updateSimulationFromVelocity(dt);
      state.currentSpeedTarget = 42 + state.simulationVelocity * 84;
    }

    if (state.page >= 7) {
      state.currentOffset = (state.currentOffset + state.currentSpeed * dt) % scene.circuitLen;
      const spacing = scene.circuitLen / scene.particles.length;
      scene.particles.forEach((particle, idx) => {
        const point = scene.circuitPath.getPointAtLength((state.currentOffset + idx * spacing) % scene.circuitLen);
        particle.setAttribute("cx", point.x.toFixed(2));
        particle.setAttribute("cy", point.y.toFixed(2));
      });
    }

    if (state.page === 8) {
      state.lenzPhase += dt * 24;
      const resistance = Math.sin(state.lenzPhase) * (state.reducedMotion ? 0 : 2.4);
      setTranslate(scene.rodGroup, state.rodBaseX + resistance, 320, 0);
    }

    if (state.page === 3) {
      if (state.reducedMotion) {
        state.motionPhase = 1;
      } else {
        state.motionPhase += (1 - state.motionPhase) * Math.min(1, dt * 1.45);
      }
      applyChargeSeparationPhase(state.motionPhase);
    }

    if (state.page >= 9) {
      state.generatorSpin += state.reducedMotion ? 0.3 : 2.3;
      setTranslate(scene.generator, 0, 0, state.generatorSpin);
    }

    if (state.page >= 9) {
      state.energyPhase += dt * 4;
      const shimmer = 0.6 + 0.4 * Math.sin(state.energyPhase * Math.PI);
      scene.energyFlow.style.opacity = String(Math.max(0.28, shimmer));
    }

    window.requestAnimationFrame(animateFrame);
  }

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    const now = performance.now();
    if (now < state.inputCooldownUntil) return;

    if (event.code === "ArrowRight" || event.code === "Space") {
      event.preventDefault();
      nextPage();
      state.inputCooldownUntil = now + 95;
      return;
    }
    if (event.code === "ArrowLeft") {
      event.preventDefault();
      prevPage();
      state.inputCooldownUntil = now + 95;
      return;
    }
    if (event.code === "KeyR") {
      state.inputCooldownUntil = now + 120;
      window.location.reload();
    }
  });

  elements.velocitySlider.addEventListener("input", () => {
    state.simulationVelocity = Number(elements.velocitySlider.value) / 100;
    updateSimulationUI();
    if (state.page === 6) {
      updateSimulationFromVelocity(0);
    }
  });

  updateSimulationUI();

  setPage(0, true);
  window.requestAnimationFrame(animateFrame);
})();

