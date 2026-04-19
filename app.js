(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const MAX_STEP = 5;
  const steps = [
    {
      title: "Motional EMF",
      subtitle: "How does motion become electricity?",
      lines: [
        "A moving conductor in a magnetic field begins the induction story.",
        "Magnetic force shifts charges inside the rod and starts separation.",
        "That separation is the origin of motional EMF."
      ]
    },
    {
      title: "Charge Separation",
      subtitle: "Moving charges are pushed by v x B.",
      lines: [
        "As the rod moves right, electrons drift toward one end.",
        "The left end accumulates negative charge; the right end becomes positive.",
        "Polarity is now established across the conductor."
      ]
    },
    {
      title: "EMF Creation",
      subtitle: "Potential difference builds across the rod.",
      lines: [
        "Charge separation creates an internal electric field in the rod.",
        "The field grows until it balances magnetic driving on charges.",
        "Motional EMF is set by epsilon = B l v."
      ]
    },
    {
      title: "Current Flow",
      subtitle: "A closed loop lets current circulate.",
      lines: [
        "Now the circuit closes and the voltage has a complete path.",
        "Charges circulate through the loop as observable current.",
        "Mechanical motion is now converted into electrical power flow."
      ]
    },
    {
      title: "Lenz's Law",
      subtitle: "Induced effects oppose the change in flux.",
      lines: [
        "The induced current creates a magnetic effect opposing the motion.",
        "That opposition appears as an effective resisting force.",
        "To maintain speed, external work must continuously be supplied."
      ]
    },
    {
      title: "Applications",
      subtitle: "Mechanical motion powers real electrical loads.",
      lines: [
        "This same principle drives real electric generators.",
        "Rotation in magnetic fields induces usable electrical output.",
        "From labs to cities, motion becomes electricity at scale."
      ]
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
    lineIndex: 0,
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
    const copy = steps[state.step];
    elements.presentation.classList.add("overlay-out");
    if (state.overlayTimer) {
      window.clearTimeout(state.overlayTimer);
    }
    state.overlayTimer = window.setTimeout(() => {
      elements.title.textContent = copy.title;
      elements.subtitle.textContent = copy.subtitle;
      elements.explanation.textContent = copy.lines[state.lineIndex] || "";
      elements.presentation.classList.remove("overlay-out");
    }, state.reducedMotion ? 0 : 170);
  }

  function getLineProgress() {
    const lineCount = steps[state.step].lines.length;
    if (lineCount <= 1) return 1;
    return state.lineIndex / (lineCount - 1);
  }

  function updateProgressUI() {
    const totalLines = steps[state.step].lines.length;
    elements.stepValue.textContent = `${state.step} / ${MAX_STEP} · ${state.lineIndex + 1}/${totalLines}`;
  }

  function setStep(nextStep, instant = false, lineIndex = 0) {
    const clamped = Math.max(0, Math.min(MAX_STEP, nextStep));
    const nextLine = Math.max(0, Math.min((steps[clamped]?.lines.length || 1) - 1, lineIndex));
    if (clamped === state.step && nextLine === state.lineIndex && !instant) return;

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
      state.lineIndex = nextLine;
      updateProgressUI();
      elements.presentation.dataset.step = String(state.step);
      renderStep();
      elements.presentation.classList.remove("scene-transitioning");
    }, delay);
  }

  function advanceScript() {
    const lines = steps[state.step].lines;
    if (state.lineIndex < lines.length - 1) {
      setStep(state.step, false, state.lineIndex + 1);
      return;
    }
    if (state.step < MAX_STEP) {
      setStep(state.step + 1, false, 0);
    }
  }

  function rewindScript() {
    if (state.lineIndex > 0) {
      setStep(state.step, false, state.lineIndex - 1);
      return;
    }
    if (state.step > 0) {
      const prevStep = state.step - 1;
      const lastLine = steps[prevStep].lines.length - 1;
      setStep(prevStep, false, lastLine);
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
    scene.circuitPath.style.strokeDashoffset = "1300";
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

  function intro(progress) {
    const magnetic = 0.22 + progress * 0.1;
    setFocus({ magnetic });
    elements.title.classList.add("intro-title");
    elements.subtitle.classList.add("intro-subtitle");
  }

  function chargeSeparation(progress) {
    setFocus({ magnetic: 0.34 + progress * 0.16, rod: 0.75 + progress * 0.25 });
    state.rodBaseX = 280 + progress * 160;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    reveal(scene.negCap, 0.5 + progress * 0.5, 280);
    reveal(scene.posCap, 0.5 + progress * 0.5, 380);
    setElectronShift(10 + progress * 26);
  }

  function emf(progress) {
    chargeSeparation(0.8 + progress * 0.2);
    setFocus({ magnetic: 0.42, rod: 0.95, electric: 0.42 + progress * 0.58 });
  }

  function current(progress) {
    emf(1);
    setFocus({ magnetic: 0.32, rod: 0.92, electric: 0.78, circuit: 1, current: 0.55 + progress * 0.45 });
    setCircuitProgress(progress);
    state.currentSpeedTarget = 80 + progress * 75;
  }

  function lenz(progress) {
    current(1);
    setFocus({ magnetic: 0.3, rod: 0.95, electric: 0.74, circuit: 1, current: 1, lenz: 0.3 + progress * 0.7 });
    state.rodBaseX = 410;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    state.currentSpeedTarget = 180 + progress * 50;
  }

  function applications(progress) {
    lenz(1);
    setFocus({ magnetic: 0.24, rod: 1 - progress, electric: 0.2 * (1 - progress), circuit: 0.45, current: 1, lenz: 0.35 * (1 - progress), generator: 0.35 + progress * 0.65, skyline: 0.45 + progress * 0.55 });
    reveal(scene.rodGroup, 0, 120);
    scene.skyline.classList.add("lights-on");
    state.currentSpeedTarget = 220 + progress * 60;
  }

  function renderStep() {
    setOverlay();
    state.currentSpeedTarget = 0;
    resetVisuals();
    const progress = getLineProgress();
    if (state.step === 0) intro(progress);
    if (state.step === 1) chargeSeparation(progress);
    if (state.step === 2) emf(progress);
    if (state.step === 3) current(progress);
    if (state.step === 4) lenz(progress);
    if (state.step === 5) applications(progress);
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
      advanceScript();
      return;
    }
    if (event.code === "ArrowLeft") {
      event.preventDefault();
      rewindScript();
      return;
    }
    if (event.code === "KeyR") {
      window.location.reload();
    }
  });

  setStep(0, true, 0);
  window.requestAnimationFrame(animateFrame);
})();

