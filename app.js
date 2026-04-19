(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const MAX_STEP = 5;
  const STEP_COPY = [
    { title: "Motional EMF", subtitle: "How does motion become electricity?" },
    { title: "Charge Separation", subtitle: "Moving charges are pushed by v x B." },
    { title: "EMF Creation", subtitle: "Potential difference builds across the rod." },
    { title: "Current Flow", subtitle: "A closed loop lets current circulate." },
    { title: "Lenz's Law", subtitle: "Induced effects oppose the change in flux." },
    { title: "Applications", subtitle: "Mechanical motion powers real electrical loads." }
  ];

  const elements = {
    presentation: document.getElementById("presentation"),
    svg: document.getElementById("sceneSvg"),
    title: document.getElementById("title"),
    subtitle: document.getElementById("subtitle"),
    stepValue: document.getElementById("stepValue")
  };

  if (!elements.presentation || !elements.svg || !elements.title || !elements.subtitle || !elements.stepValue) {
    return;
  }

  const state = {
    step: 0,
    currentOffset: 0,
    currentSpeed: 0,
    generatorSpin: 0,
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

    defs.append(glow, arrowMarker);
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
    equation.textContent = "e = B l v";

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
    elements.title.textContent = copy.title;
    elements.subtitle.textContent = copy.subtitle;
  }

  function setStep(nextStep) {
    state.step = Math.max(0, Math.min(MAX_STEP, nextStep));
    elements.stepValue.textContent = `${state.step} / ${MAX_STEP}`;
    elements.presentation.dataset.step = String(state.step);
    renderStep();
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

  function resetVisuals() {
    scene.magneticField.style.opacity = "0.2";
    scene.rodGroup.style.opacity = "0";
    scene.electricField.style.opacity = "0";
    scene.equation.style.opacity = "0";
    scene.equation.classList.remove("pulse");
    scene.circuitPath.style.opacity = "0";
    scene.circuitPath.classList.remove("drawn");
    scene.currentParticles.style.opacity = "0";
    scene.lenzGroup.style.opacity = "0";
    scene.generator.style.opacity = "0";
    scene.skyline.style.opacity = "0";
    scene.skyline.classList.remove("lights-on");
    scene.negCap.style.opacity = "0";
    scene.posCap.style.opacity = "0";
    setTranslate(scene.rodGroup, 140, 320, 0);
    setTranslate(scene.generator, 0, 0, state.generatorSpin);
    setElectronShift(0);
    elements.title.classList.remove("intro-title");
    elements.subtitle.classList.remove("intro-subtitle");
  }

  function intro() {
    elements.title.classList.add("intro-title");
    elements.subtitle.classList.add("intro-subtitle");
    scene.magneticField.style.opacity = "0.28";
  }

  function chargeSeparation() {
    scene.magneticField.style.opacity = "0.52";
    scene.rodGroup.style.opacity = "1";
    scene.negCap.style.opacity = "0.9";
    scene.posCap.style.opacity = "0.9";
    setTranslate(scene.rodGroup, 440, 320, 0);
    setElectronShift(36);
  }

  function emf() {
    chargeSeparation();
    scene.electricField.style.opacity = "1";
    scene.equation.style.opacity = "1";
    scene.equation.classList.add("pulse");
    scene.equation.style.transform = "translate(0px, 0px) scale(1)";
  }

  function current() {
    emf();
    scene.circuitPath.style.opacity = "1";
    scene.circuitPath.classList.add("drawn");
    scene.currentParticles.style.opacity = "1";
    state.currentSpeed = 150;
  }

  function lenz() {
    current();
    scene.lenzGroup.style.opacity = "1";
    setTranslate(scene.rodGroup, 410, 320, 0);
    state.currentSpeed = 230;
  }

  function applications() {
    lenz();
    scene.electricField.style.opacity = "0";
    scene.equation.style.opacity = "0";
    scene.lenzGroup.style.opacity = "0";
    scene.rodGroup.style.opacity = "0";
    scene.generator.style.opacity = "1";
    scene.skyline.style.opacity = "1";
    scene.skyline.classList.add("lights-on");
    state.currentSpeed = 280;
  }

  function renderStep() {
    setOverlay();
    state.currentSpeed = 0;
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

    if (state.step >= 3) {
      state.currentOffset = (state.currentOffset + state.currentSpeed * dt) % scene.circuitLen;
      const spacing = scene.circuitLen / scene.particles.length;
      scene.particles.forEach((particle, idx) => {
        const point = scene.circuitPath.getPointAtLength((state.currentOffset + idx * spacing) % scene.circuitLen);
        particle.setAttribute("cx", point.x.toFixed(2));
        particle.setAttribute("cy", point.y.toFixed(2));
      });
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

  setStep(0);
  window.requestAnimationFrame(animateFrame);
})();

