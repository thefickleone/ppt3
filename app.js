(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const MAX_STEP = 5;
  const STEP_COPY = [
    {
      title: "Motional EMF",
      subtitle: "How does motion become electricity?",
      caption: "A conductor moving through a magnetic field pushes charges apart. That separation creates voltage.",
      equationLabel: "Setup",
      legend: [
        ["#7cc9ff", "Magnetic field into the screen"],
        ["#c3d7ef", "Conductor path"]
      ],
      note: "Open with a question: motion is mechanical, electricity is electrical. This bridge is Faraday induction in action."
    },
    {
      title: "Charge Separation",
      subtitle: "Moving charges are pushed by v x B.",
      caption: "As the rod moves right, free electrons drift toward one end. One side becomes negative and the other positive.",
      equationLabel: "Force",
      legend: [
        ["#59f3ff", "Electrons (negative charge)"],
        ["#ff5f6d", "Positive end of rod"]
      ],
      note: "Point to the blue and red ends. Emphasize that charge imbalance appears before current flows in a loop."
    },
    {
      title: "EMF Creation",
      subtitle: "Potential difference builds across the rod.",
      caption: "The separated charges create an internal electric field that balances magnetic push at steady speed.",
      equationLabel: "Motional EMF: ε = Bℓv",
      legend: [
        ["#6af2ff", "Electric field inside conductor"],
        ["#e8f6ff", "Voltage expression"]
      ],
      note: "Explain symbols: B magnetic field strength, l rod length in field, v rod speed."
    },
    {
      title: "Current Flow",
      subtitle: "A closed loop lets current circulate.",
      caption: "When the circuit closes, EMF drives charge around the loop. Mechanical work now feeds electrical power.",
      equationLabel: "Circuit Active",
      legend: [
        ["#aac4ff", "Conducting loop"],
        ["#9af7ff", "Current carriers"]
      ],
      note: "Show that current direction is consistent with the induced polarity and loop geometry."
    },
    {
      title: "Lenz's Law",
      subtitle: "Induced effects oppose the change in flux.",
      caption: "The induced current generates an opposing magnetic effect, so an external force is required to keep moving.",
      equationLabel: "Opposition",
      legend: [
        ["#8ad8ff", "Opposing force direction"],
        ["#9af7ff", "Stronger induced current"]
      ],
      note: "Stress energy conservation: no free energy. You must do mechanical work against the induced opposition."
    },
    {
      title: "Applications",
      subtitle: "Mechanical motion powers real electrical loads.",
      caption: "Generators scale this same principle: rotation through magnetic fields lights homes, labs, and cities.",
      equationLabel: "Generator Principle",
      legend: [
        ["#59f3ff", "Rotating generator element"],
        ["#ffe58a", "Delivered electrical output"]
      ],
      note: "Close by connecting classroom physics to turbines, alternators, and sustainable power systems."
    }
  ];

  const elements = {
    presentation: document.getElementById("presentation"),
    svg: document.getElementById("sceneSvg"),
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    stepValue: document.getElementById("stepValue"),
    caption: document.getElementById("stepCaption"),
    equationChip: document.getElementById("equationChip"),
    legend: document.getElementById("legend"),
    notesPanel: document.getElementById("notesPanel")
  };

  if (
    !elements.presentation || !elements.svg || !elements.title || !elements.subtitle || !elements.stepValue ||
    !elements.caption || !elements.equationChip || !elements.legend || !elements.notesPanel
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
    showHelp: false,
    showNotes: false,
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
        magneticField.append(svgEl("text", { x, y, class: "magnetic-cross" }));
        magneticField.lastChild.textContent = "x";
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

    const equation = makeAnim(svgEl("text", { id: "equation", x: "600", y: "250", "text-anchor": "middle" }), 0);
    equation.textContent = "ε = Bℓv";

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
    lenzGroup.append(
      svgEl("line", { x1: "820", y1: "255", x2: "690", y2: "255", class: "lenz-arrow", "marker-end": "url(#arrowHead)" }),
      svgEl("text", { x: "760", y: "235", "text-anchor": "middle", class: "lenz-label" })
    );
    lenzGroup.lastChild.textContent = "Opposing force";

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

    svg.append(magneticField, circuitPath, currentParticles, electricField, equation, lenzGroup, rodGroup, generator, skyline);

    return {
      magneticField,
      rodGroup,
      negCap,
      posCap,
      electronNodes,
      electricField,
      equation,
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
      elements.caption.textContent = copy.caption;
      elements.equationChip.textContent = copy.equationLabel;
      elements.notesPanel.textContent = copy.note;
      renderLegend(copy.legend);
      elements.presentation.classList.remove("overlay-out");
    }, state.reducedMotion ? 0 : 170);
  }

  function renderLegend(items) {
    const frag = document.createDocumentFragment();
    items.forEach(([color, label]) => {
      const key = document.createElement("span");
      key.className = "key";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.color = color;
      const text = document.createElement("span");
      text.textContent = label;
      key.append(dot, text);
      frag.append(key);
    });
    elements.legend.replaceChildren(frag);
  }

  function syncAuxPanels() {
    elements.presentation.classList.toggle("show-help", state.showHelp);
    elements.presentation.classList.toggle("hide-notes", !state.showNotes);
  }

  function setStep(nextStep, instant = false) {
    const clamped = Math.max(0, Math.min(MAX_STEP, nextStep));
    if (clamped === state.step && !instant) return;

    const token = ++state.transitionToken;
    scene.equation.classList.remove("pulse");
    scene.skyline.classList.remove("lights-on");
    scene.circuitPath.classList.remove("drawn");
    elements.presentation.classList.add("scene-transitioning");

    // Transition-out phase keeps continuity but reduces visual clutter.
    if (!instant) {
      scene.electricField.style.opacity = "0";
      scene.equation.style.opacity = "0";
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
    reveal(scene.equation, levels.equation ?? 0, 180);
    reveal(scene.circuitPath, levels.circuit ?? 0, 140);
    reveal(scene.currentParticles, levels.current ?? 0, 220);
    reveal(scene.lenzGroup, levels.lenz ?? 0, 170);
    reveal(scene.generator, levels.generator ?? 0, 140);
    reveal(scene.skyline, levels.skyline ?? 0, 240);
  }

  function resetVisuals() {
    setFocus({ magnetic: 0.2, rod: 0, electric: 0, equation: 0, circuit: 0, current: 0, lenz: 0, generator: 0, skyline: 0 });
    scene.equation.classList.remove("pulse");
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
    setFocus({ magnetic: 0.42, rod: 0.95, electric: 1, equation: 1 });
    scene.equation.classList.add("pulse");
    scene.equation.style.transform = "translate(0px, 0px) scale(1.03)";
  }

  function current() {
    emf();
    setFocus({ magnetic: 0.32, rod: 0.92, electric: 0.8, equation: 1, circuit: 1, current: 1 });
    scene.circuitPath.classList.add("drawn");
    state.currentSpeedTarget = 155;
  }

  function lenz() {
    current();
    setFocus({ magnetic: 0.3, rod: 0.95, electric: 0.74, equation: 0.82, circuit: 1, current: 1, lenz: 1 });
    state.rodBaseX = 410;
    setTranslate(scene.rodGroup, state.rodBaseX, 320, 0);
    state.currentSpeedTarget = 230;
  }

  function applications() {
    lenz();
    setFocus({ magnetic: 0.24, rod: 0, electric: 0, equation: 0, circuit: 0.45, current: 1, lenz: 0, generator: 1, skyline: 1 });
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
      return;
    }
    if (event.code === "KeyH") {
      state.showHelp = !state.showHelp;
      syncAuxPanels();
      return;
    }
    if (event.code === "KeyN") {
      state.showNotes = !state.showNotes;
      syncAuxPanels();
    }
  });

  syncAuxPanels();
  setStep(0, true);
  window.requestAnimationFrame(animateFrame);
})();

