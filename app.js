(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const MAX_PAGE = 11;

  const elements = {
    presentation: document.getElementById("presentation"),
    svg: document.getElementById("sceneSvg"),
    bgGrid: document.querySelector("#background .bg-grid"),
    bgGradient: document.querySelector("#background .bg-gradient"),
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    stepValue: document.getElementById("stepValue"),
    explanation: document.getElementById("explanation"),
    velocitySlider: document.getElementById("velocitySlider"),
    velocityValue: document.getElementById("velocityValue"),
    velocityControl: document.getElementById("velocityControl"),
    velocityActive: document.getElementById("velocityActive"),
    velocityThumb: document.getElementById("velocityThumb"),
    velocityThumbGlow: document.getElementById("velocityThumbGlow"),
    applicationCards: Array.from(document.querySelectorAll("#applicationCards .app-card"))
  };

  if (
    !elements.presentation || !elements.svg || !elements.title || !elements.subtitle || !elements.stepValue || !elements.explanation ||
    !elements.bgGrid || !elements.bgGradient ||
    !elements.velocitySlider || !elements.velocityValue ||
    !elements.velocityControl || !elements.velocityActive || !elements.velocityThumb || !elements.velocityThumbGlow ||
    elements.applicationCards.length === 0
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
    electronNoiseT: 0,
    currentChargeShift: 0,
    rodBaseX: 140,
    motionPhase: 0,
    simulationVelocity: 0.55,
    simulationTravel: 0,
    eddyPosition: 560,
    eddyVelocity: 0,
    eddyPulse: 0,
    eddyPrevOverlap: 0,
    lenzPhase: 0,
    energyPhase: 0,
    overlayTimer: null,
    inputCooldownUntil: 0,
    sliderDragging: false,
    parallaxTargetX: 0,
    parallaxTargetY: 0,
    parallaxX: 0,
    parallaxY: 0,
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
      explanation: "Chapter 5: As the swept flux area grows, changing magnetic flux drives a measurable EMF.",
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
      explanation: "Eddy currents are induced mainly when the rod enters or exits the localized magnetic field region.",
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

    const glowCyan = svgEl("radialGradient", { id: "glowCyan" });
    glowCyan.append(
      svgEl("stop", { offset: "0%", "stop-color": "rgba(89,243,255,0.95)" }),
      svgEl("stop", { offset: "100%", "stop-color": "rgba(89,243,255,0)" })
    );

    const glowRed = svgEl("radialGradient", { id: "glowRed" });
    glowRed.append(
      svgEl("stop", { offset: "0%", "stop-color": "rgba(255,95,109,0.95)" }),
      svgEl("stop", { offset: "100%", "stop-color": "rgba(255,95,109,0)" })
    );

    defs.append(glow, arrowMarker, rodGradient, glowCyan, glowRed);
    svg.append(defs);

    const magneticField = makeAnim(svgEl("g", { id: "magneticField" }), 0.2);
    for (let y = 150; y <= 560; y += 55) {
      for (let x = 260; x <= 940; x += 55) {
        magneticField.append(svgEl("line", { x1: String(x - 6), y1: String(y - 6), x2: String(x + 6), y2: String(y + 6), class: "magnetic-cross" }));
        magneticField.append(svgEl("line", { x1: String(x + 6), y1: String(y - 6), x2: String(x - 6), y2: String(y + 6), class: "magnetic-cross" }));
      }
    }

    const eddyFieldRegion = makeAnim(svgEl("g", { id: "eddyFieldRegion" }), 0);
    eddyFieldRegion.append(
      svgEl("rect", { x: "540", y: "288", width: "180", height: "230", rx: "10", class: "eddy-field-box" }),
      svgEl("line", { x1: "540", y1: "288", x2: "540", y2: "518", class: "eddy-field-edge" }),
      svgEl("line", { x1: "720", y1: "288", x2: "720", y2: "518", class: "eddy-field-edge" })
    );

    const rodGroup = makeAnim(svgEl("g", { id: "rodGroup" }), 0);
    rodGroup.append(svgEl("rect", { x: "0", y: "0", width: "320", height: "24", rx: "12", class: "rod" }));
    const capGlowNeg = svgEl("circle", { cx: "12", cy: "12", r: "30", class: "rod-cap-glow cap-glow-negative" });
    const capGlowPos = svgEl("circle", { cx: "308", cy: "12", r: "30", class: "rod-cap-glow cap-glow-positive" });
    const negCap = svgEl("circle", { cx: "12", cy: "12", r: "14", class: "rod-cap cap-negative" });
    const posCap = svgEl("circle", { cx: "308", cy: "12", r: "14", class: "rod-cap cap-positive" });
    rodGroup.append(capGlowNeg, capGlowPos, negCap, posCap);

    const electrons = makeAnim(svgEl("g", { id: "electrons" }), 0);
    const electronNodes = [];
    const electronMeta = [];
    for (let i = 0; i < 10; i += 1) {
      const baseX = 18 + i * 29;
      const baseY = 10 + (i % 2 === 0 ? 5 : 15);
      const electron = svgEl("circle", {
        cx: String(baseX),
        cy: String(baseY),
        r: "3.8",
        class: "electron"
      });
      electrons.append(electron);
      electronNodes.push(electron);
      electronMeta.push({
        baseX,
        baseY,
        noise: 0.55 + ((i * 37) % 10) / 20,
        phase: i * 0.62
      });
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

    const fluxArea = makeAnim(
      svgEl("rect", {
        id: "fluxArea",
        x: "440",
        y: "332",
        width: "0",
        height: "153",
        rx: "4",
        class: "flux-area"
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
    lenzGroup.append(
      svgEl("line", { x1: "820", y1: "255", x2: "690", y2: "255", class: "lenz-arrow", "marker-end": "url(#arrowHead)" }),
      svgEl("line", { x1: "760", y1: "284", x2: "680", y2: "284", class: "lenz-field-line" }),
      svgEl("line", { x1: "764", y1: "306", x2: "684", y2: "306", class: "lenz-field-line" }),
      svgEl("line", { x1: "768", y1: "328", x2: "688", y2: "328", class: "lenz-field-line" }),
      svgEl("path", { d: "M760 294 C740 280, 716 280, 696 294 C716 308, 740 308, 760 294", class: "lenz-wave" })
    );

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

    const energyConverter = makeAnim(svgEl("g", { id: "energyConverter" }), 0);
    energyConverter.append(
      svgEl("rect", { x: "500", y: "178", width: "78", height: "68", rx: "12", class: "mech-block" }),
      svgEl("rect", { x: "622", y: "178", width: "78", height: "68", rx: "12", class: "elec-block" }),
      svgEl("circle", { cx: "600", cy: "212", r: "14", class: "transform-core" }),
      svgEl("circle", { cx: "600", cy: "212", r: "24", class: "transform-ring" }),
      svgEl("circle", { cx: "600", cy: "212", r: "34", class: "transform-ring" })
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

    const eddyLoops = makeAnim(svgEl("g", { id: "eddyLoops" }), 0);
    const eddyCenters = [
      [520, 348], [600, 336], [690, 352], [570, 414], [660, 410]
    ];
    eddyCenters.forEach(([cx, cy], idx) => {
      eddyLoops.append(
        svgEl("circle", { cx: String(cx), cy: String(cy), r: "24", class: "eddy-loop" }),
        svgEl("circle", { cx: String(cx), cy: String(cy), r: "12", class: "eddy-core" })
      );
      eddyLoops.lastChild.style.animationDelay = `${idx * 120}ms`;
      eddyLoops.children[eddyLoops.children.length - 2].style.animationDelay = `${idx * 120}ms`;
    });

    svg.append(magneticField, eddyFieldRegion, fluxArea, circuitPath, currentParticles, electricField, loopDirection, lenzGroup, energyFlow, energyConverter, eddyLoops, rodGroup, generator, skyline);

    return {
      magneticField,
      eddyFieldRegion,
      rodGroup,
      capGlowNeg,
      capGlowPos,
      negCap,
      posCap,
      electronNodes,
      electronMeta,
      rodLengthMarker,
      velocityArrow,
      rodField,
      emfCore,
      fluxArea,
      electricField,
      circuitPath,
      currentParticles,
      particles,
      loopDirection,
      lenzGroup,
      energyFlow,
      energyConverter,
      eddyLoops,
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
      scene.generator.style.opacity = state.page >= 9 ? "0.5" : scene.generator.style.opacity;
      scene.skyline.style.opacity = state.page >= 10 ? "0.35" : scene.skyline.style.opacity;
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

  function setActiveApplicationCard(card) {
    elements.applicationCards.forEach((item) => {
      item.classList.toggle("active", item === card);
    });
  }

  function setCircuitProgress(progress) {
    const dashTotal = 1300;
    scene.circuitPath.style.opacity = String(0.2 + progress * 0.8);
    scene.circuitPath.style.strokeDashoffset = String(dashTotal * (1 - progress));
  }

  function updateFluxArea(rodX, intensity) {
    const width = Math.max(0, Math.min(420, rodX - 440));
    scene.fluxArea.setAttribute("width", width.toFixed(2));
    scene.fluxArea.style.opacity = String(0.16 + intensity * 0.74);
    scene.fluxArea.style.fillOpacity = String(0.08 + intensity * 0.3);
  }

  function getEddyOverlap(rodX) {
    const rodLeft = rodX;
    const rodRight = rodX + 320;
    const fieldLeft = 540;
    const fieldRight = 720;
    return Math.max(0, Math.min(rodRight, fieldRight) - Math.max(rodLeft, fieldLeft));
  }

  function setTranslate(node, x, y, rotate = 0, scale = 1, depth = 0) {
    const px = state.parallaxX * depth;
    const py = state.parallaxY * depth;
    node.style.transform = `translate(${(x + px).toFixed(2)}px, ${(y + py).toFixed(2)}px) rotate(${rotate}deg) scale(${scale})`;
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

    const glowAlpha = 0.18 + p * 0.55;
    const glowScale = 0.85 + p * 0.35;
    scene.capGlowNeg.style.opacity = String(glowAlpha);
    scene.capGlowPos.style.opacity = String(glowAlpha);
    scene.capGlowNeg.style.transform = `scale(${glowScale})`;
    scene.capGlowPos.style.transform = `scale(${glowScale})`;
  }

  function updateSimulationUI() {
    elements.velocityValue.textContent = state.simulationVelocity.toFixed(2);
    const x = 40 + state.simulationVelocity * 600;
    elements.velocityActive.setAttribute("x2", x.toFixed(2));
    elements.velocityThumb.setAttribute("cx", x.toFixed(2));
    elements.velocityThumbGlow.setAttribute("cx", x.toFixed(2));
  }

  function setSimulationVelocity(value) {
    state.simulationVelocity = Math.max(0, Math.min(1, value));
    elements.velocitySlider.value = String(Math.round(state.simulationVelocity * 100));
    updateSimulationUI();
    if (state.page === 6) {
      updateSimulationFromVelocity(0);
    }
  }

  function updateVelocityFromPointer(clientX) {
    const rect = elements.velocityControl.getBoundingClientRect();
    if (rect.width <= 0) return;
    const t = (clientX - rect.left) / rect.width;
    setSimulationVelocity(t);
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
    scene.capGlowNeg.style.opacity = String(0.22 + separation * 0.62);
    scene.capGlowPos.style.opacity = String(0.22 + separation * 0.62);
    scene.capGlowNeg.style.transform = `scale(${0.9 + separation * 0.34})`;
    scene.capGlowPos.style.transform = `scale(${0.9 + separation * 0.34})`;

    scene.electricField.style.opacity = String(0.35 + v * 0.65);
    scene.rodField.style.opacity = String(0.3 + v * 0.7);
    scene.emfCore.style.opacity = String(0.28 + v * 0.72);
    updateFluxArea(state.rodBaseX, 0.22 + separation * 0.78);
  }

  function setElectronShift(shift) {
    state.currentChargeShift = shift;
    const p = Math.max(0, Math.min(1, shift / 36));
    const eased = 1 - Math.pow(1 - p, 3);
    const effectiveShift = 36 * eased;

    scene.electronNodes.forEach((node, idx) => {
      const meta = scene.electronMeta[idx];
      const bias = (idx % 3) * 0.35;
      const noiseScale = state.reducedMotion ? 0 : meta.noise;
      const collision = state.reducedMotion ? 0 : Math.sin(state.electronNoiseT * 2.6 + idx * 0.9) * (0.45 + p * 0.9);
      const jitterX = Math.sin(state.electronNoiseT * 1.7 + meta.phase) * noiseScale * 1.35;
      const jitterY = Math.cos(state.electronNoiseT * 1.25 + meta.phase * 1.2) * noiseScale * 0.8;
      const x = -effectiveShift - bias * 6 + jitterX + collision;
      node.style.transform = `translate(${x.toFixed(2)}px, ${jitterY.toFixed(2)}px)`;
    });
  }

  function reveal(node, opacity, delay = 0) {
    node.style.transitionDelay = `${delay}ms`;
    node.style.opacity = String(opacity);
  }

  function setFocus(levels) {
    reveal(scene.magneticField, levels.magnetic ?? 0.18, 0);
    reveal(scene.eddyFieldRegion, levels.eddyField ?? 0, 120);
    reveal(scene.rodGroup, levels.rod ?? 0, 70);
    reveal(scene.rodLengthMarker, levels.length ?? 0, 220);
    reveal(scene.velocityArrow, levels.velocity ?? 0, 290);
    reveal(scene.rodField, levels.rodField ?? 0, 150);
    reveal(scene.emfCore, levels.emfCore ?? 0, 220);
    reveal(scene.fluxArea, levels.flux ?? 0, 170);
    reveal(scene.electricField, levels.electric ?? 0, 120);
    reveal(scene.circuitPath, levels.circuit ?? 0, 140);
    reveal(scene.currentParticles, levels.current ?? 0, 220);
    reveal(scene.loopDirection, levels.direction ?? 0, 180);
    reveal(scene.lenzGroup, levels.lenz ?? 0, 170);
    reveal(scene.energyFlow, levels.energy ?? 0, 210);
    reveal(scene.energyConverter, levels.converter ?? 0, 230);
    reveal(scene.eddyLoops, levels.eddy ?? 0, 190);
    reveal(scene.generator, levels.generator ?? 0, 140);
    reveal(scene.skyline, levels.skyline ?? 0, 240);
  }

  function resetVisuals() {
    setFocus({ magnetic: 0.2, eddyField: 0, rod: 0, length: 0, velocity: 0, rodField: 0, emfCore: 0, flux: 0, electric: 0, circuit: 0, current: 0, direction: 0, lenz: 0, energy: 0, converter: 0, eddy: 0, generator: 0, skyline: 0 });
    scene.circuitPath.classList.remove("drawn");
    scene.circuitPath.style.strokeDashoffset = "1300";
    scene.skyline.classList.remove("lights-on");
    scene.lenzGroup.style.transform = "translate(0px, 0px) scale(1)";
    scene.magneticField.style.transform = "translate(0px, 0px) scale(1, 1)";
    reveal(scene.negCap, 0, 120);
    reveal(scene.posCap, 0, 180);
    scene.capGlowNeg.style.opacity = "0";
    scene.capGlowPos.style.opacity = "0";
    scene.capGlowNeg.style.transform = "scale(1)";
    scene.capGlowPos.style.transform = "scale(1)";
    updateFluxArea(440, 0);
    state.rodBaseX = 140;
    state.motionPhase = 0;
    state.simulationTravel = 0;
    state.eddyPosition = 560;
    state.eddyVelocity = 0;
    state.eddyPulse = 0;
    state.eddyPrevOverlap = 0;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0, 1, 1.05);
    setTranslate(scene.generator, 0, 0, state.generatorSpin, 1, 0.8);
    setElectronShift(0);
    elements.title.classList.remove("intro-title");
    elements.subtitle.classList.remove("intro-subtitle");
  }

  function pageIntro() {
    setFocus({ magnetic: 0.14, rod: 0.9, rodField: 0, emfCore: 0, electric: 0, circuit: 0.12, current: 0.12, direction: 0, lenz: 0, energy: 1, converter: 1, generator: 0.88, skyline: 0.08 });
    // Morph the existing rod into the converter core so the world evolves continuously.
    state.rodBaseX = 560;
    setTranslate(scene.rodGroup, state.rodBaseX, 198, 0, 0.34, 1.05);
    setElectronShift(0);
    scene.negCap.style.opacity = "0.65";
    scene.posCap.style.opacity = "0.65";
    elements.subtitle.classList.add("intro-subtitle");
  }

  function pageExamples() {
    setFocus({ magnetic: 0.25, generator: 0.36, skyline: 0.2, energy: 0.24 });
    state.currentSpeedTarget = 42;
    setFocus({ magnetic: 0.22, rod: 0.28, rodField: 0, emfCore: 0, electric: 0, circuit: 0.38, current: 0.88, direction: 0.78, lenz: 0, energy: 1, converter: 0, eddy: 0, generator: 1, skyline: 1 });
    setTranslate(scene.rodGroup, 574, 206, 0, 0.24);
  }

  function pageRodQuestion() {
    setFocus({ magnetic: 0.32, rod: 1 });
    state.rodBaseX = 440;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0, 1, 1.05);
    reveal(scene.negCap, 0.35, 160);
    reveal(scene.posCap, 0.35, 210);
    setElectronShift(0);
  }

  function pageMotion() {
    setFocus({ magnetic: 0.46, rod: 1, flux: 1 });
    applyChargeSeparationPhase(state.motionPhase, true);
    updateFluxArea(state.rodBaseX, state.motionPhase);
  }

  function pageEMF() {
    applyChargeSeparationPhase(1, true);
    setFocus({ magnetic: 0.42, rod: 1, rodField: 1, emfCore: 1, flux: 1, electric: 1 });
    updateFluxArea(state.rodBaseX, 1);
    scene.capGlowNeg.style.opacity = "0.86";
    scene.capGlowPos.style.opacity = "0.86";
    scene.capGlowNeg.style.transform = "scale(1.2)";
    scene.capGlowPos.style.transform = "scale(1.2)";
    elements.presentation.dataset.emphasis = "emf";
  }

  function pageDerivation() {
    pageEMF();
    setFocus({ magnetic: 0.58, rod: 0.98, length: 1, velocity: 1, rodField: 1, emfCore: 1, flux: 1, electric: 1 });
    elements.presentation.dataset.emphasis = "equation";
  }

  function pageSimulation() {
    pageEMF();
    setFocus({ magnetic: 0.34, rod: 0.92, rodField: 0.8, emfCore: 0.78, flux: 1, electric: 0.85, circuit: 0.78, direction: 0.55 });
    setCircuitProgress(0.78);
    updateSimulationFromVelocity(0);
  }

  function pageCurrent() {
    pageSimulation();
    setFocus({ magnetic: 0.32, rod: 0.9, flux: 0.92, electric: 0.74, circuit: 1, current: 1, direction: 1 });
    setCircuitProgress(1);
    state.currentSpeedTarget = 150;
    elements.presentation.dataset.emphasis = "current";
  }

  function pageLenz() {
    pageCurrent();
    setFocus({ magnetic: 0.42, rod: 0.95, flux: 0.9, electric: 0.72, circuit: 1, current: 1, direction: 1, lenz: 1 });
    state.rodBaseX = 388;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0, 1, 1.05);
    state.currentSpeedTarget = 208;
    scene.lenzGroup.style.transform = "translate(0px, -2px) scale(1.08)";
    elements.presentation.dataset.emphasis = "lenz";
  }

  function pageEnergy() {
    setFocus({ magnetic: 0.12, rod: 0.05, electric: 0, circuit: 0, current: 0, direction: 0, lenz: 0, energy: 1, converter: 1, generator: 0.88, skyline: 0.06 });
    reveal(scene.rodGroup, 0, 0);
    state.currentSpeedTarget = 0;
    elements.presentation.dataset.emphasis = "energy";
  }

  function pageApplications() {
    pageEnergy();
    setFocus({ magnetic: 0.22, rod: 0.08, electric: 0, circuit: 0.38, current: 0.88, direction: 0.78, lenz: 0, energy: 1, generator: 1, skyline: 1 });
    reveal(scene.rodGroup, 0, 120);
    scene.skyline.classList.add("lights-on");
    state.currentSpeedTarget = 155;
  }

  function pageEddy() {
    setFocus({ magnetic: 0.14, eddyField: 1, rod: 1, electric: 0.06, circuit: 0.1, current: 0, direction: 0, lenz: 0, energy: 0, converter: 0, eddy: 0.2, generator: 0, skyline: 0.04 });
    state.eddyPosition = 420;
    state.eddyVelocity = 220;
    state.eddyPulse = 0;
    state.eddyPrevOverlap = getEddyOverlap(state.eddyPosition);
    state.currentSpeedTarget = 0;
    scene.circuitPath.style.opacity = "0.12";
    scene.skyline.classList.remove("lights-on");
    elements.presentation.dataset.emphasis = "eddy";
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
    state.electronNoiseT += dt;

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
      state.lenzPhase += dt * 3.2;
      const opposition = state.reducedMotion ? 0.6 : (0.5 + 0.5 * Math.sin(state.lenzPhase));
      scene.magneticField.style.transform = `translate(${-5 * opposition}px, 0px) scale(${1 - opposition * 0.02}, 1)`;
      scene.magneticField.style.opacity = String(0.36 + opposition * 0.2);
      scene.lenzGroup.style.transform = `translate(${-7 * opposition}px, -2px) scale(${1.06 + opposition * 0.05})`;
      // Keep rod stable to avoid glitch-like jitter; opposition is shown by field deformation.
      setTranslate(scene.rodGroup, state.rodBaseX, 320, 0, 1, 1.05);
    }

    if (state.page === 3) {
      if (state.reducedMotion) {
        state.motionPhase = 1;
      } else {
        state.motionPhase += (1 - state.motionPhase) * Math.min(1, dt * 1.45);
      }
      applyChargeSeparationPhase(state.motionPhase);
    }

    if (state.page >= 3 && state.page <= 8 && state.currentChargeShift > 0) {
      setElectronShift(state.currentChargeShift);
    }

    if (state.page >= 9) {
      state.generatorSpin += state.reducedMotion ? 0.3 : 2.3;
      setTranslate(scene.generator, 0, 0, state.generatorSpin, 1, 0.8);
    }

    if (state.page >= 9) {
      state.energyPhase += dt * 4;
      const shimmer = 0.6 + 0.4 * Math.sin(state.energyPhase * Math.PI);
      scene.energyFlow.style.opacity = String(Math.max(0.28, shimmer));
    }

    if (state.page === 11) {
      const overlap = getEddyOverlap(state.eddyPosition);
      const entered = state.eddyPrevOverlap === 0 && overlap > 0;
      const exited = state.eddyPrevOverlap > 0 && overlap === 0;
      if (entered || exited) {
        state.eddyPulse = 1;
        state.eddyVelocity *= 0.72;
      }
      state.eddyPrevOverlap = overlap;

      state.eddyPulse = Math.max(0, state.eddyPulse - dt * 1.25);
      state.eddyVelocity = Math.max(18, state.eddyVelocity - dt * 16);
      state.eddyPosition += dt * state.eddyVelocity;
      if (state.eddyPosition > 780) {
        state.eddyPosition = 780;
      }
      setTranslate(scene.rodGroup, state.eddyPosition, 320, 0, 1, 1.05);
      const eddyVis = (overlap > 0 ? 0.22 : 0.08) + state.eddyPulse * 0.78;
      scene.eddyLoops.style.opacity = String(Math.min(1, eddyVis));
      scene.eddyLoops.style.transform = `translate(0px, 0px) scale(${0.94 + state.eddyPulse * 0.2})`;
    }

    const ambientX = Math.sin(ts * 0.00023) * 5;
    const ambientY = Math.cos(ts * 0.00019) * 4;
    const targetX = state.parallaxTargetX + ambientX;
    const targetY = state.parallaxTargetY + ambientY;
    state.parallaxX += (targetX - state.parallaxX) * Math.min(1, dt * 2.6);
    state.parallaxY += (targetY - state.parallaxY) * Math.min(1, dt * 2.6);

    elements.bgGrid.style.transform = `translate(${(state.parallaxX * 0.35).toFixed(2)}px, ${(state.parallaxY * 0.35).toFixed(2)}px)`;
    elements.bgGradient.style.transform = `translate(${(state.parallaxX * 0.18).toFixed(2)}px, ${(state.parallaxY * 0.18).toFixed(2)}px)`;

    if (state.page !== 8) {
      scene.magneticField.style.transform = `translate(${(state.parallaxX * 0.55).toFixed(2)}px, ${(state.parallaxY * 0.42).toFixed(2)}px) scale(1, 1)`;
    }

    window.requestAnimationFrame(animateFrame);
  }

  window.addEventListener("pointermove", (event) => {
    const rect = elements.presentation.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    state.parallaxTargetX = nx * 14;
    state.parallaxTargetY = ny * 10;
  });

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
    setSimulationVelocity(Number(elements.velocitySlider.value) / 100);
  });

  elements.velocityControl.addEventListener("mousedown", (event) => {
    state.sliderDragging = true;
    updateVelocityFromPointer(event.clientX);
  });

  window.addEventListener("mousemove", (event) => {
    if (!state.sliderDragging) return;
    updateVelocityFromPointer(event.clientX);
  });

  window.addEventListener("mouseup", () => {
    state.sliderDragging = false;
  });

  elements.applicationCards.forEach((card) => {
    card.addEventListener("click", () => setActiveApplicationCard(card));
    card.addEventListener("keydown", (event) => {
      if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault();
        setActiveApplicationCard(card);
      }
    });
  });

  setActiveApplicationCard(elements.applicationCards[0]);

  setSimulationVelocity(state.simulationVelocity);

  setPage(0, true);
  window.requestAnimationFrame(animateFrame);
})();

