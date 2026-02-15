// 真贋 (ShinGan) - Game Engine

const App = (() => {
  // State
  let currentStage = null;
  let currentQuestionIndex = 0;
  let score = 0;
  let answers = [];
  let timerInterval = null;
  let timeLeft = 0;
  let hintUsed = false;
  let answered = false;
  let judging = false; // NEW: tracks intro vs judging phase
  const TIME_LIMIT = 15;

  // DOM refs
  const screens = {};
  const els = {};

  function init() {
    // Cache screen elements
    [
      "title",
      "stages",
      "intro",
      "question",
      "stage-result",
      "dashboard",
    ].forEach((id) => {
      screens[id] = document.getElementById(`screen-${id}`);
    });

    // Cache common elements
    els.stageGrid = document.getElementById("stage-grid");
    els.introName = document.getElementById("intro-stage-name");
    els.introPeriod = document.getElementById("intro-stage-period");
    els.introDesc = document.getElementById("intro-stage-description");
    els.introIcon = document.getElementById("intro-stage-icon");
    els.questionProgress = document.getElementById("question-progress");
    els.progressBar = document.getElementById("progress-bar");
    els.timerBar = document.getElementById("timer-bar");
    els.timerText = document.getElementById("timer-text");
    els.timerCircle = document.getElementById("timer-circle-progress");
    els.timerArea = document.getElementById("timer-area");
    els.paintingCard = document.getElementById("painting-card");
    els.paintingCanvas = document.getElementById("painting-canvas");
    els.paintingTitle = document.getElementById("painting-title");
    els.paintingArtist = document.getElementById("painting-artist");
    els.paintingYear = document.getElementById("painting-year");
    els.paintingMedium = document.getElementById("painting-medium");
    els.paintingSize = document.getElementById("painting-size");
    els.paintingLocation = document.getElementById("painting-location");
    els.paintingDescription = document.getElementById("painting-description");
    els.hintBtn = document.getElementById("hint-btn");
    els.hintText = document.getElementById("hint-text");
    els.btnAuthentic = document.getElementById("btn-authentic");
    els.btnForgery = document.getElementById("btn-forgery");
    els.answerOverlay = document.getElementById("answer-overlay");
    els.answerResult = document.getElementById("answer-result");
    els.answerExplanation = document.getElementById("answer-explanation");
    els.answerNext = document.getElementById("answer-next");
    els.resultStageName = document.getElementById("result-stage-name");
    els.resultScore = document.getElementById("result-score");
    els.resultStars = document.getElementById("result-stars");
    els.resultRankName = document.getElementById("result-rank-name");
    els.resultRankDesc = document.getElementById("result-rank-desc");
    els.resultAnswers = document.getElementById("result-answers");
    els.dashboardBody = document.getElementById("dashboard-body");
    els.dashboardTotal = document.getElementById("dashboard-total");
    els.dashboardRank = document.getElementById("dashboard-rank");
    els.zoomModal = document.getElementById("zoom-modal");
    els.zoomContent = document.getElementById("zoom-content");
    els.stageName = document.getElementById("question-stage-name");
    els.viewingPhase = document.getElementById("viewing-phase");
    els.judgingPhase = document.getElementById("judging-phase");
    els.btnStartJudge = document.getElementById("btn-start-judge");

    // Event listeners
    document.getElementById("btn-start").addEventListener("click", showStages);
    document
      .getElementById("btn-dashboard")
      .addEventListener("click", showDashboard);
    document
      .getElementById("btn-back-title")
      .addEventListener("click", showTitle);
    document
      .getElementById("btn-back-title-dash")
      .addEventListener("click", showTitle);
    document
      .getElementById("btn-start-stage")
      .addEventListener("click", startStage);
    document
      .getElementById("btn-back-stages")
      .addEventListener("click", showStages);
    document
      .getElementById("btn-back-stages-intro")
      .addEventListener("click", showStages);
    els.btnStartJudge.addEventListener("click", startJudging);
    els.hintBtn.addEventListener("click", showHint);
    els.btnAuthentic.addEventListener("click", () => submitAnswer(true));
    els.btnForgery.addEventListener("click", () => submitAnswer(false));
    els.answerNext.addEventListener("click", nextQuestion);
    document
      .getElementById("btn-result-stages")
      .addEventListener("click", showStages);
    document
      .getElementById("btn-result-next")
      .addEventListener("click", nextStage);

    // Zoom
    els.paintingCanvas.addEventListener("click", openZoom);
    els.zoomModal.addEventListener("click", closeZoom);

    // Keyboard
    document.addEventListener("keydown", handleKeydown);

    showTitle();
  }

  // === Screen navigation ===
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
    window.scrollTo(0, 0);
  }

  function showTitle() {
    showScreen("title");
  }

  function showStages() {
    renderStageGrid();
    showScreen("stages");
  }

  function showDashboard() {
    renderDashboard();
    showScreen("dashboard");
  }

  // === Stage Grid ===
  function renderStageGrid() {
    els.stageGrid.innerHTML = "";
    STAGES.forEach((stage) => {
      const saved = getSavedScore(stage.id);
      const card = document.createElement("div");
      card.className = "stage-card";
      card.style.setProperty("--stage-color", stage.palette[0]);
      card.style.setProperty("--stage-color2", stage.palette[1]);

      const stars = saved !== null ? getStarHTML(saved) : "";
      const scoreText =
        saved !== null ? `最高スコア: ${saved}/9` : "未挑戦";
      const rankText =
        saved !== null ? getRank(saved).name : "";

      card.innerHTML = `
        <div class="stage-card-header" style="background: linear-gradient(135deg, ${stage.palette[0]}, ${stage.palette[1]}, ${stage.palette[2]})">
          <span class="stage-number">Stage ${stage.id}</span>
        </div>
        <div class="stage-card-body">
          <h3>${stage.name}</h3>
          <p class="stage-period">${stage.period}</p>
          <div class="stage-score">${scoreText}</div>
          ${rankText ? `<div class="stage-rank-badge">${rankText}</div>` : ""}
          ${stars ? `<div class="stage-stars">${stars}</div>` : ""}
        </div>
      `;
      card.addEventListener("click", () => showIntro(stage));
      els.stageGrid.appendChild(card);
    });
  }

  // === Stage Intro ===
  function showIntro(stage) {
    currentStage = stage;
    els.introName.textContent = stage.name;
    els.introPeriod.textContent = stage.period;
    els.introDesc.textContent = stage.description;
    els.introIcon.style.background = `linear-gradient(135deg, ${stage.palette[0]}, ${stage.palette[1]}, ${stage.palette[2]})`;
    showScreen("intro");
  }

  // === Game Logic ===
  function startStage() {
    currentQuestionIndex = 0;
    score = 0;
    answers = [];
    showQuestion();
  }

  // Phase 1: Show painting info (viewing phase - no timer)
  function showQuestion() {
    answered = false;
    judging = false;
    hintUsed = false;
    const q = currentStage.questions[currentQuestionIndex];

    // Update progress
    els.questionProgress.textContent = `${currentQuestionIndex + 1} / ${currentStage.questions.length}`;
    els.progressBar.style.width = `${((currentQuestionIndex + 1) / currentStage.questions.length) * 100}%`;
    els.stageName.textContent = `${currentStage.name} - Stage ${currentStage.id}`;

    // Render painting
    renderPainting(els.paintingCanvas, q, currentStage.id, currentQuestionIndex);
    els.paintingTitle.textContent = q.title;
    els.paintingArtist.textContent = q.artist;
    els.paintingYear.textContent = q.year;
    els.paintingMedium.textContent = q.medium;
    els.paintingSize.textContent = q.size;
    els.paintingLocation.textContent = q.location;
    els.paintingDescription.textContent = q.description;

    // Reset UI
    els.hintBtn.classList.remove("used");
    els.hintText.classList.remove("visible");
    els.hintText.textContent = q.hint;
    els.btnAuthentic.disabled = false;
    els.btnForgery.disabled = false;
    els.btnAuthentic.className = "judge-btn authentic";
    els.btnForgery.className = "judge-btn forgery";
    els.answerOverlay.classList.remove("visible");

    // Show viewing phase, hide judging phase
    els.viewingPhase.classList.add("active");
    els.judgingPhase.classList.remove("active");
    els.timerArea.classList.remove("active");

    // Reset timer display
    timeLeft = TIME_LIMIT;
    updateTimerDisplay();

    showScreen("question");
  }

  // Phase 2: Start judging (timer starts)
  function startJudging() {
    judging = true;

    // Hide viewing phase, show judging phase
    els.viewingPhase.classList.remove("active");
    els.judgingPhase.classList.add("active");
    els.timerArea.classList.add("active");

    // Scroll to top so timer is visible
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Start timer
    startTimer();
  }

  function startTimer() {
    clearInterval(timerInterval);
    timeLeft = TIME_LIMIT;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timeLeft -= 0.05;
      if (timeLeft <= 0) {
        timeLeft = 0;
        clearInterval(timerInterval);
        if (!answered) {
          submitAnswer(null); // Time's up
        }
      }
      updateTimerDisplay();
    }, 50);
  }

  function updateTimerDisplay() {
    const pct = (timeLeft / TIME_LIMIT) * 100;
    els.timerBar.style.width = `${pct}%`;
    const seconds = Math.ceil(timeLeft);
    els.timerText.textContent = seconds;

    // Update circular timer
    const circumference = 2 * Math.PI * 54; // r=54
    const offset = circumference * (1 - pct / 100);
    els.timerCircle.style.strokeDasharray = circumference;
    els.timerCircle.style.strokeDashoffset = offset;

    // Color changes
    let colorClass = "";
    if (timeLeft <= 3) {
      colorClass = "danger";
    } else if (timeLeft <= 7) {
      colorClass = "warning";
    }

    els.timerBar.className = `timer-fill ${colorClass}`;
    els.timerArea.className = `timer-area active ${colorClass}`;
  }

  function showHint() {
    if (answered) return;
    hintUsed = true;
    els.hintBtn.classList.add("used");
    els.hintText.classList.add("visible");
  }

  function submitAnswer(playerSaidAuthentic) {
    if (answered) return;
    answered = true;
    clearInterval(timerInterval);

    const q = currentStage.questions[currentQuestionIndex];
    const timedOut = playerSaidAuthentic === null;
    const correct = !timedOut && playerSaidAuthentic === q.isAuthentic;

    if (correct) score++;

    answers.push({
      question: q,
      playerAnswer: playerSaidAuthentic,
      correct,
      timedOut,
      hintUsed,
      timeSpent: TIME_LIMIT - timeLeft,
    });

    // Disable buttons
    els.btnAuthentic.disabled = true;
    els.btnForgery.disabled = true;

    // Highlight correct answer
    if (q.isAuthentic) {
      els.btnAuthentic.classList.add("correct-answer");
    } else {
      els.btnForgery.classList.add("correct-answer");
    }

    // Show answer overlay
    let resultHTML;
    if (timedOut) {
      resultHTML = `<div class="answer-badge timeout">TIME UP</div>
        <p class="answer-correct-was">正解: ${q.isAuthentic ? "本物" : "贋作"}</p>`;
    } else if (correct) {
      resultHTML = `<div class="answer-badge correct">正解！</div>`;
    } else {
      resultHTML = `<div class="answer-badge incorrect">不正解</div>
        <p class="answer-correct-was">正解: ${q.isAuthentic ? "本物" : "贋作"}</p>`;
    }

    els.answerResult.innerHTML = resultHTML;
    els.answerExplanation.textContent = q.explanation;
    els.answerNext.textContent =
      currentQuestionIndex < currentStage.questions.length - 1
        ? "次の問題へ"
        : "結果を見る";

    setTimeout(() => {
      els.answerOverlay.classList.add("visible");
    }, 300);
  }

  function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= currentStage.questions.length) {
      showStageResult();
    } else {
      showQuestion();
    }
  }

  function nextStage() {
    const nextId = currentStage.id + 1;
    if (nextId <= STAGES.length) {
      showIntro(STAGES[nextId - 1]);
    } else {
      showStages();
    }
  }

  // === Stage Result ===
  function showStageResult() {
    // Save score
    saveScore(currentStage.id, score);

    const rank = getRank(score);
    els.resultStageName.textContent = `${currentStage.name} - 結果`;
    els.resultScore.textContent = `${score} / ${currentStage.questions.length}`;
    els.resultStars.innerHTML = getStarHTML(score);
    els.resultRankName.textContent = rank.name;
    els.resultRankDesc.textContent = rank.description;

    // Render answer list
    els.resultAnswers.innerHTML = answers
      .map((a, i) => {
        const icon = a.timedOut ? "&#9200;" : a.correct ? "&#9675;" : "&#10005;";
        const cls = a.timedOut ? "timeout" : a.correct ? "correct" : "incorrect";
        return `<div class="result-answer-item ${cls}">
          <span class="result-answer-icon">${icon}</span>
          <span class="result-answer-title">Q${i + 1}. ${a.question.title}</span>
          <span class="result-answer-label">${a.question.isAuthentic ? "本物" : "贋作"}</span>
        </div>`;
      })
      .join("");

    // Handle next stage button visibility
    const nextBtn = document.getElementById("btn-result-next");
    if (currentStage.id >= STAGES.length) {
      nextBtn.style.display = "none";
    } else {
      nextBtn.style.display = "";
      nextBtn.textContent = `次のステージ: ${STAGES[currentStage.id].name}`;
    }

    showScreen("stage-result");
  }

  // === Dashboard ===
  function renderDashboard() {
    let totalScore = 0;
    let totalAnswered = 0;

    els.dashboardBody.innerHTML = STAGES.map((stage) => {
      const saved = getSavedScore(stage.id);
      if (saved !== null) {
        totalScore += saved;
        totalAnswered += 9;
      }
      const scoreText = saved !== null ? `${saved}/9` : "-";
      const rankText = saved !== null ? getRank(saved).name : "-";
      const stars = saved !== null ? getStarHTML(saved) : "-";
      return `<tr>
        <td>Stage ${stage.id}</td>
        <td>${stage.name}</td>
        <td>${scoreText}</td>
        <td>${rankText}</td>
        <td>${stars}</td>
      </tr>`;
    }).join("");

    const totalMax = STAGES.length * 9;
    els.dashboardTotal.textContent = `${totalScore} / ${totalMax}`;

    if (totalAnswered > 0) {
      const avgScore = Math.round((totalScore / totalAnswered) * 9);
      const overallRank = getRank(avgScore);
      els.dashboardRank.textContent = overallRank.name;
    } else {
      els.dashboardRank.textContent = "-";
    }
  }

  // === Zoom ===
  function openZoom() {
    const q = currentStage.questions[currentQuestionIndex];
    els.zoomContent.innerHTML = "";

    // If image exists, show zoomed image
    const existingImg = els.paintingCanvas.querySelector(".painting-img");
    if (existingImg) {
      const img = document.createElement("img");
      img.src = existingImg.src;
      img.alt = q.title;
      img.className = "zoom-painting-img";
      els.zoomContent.appendChild(img);
    } else {
      const clone = document.createElement("div");
      clone.className = "painting-canvas zoom-painting";
      renderPaintingCSS(clone, q.colors, currentStage.id, currentStage.id * 100 + currentQuestionIndex);
      els.zoomContent.appendChild(clone);
    }
    els.zoomModal.classList.add("visible");
  }

  function closeZoom() {
    els.zoomModal.classList.remove("visible");
  }

  // === Keyboard ===
  function handleKeydown(e) {
    if (!screens.question.classList.contains("active")) return;

    // If in viewing phase, Enter/Space starts judging
    if (!judging && !answered) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        startJudging();
      }
      return;
    }

    if (answered) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        nextQuestion();
      }
      return;
    }
    if (e.key === "1" || e.key === "a") {
      submitAnswer(true);
    } else if (e.key === "2" || e.key === "f") {
      submitAnswer(false);
    } else if (e.key === "h") {
      showHint();
    }
  }

  // === Painting Renderer (image with CSS fallback) ===
  function renderPainting(el, question, stageId, qIndex) {
    const c = question.colors || ["#888", "#666", "#aaa", "#444", "#bbb"];
    const seed = stageId * 100 + qIndex;

    el.innerHTML = "";
    el.style.background = "";
    el.classList.remove("has-image");

    if (question.image) {
      const img = new Image();
      img.src = question.image;
      img.alt = question.title;
      img.className = "painting-img";
      img.onload = () => {
        el.innerHTML = "";
        el.style.background = "none";
        el.classList.add("has-image");
        el.appendChild(img);
      };
      img.onerror = () => {
        // Fallback to CSS art
        renderPaintingCSS(el, c, stageId, seed);
      };
      // Show CSS art while loading
      renderPaintingCSS(el, c, stageId, seed);
    } else {
      renderPaintingCSS(el, c, stageId, seed);
    }
  }

  function renderPaintingCSS(el, colors, stageId, seed) {
    const c = colors || ["#888", "#666", "#aaa", "#444", "#bbb"];

    // Base layer
    el.style.background = generateBackground(c, stageId, seed);
    el.innerHTML = "";

    // Add decorative layers based on art period
    const layers = generateLayers(c, stageId, seed);
    layers.forEach((layerHTML) => {
      el.insertAdjacentHTML("beforeend", layerHTML);
    });
  }

  function generateBackground(c, stageId, seed) {
    switch (stageId) {
      case 1: // Renaissance - warm, perspective
        return `linear-gradient(180deg, ${c[2]} 0%, ${c[0]} 60%, ${c[3]} 100%)`;
      case 2: // Baroque - dramatic chiaroscuro
        return `radial-gradient(ellipse at ${30 + (seed % 40)}% ${20 + (seed % 30)}%, ${c[4]} 0%, ${c[0]} 40%, #0a0a0a 100%)`;
      case 3: // Rococo - pastel, soft
        return `linear-gradient(${45 + (seed % 90)}deg, ${c[0]}88, ${c[1]}88, ${c[2]}88, ${c[3]}88)`;
      case 4: // Impressionism - dappled light
        return `
          radial-gradient(circle at ${20 + (seed % 20)}% ${30 + (seed % 20)}%, ${c[0]}99 0%, transparent 40%),
          radial-gradient(circle at ${60 + (seed % 20)}% ${50 + (seed % 20)}%, ${c[1]}99 0%, transparent 35%),
          radial-gradient(circle at ${40 + (seed % 20)}% ${70 + (seed % 20)}%, ${c[2]}99 0%, transparent 45%),
          linear-gradient(180deg, ${c[3]}, ${c[4]})
        `;
      case 5: // Post-Impressionism - bold blocks
        return `
          conic-gradient(from ${seed % 360}deg at ${40 + (seed % 20)}% ${40 + (seed % 20)}%, ${c[0]}, ${c[1]}, ${c[2]}, ${c[3]}, ${c[0]})
        `;
      case 6: // Expressionism - intense, angular
        return `
          linear-gradient(${seed % 180}deg, ${c[0]} 0%, ${c[1]} 30%, ${c[2]} 50%, ${c[3]} 70%, ${c[4]} 100%)
        `;
      case 7: // Surrealism - dreamlike
        return `
          radial-gradient(ellipse at ${30 + (seed % 40)}% ${70 + (seed % 20)}%, ${c[0]}cc 0%, transparent 50%),
          radial-gradient(ellipse at ${60 + (seed % 30)}% ${20 + (seed % 30)}%, ${c[1]}cc 0%, transparent 40%),
          conic-gradient(from ${seed * 37 % 360}deg at 50% 50%, ${c[2]}, ${c[3]}, ${c[4]}, ${c[2]})
        `;
      case 8: // Ukiyo-e - flat color blocks, woodblock print style
        return `
          linear-gradient(180deg, ${c[4]} 0%, ${c[4]} 30%, ${c[0]} 30%, ${c[0]} 65%, ${c[3]} 65%, ${c[3]} 100%)
        `;
      case 9: // Rinpa - gold leaf base with decorative accents
        return `
          radial-gradient(ellipse at 50% 50%, ${c[0]}ee 0%, ${c[0]}cc 40%, ${c[0]}aa 70%, ${c[0]}88 100%)
        `;
      default:
        return `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
    }
  }

  function generateLayers(c, stageId, seed) {
    const layers = [];
    const r = (s) => ((s * 9301 + 49297) % 233280) / 233280;

    switch (stageId) {
      case 1: // Renaissance - geometric perspective lines
        layers.push(`<div class="art-layer" style="
          position:absolute; inset:0;
          background:
            linear-gradient(${85 + r(seed)*10}deg, transparent 48%, ${c[1]}33 49%, ${c[1]}33 51%, transparent 52%),
            linear-gradient(${95 + r(seed+1)*10}deg, transparent 48%, ${c[0]}22 49%, ${c[0]}22 51%, transparent 52%);
        "></div>`);
        layers.push(`<div class="art-layer" style="
          position:absolute; bottom:0; left:10%; right:10%; height:35%;
          background: linear-gradient(0deg, ${c[0]}66, transparent);
          border-radius: 50% 50% 0 0;
        "></div>`);
        break;

      case 2: // Baroque - dramatic light spot
        layers.push(`<div class="art-layer" style="
          position:absolute; inset:0;
          background: radial-gradient(ellipse at ${35 + r(seed)*30}% ${25 + r(seed+1)*30}%, ${c[4]}88 0%, transparent 60%);
        "></div>`);
        layers.push(`<div class="art-layer" style="
          position:absolute; inset:0;
          background: linear-gradient(180deg, transparent 50%, #00000066 100%);
        "></div>`);
        break;

      case 3: // Rococo - swirls and soft shapes
        for (let i = 0; i < 4; i++) {
          const x = 15 + r(seed + i) * 70;
          const y = 15 + r(seed + i + 10) * 70;
          const size = 20 + r(seed + i + 20) * 30;
          layers.push(`<div class="art-layer" style="
            position:absolute; left:${x}%; top:${y}%;
            width:${size}%; height:${size}%;
            background: radial-gradient(ellipse, ${c[i % 5]}66, transparent 70%);
            border-radius: ${50 + r(seed+i)*50}% ${50 + r(seed+i+1)*50}%;
            transform: rotate(${r(seed+i+2) * 360}deg);
          "></div>`);
        }
        break;

      case 4: // Impressionism - dots/strokes
        for (let i = 0; i < 12; i++) {
          const x = r(seed + i) * 85;
          const y = r(seed + i + 50) * 85;
          const w = 8 + r(seed + i + 100) * 15;
          const h = 3 + r(seed + i + 150) * 8;
          layers.push(`<div class="art-layer" style="
            position:absolute; left:${x}%; top:${y}%;
            width:${w}%; height:${h}%;
            background: ${c[i % 5]}aa;
            border-radius: 40%;
            transform: rotate(${r(seed+i+200) * 180 - 90}deg);
          "></div>`);
        }
        break;

      case 5: // Post-Impressionism - bold patches
        for (let i = 0; i < 6; i++) {
          const x = r(seed + i * 7) * 70;
          const y = r(seed + i * 11) * 70;
          const size = 15 + r(seed + i * 13) * 25;
          layers.push(`<div class="art-layer" style="
            position:absolute; left:${x}%; top:${y}%;
            width:${size}%; height:${size * (0.6 + r(seed+i*17)*0.8)}%;
            background: ${c[i % 5]}cc;
            border-radius: ${r(seed+i*3)*30}% ${r(seed+i*5)*40}%;
            transform: rotate(${r(seed+i*19) * 90}deg);
          "></div>`);
        }
        break;

      case 6: // Expressionism - sharp angular shapes
        for (let i = 0; i < 5; i++) {
          const x = r(seed + i * 3) * 80;
          const y = r(seed + i * 7) * 80;
          const w = 10 + r(seed + i * 11) * 30;
          const h = 10 + r(seed + i * 13) * 40;
          layers.push(`<div class="art-layer" style="
            position:absolute; left:${x}%; top:${y}%;
            width:${w}%; height:${h}%;
            background: ${c[i % 5]}bb;
            clip-path: polygon(${r(seed+i)*50}% 0%, 100% ${r(seed+i+1)*50}%, ${50+r(seed+i+2)*50}% 100%, 0% ${50+r(seed+i+3)*50}%);
          "></div>`);
        }
        break;

      case 7: // Surrealism - melting, floating shapes
        for (let i = 0; i < 5; i++) {
          const x = 10 + r(seed + i * 5) * 60;
          const y = 10 + r(seed + i * 9) * 60;
          const size = 12 + r(seed + i * 15) * 25;
          layers.push(`<div class="art-layer" style="
            position:absolute; left:${x}%; top:${y}%;
            width:${size}%; height:${size * (0.5 + r(seed+i*23)*1.5)}%;
            background: ${c[i % 5]}99;
            border-radius: ${30+r(seed+i*2)*70}% ${30+r(seed+i*4)*70}% ${30+r(seed+i*6)*70}% ${30+r(seed+i*8)*70}%;
            transform: rotate(${r(seed+i*31) * 360}deg) skew(${r(seed+i*37)*20 - 10}deg);
          "></div>`);
        }
        break;

      case 8: // Ukiyo-e - wave-like curves, flat graphic shapes
        // Horizon/wave line
        layers.push(`<div class="art-layer" style="
          position:absolute; bottom:30%; left:0; right:0; height:15%;
          background: ${c[0]}66;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
        "></div>`);
        // Graphic elements (mountain, wave forms)
        for (let i = 0; i < 4; i++) {
          const x = 5 + r(seed + i * 7) * 70;
          const y = 20 + r(seed + i * 11) * 50;
          const w = 15 + r(seed + i * 13) * 25;
          const h = 10 + r(seed + i * 17) * 20;
          layers.push(`<div class="art-layer" style="
            position:absolute; left:${x}%; top:${y}%;
            width:${w}%; height:${h}%;
            background: ${c[i % 5]}bb;
            border-radius: ${50 + r(seed+i)*50}% ${50 + r(seed+i+1)*50}% 0 0;
            border-bottom: 2px solid ${c[(i+1) % 5]}88;
          "></div>`);
        }
        // Seal-like stamp
        layers.push(`<div class="art-layer" style="
          position:absolute; bottom:8%; right:8%;
          width:8%; height:12%;
          background: ${c[1]};
          border-radius: 2px;
          opacity: 0.8;
        "></div>`);
        break;

      case 9: // Rinpa - gold leaf with bold natural motifs
        // Gold leaf texture (subtle variation)
        layers.push(`<div class="art-layer" style="
          position:absolute; inset:0;
          background:
            repeating-linear-gradient(${45 + r(seed)*30}deg, transparent, transparent 20px, ${c[0]}22 20px, ${c[0]}22 21px),
            repeating-linear-gradient(${135 + r(seed+1)*30}deg, transparent, transparent 25px, ${c[3]}15 25px, ${c[3]}15 26px);
        "></div>`);
        // Bold decorative plant/flower motifs
        for (let i = 0; i < 5; i++) {
          const x = 10 + r(seed + i * 5) * 65;
          const y = 15 + r(seed + i * 9) * 55;
          const size = 10 + r(seed + i * 13) * 20;
          layers.push(`<div class="art-layer" style="
            position:absolute; left:${x}%; top:${y}%;
            width:${size}%; height:${size * (1 + r(seed+i*7)*0.5)}%;
            background: radial-gradient(ellipse, ${c[(i+1) % 5]}cc 0%, ${c[(i+2) % 5]}66 50%, transparent 70%);
            border-radius: ${40+r(seed+i*2)*60}% ${40+r(seed+i*3)*60}%;
          "></div>`);
        }
        // Flowing water or cloud band
        layers.push(`<div class="art-layer" style="
          position:absolute; bottom:15%; left:0; right:0; height:8%;
          background: linear-gradient(90deg, transparent 0%, ${c[3]}44 20%, ${c[3]}66 50%, ${c[3]}44 80%, transparent 100%);
          border-radius: 50%;
        "></div>`);
        break;
    }

    return layers;
  }

  // === Stars ===
  function getStarHTML(score) {
    const filled = Math.min(5, Math.floor(score / 2) + (score >= 9 ? 1 : 0));
    let html = "";
    for (let i = 0; i < 5; i++) {
      html += `<span class="star ${i < filled ? "filled" : ""}">${i < filled ? "&#9733;" : "&#9734;"}</span>`;
    }
    return html;
  }

  // === LocalStorage ===
  function getSavedScore(stageId) {
    const data = JSON.parse(localStorage.getItem("shingan_scores") || "{}");
    return data[stageId] !== undefined ? data[stageId] : null;
  }

  function saveScore(stageId, newScore) {
    const data = JSON.parse(localStorage.getItem("shingan_scores") || "{}");
    if (data[stageId] === undefined || newScore > data[stageId]) {
      data[stageId] = newScore;
    }
    localStorage.setItem("shingan_scores", JSON.stringify(data));
  }

  // Public
  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
