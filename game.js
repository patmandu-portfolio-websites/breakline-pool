(() => {
  "use strict";

  const canvas = document.getElementById("pool-table");
  const ctx = canvas.getContext("2d");
  const W = 1000;
  const H = 590;
  const POCKET_R = 25;
  const BALL_RESTITUTION = 0.96;
  const RAIL_RESTITUTION = 0.86;
  const RAIL_TANGENTIAL_RETENTION = 0.985;
  const BALL_FRICTION = 240;
  const MAX_PULL = 150;
  // Table geometry is switched between pool and snooker by configureTable().
  let BALL_R = 14;
  let SHOT_SPEED_PER_PULL = 14;
  let BAULK_LINE_X = 336;
  let tableIsSnooker = false;
  const TABLE = { left: 73, right: 927, top: 73, bottom: 517 };
  const pockets = [
    { x: 60, y: 60, radius: POCKET_R }, { x: 500, y: 56, radius: POCKET_R }, { x: 940, y: 60, radius: POCKET_R },
    { x: 60, y: 530, radius: POCKET_R }, { x: 500, y: 534, radius: POCKET_R }, { x: 940, y: 530, radius: POCKET_R }
  ];
  const POOL_POCKETS = pockets.map((pocket) => ({ ...pocket }));
  // A full-size snooker table is 3569 x 1778 mm (12 x 6 ft) with 52.5 mm balls.
  const SNOOKER_SCALE = (TABLE.right - TABLE.left) / 3569;
  const SNOOKER_BALL_R = 52.5 / 2 * SNOOKER_SCALE;
  const SNOOKER_D_RADIUS = 292 * SNOOKER_SCALE;
  const SNOOKER_VALUES = { 16: 2, 17: 3, 18: 4, 19: 5, 20: 6, 21: 7 };
  const SNOOKER_NAMES = { 16: "Yellow", 17: "Green", 18: "Brown", 19: "Blue", 20: "Pink", 21: "Black" };
  const SNOOKER_COLORS = { 16: "#f0d21c", 17: "#16824a", 18: "#7a4a24", 19: "#1f5fc2", 20: "#f08fb4", 21: "#15171a" };
  const snookerSpots = {};
  const colors = {
    1: "#f2cb27", 2: "#2583ce", 3: "#d94336", 4: "#7950b1",
    5: "#ed8b26", 6: "#258552", 7: "#8c3034", 8: "#171a19", 9: "#e8bf23",
    10: "#2583ce", 11: "#d94336", 12: "#7950b1", 13: "#ed8b26", 14: "#258552", 15: "#8c3034"
  };
  const modeDetails = {
    pvp: ["Head to head", {
      nine: "Take turns with a friend. Lowest ball first — sink the 9 to win.",
      ten: "Take turns with a friend. Lowest ball first — sink the 10 to win.",
      eight: "Take turns with a friend. Claim solids or stripes, clear your group, then sink the 8.",
      snooker: "Take turns with a friend. Pot a red, then a colour, and keep alternating. Clear the colours in order for the highest score."
    }],
    ai: ["You vs the house", {
      nine: "Take on the house. Make the lowest ball first and sink the 9 to win.",
      ten: "Take on the house. Make the lowest ball first and sink the 10 to win.",
      eight: "Take on the house. Claim solids or stripes, clear your group, then sink the 8.",
      snooker: "Take on the house. Pot a red, then a colour, and keep alternating. Clear the colours in order for the highest score."
    }],
    timer: ["Beat the clock", "Clear the table before time runs out. Every shot counts."],
    trick: ["Trick shot", "Arrange the balls anywhere, then shoot. Pocket balls any way you like."]
  };
  const difficultyNames = { 1: "Rookie", 2: "Club player", 3: "Pro" };
  function hasTouchControls() {
    return window.matchMedia("(pointer: coarse), (any-pointer: coarse), (hover: none)").matches || navigator.maxTouchPoints > 0 || window.innerWidth <= 1400;
  }
  const els = {
    modeButtons: [...document.querySelectorAll(".mode-button")],
    modeTitle: document.getElementById("mode-title"),
    modeDescription: document.getElementById("mode-description"),
    timerSettings: document.getElementById("timer-settings"),
    timeSelect: document.getElementById("time-select"),
    customTime: document.getElementById("custom-time"),
    minutesLabel: document.getElementById("minutes-label"),
    timerDisplay: document.getElementById("timer-display"),
    timerValue: document.getElementById("timer-value"),
    statusLabel: document.getElementById("status-label"),
    statusDetail: document.getElementById("status-detail"),
    scoreOne: document.getElementById("score-one"),
    scoreTwo: document.getElementById("score-two"),
    playerOne: document.getElementById("player-one"),
    playerTwo: document.getElementById("player-two"),
    playerOneState: document.getElementById("player-one-state"),
    playerTwoState: document.getElementById("player-two-state"),
    playerTwoName: document.getElementById("player-two-name"),
    playerTwoToken: document.getElementById("player-two-token"),
    ballTracker: document.getElementById("ball-tracker"),
    ballsCount: document.getElementById("balls-count"),
    canvasMessage: document.getElementById("canvas-message"),
    helpHeading: document.getElementById("help-heading"),
    helpCopy: document.getElementById("help-copy"),
    powerFill: document.getElementById("power-fill"),
    powerValue: document.getElementById("power-value"),
    mobileShotControls: document.getElementById("mobile-shot-controls"),
    mobilePower: document.getElementById("mobile-power"),
    mobilePowerValue: document.getElementById("mobile-power-value"),
    mobileShoot: document.getElementById("mobile-shoot"),
    toggleShotControls: document.getElementById("toggle-shot-controls"),
    toggleSpinControls: document.getElementById("toggle-spin-controls"),
    spinControls: document.getElementById("spin-controls"),
    spinEnglish: document.getElementById("spin-english"),
    spinEnglishValue: document.getElementById("spin-english-value"),
    spinFollow: document.getElementById("spin-follow"),
    spinFollowValue: document.getElementById("spin-follow-value"),
    spinSliders: [...document.querySelectorAll(".spin-slider input")],
    aimButtons: [...document.querySelectorAll("[data-aim-x][data-aim-y]")],
    pushOutControls: document.getElementById("pushout-controls"),
    pushOutMessage: document.getElementById("pushout-message"),
    callPushOut: document.getElementById("call-pushout"),
    pushOutResponse: document.getElementById("pushout-response"),
    acceptPushOut: document.getElementById("accept-pushout"),
    passPushOut: document.getElementById("pass-pushout"),
    variantSettings: document.getElementById("variant-settings"),
    variantSelect: document.getElementById("variant-select"),
    aimSelect: document.getElementById("aim-select"),
    aiSettings: document.getElementById("ai-settings"),
    difficultySelect: document.getElementById("difficulty-select"),
    rulesNine: document.getElementById("rules-nine"),
    rulesTen: document.getElementById("rules-ten"),
    rulesEight: document.getElementById("rules-eight"),
    rulesSnooker: document.getElementById("rules-snooker"),
    captionVariant: document.getElementById("caption-variant"),
    roomName: document.getElementById("room-name")
  };

  let mode = "pvp";
  let variant = "nine";
  let aimGuideOn = true;
  let aiDifficulty = 1;
  let groups = [null, null];
  let shotTargetNumbers = [];
  let pocketedThisShot = [];
  let balls = [];
  let currentPlayer = 0;
  let scores = [0, 0];
  let cueBall;
  let aimAngle = 0;
  let aimGoal = null;
  let spaceLocked = false;
  let lastPointerPoint = null;
  let aimEased = 0;
  let aimFromPull = false;
  let draggingCue = false;
  let touchAiming = false;
  let showShotControls = true;
  let pullDistance = 0;
  let pullStart = { x: 0, y: 0 };
  let moving = false;
  let gameOver = false;
  let draggedBall = null;
  let dragOffset = { x: 0, y: 0 };
  let remainingSeconds = 300;
  let lastTime = performance.now();
  let aiTimeout = null;
  let soundOn = false;
  let audioContext = null;
  let shotTargetNumber = null;
  let firstHitNumber = null;
  let turnNotice = "";
  let ballInHand = false;
  let placementPoint = { x: 275, y: H / 2 };
  let breakPending = true;
  const lastWinnerByVariant = {};
  let postBreakPushOutAvailable = false;
  let pushOutCalled = false;
  let shotWasPushOut = false;
  let pushOutAwaitingChoice = false;
  let pushOutShooter = null;
  let ballsPocketedThisShot = false;
  let railContactAfterFirstHit = false;
  let nineBallPocketedThisShot = false;
  let consecutiveFouls = [0, 0];
  // Snooker state: "red" (a red is on), "colour" (any colour is on) or "sequence" (colours in order).
  let snookerPhase = "red";
  let snookerBreak = 0;

  const felt = makeFeltTexture("#17603b", 93217);
  const snookerFelt = makeFeltTexture("#2f8a38", 41177);

  function pocketCaptureRadius(pocket) {
    return pocket.capture ?? pocket.radius + BALL_R + 4;
  }

  function pocketAimTolerance(pocket) {
    return pocket.aim ?? pocket.radius - BALL_R - 2;
  }

  function makeFeltTexture(base, startSeed) {
    const texture = document.createElement("canvas");
    texture.width = 220;
    texture.height = 220;
    const textureCtx = texture.getContext("2d");
    textureCtx.fillStyle = base;
    textureCtx.fillRect(0, 0, 220, 220);
    let seed = startSeed;
    for (let i = 0; i < 9000; i += 1) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 220;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 220;
      const alpha = 0.018 + (seed % 16) / 1000;
      textureCtx.fillStyle = seed % 3 ? `rgba(211,238,193,${alpha})` : `rgba(0,20,9,${alpha})`;
      textureCtx.fillRect(x, y, 1 + seed % 2, 1);
    }
    return ctx.createPattern(texture, "repeat");
  }

  function makeBall(number, x, y) {
    const ball = { number, x, y, vx: 0, vy: 0, spinX: 0, spinY: 0, spinAxisX: 1, spinAxisY: 0, active: true, trail: [], orient: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };
    rotateOrient(ball, 0, 0, 1, Math.random() * Math.PI * 2);
    rotateOrient(ball, 1, 0, 0, (Math.random() - .5) * 1.4);
    rotateOrient(ball, 0, 1, 0, (Math.random() - .5) * 1.4);
    return ball;
  }

  // Rotates the ball's local axes (world-space vectors) about a unit axis by angle (Rodrigues).
  function rotateOrient(ball, kx, ky, kz, angle) {
    if (!ball.orient || !angle) return;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    ball.orient = ball.orient.map(([vx, vy, vz]) => {
      const dot = kx * vx + ky * vy + kz * vz;
      return [
        vx * c + (ky * vz - kz * vy) * s + kx * dot * (1 - c),
        vy * c + (kz * vx - kx * vz) * s + ky * dot * (1 - c),
        vz * c + (kx * vy - ky * vx) * s + kz * dot * (1 - c)
      ];
    });
  }

  function isEightBall() {
    return variant === "eight" && (mode === "pvp" || mode === "ai");
  }

  function isTenBall() {
    return variant === "ten" && (mode === "pvp" || mode === "ai");
  }

  function isSnooker() {
    return variant === "snooker" && (mode === "pvp" || mode === "ai");
  }

  function configureTable() {
    tableIsSnooker = isSnooker();
    pockets.length = 0;
    if (!tableIsSnooker) {
      BALL_R = 14;
      SHOT_SPEED_PER_PULL = 14;
      BAULK_LINE_X = 336;
      Object.assign(TABLE, { left: 73, right: 927, top: 73, bottom: 517 });
      POOL_POCKETS.forEach((pocket) => pockets.push({ ...pocket }));
      return;
    }
    BALL_R = SNOOKER_BALL_R;
    SHOT_SPEED_PER_PULL = 10;
    const halfHeight = 1778 * SNOOKER_SCALE / 2;
    Object.assign(TABLE, { left: 73, right: 927, top: H / 2 - halfHeight, bottom: H / 2 + halfHeight });
    BAULK_LINE_X = TABLE.left + 737 * SNOOKER_SCALE;
    const midX = (TABLE.left + TABLE.right) / 2;
    const corner = { radius: 11, capture: 20, aim: 5 };
    const middle = { radius: 12, capture: 19, aim: 6 };
    const cornerOut = 7;
    const middleOut = 5;
    pockets.push(
      { x: TABLE.left - cornerOut, y: TABLE.top - cornerOut, ...corner }, { x: midX, y: TABLE.top - middleOut, ...middle }, { x: TABLE.right + cornerOut, y: TABLE.top - cornerOut, ...corner },
      { x: TABLE.left - cornerOut, y: TABLE.bottom + cornerOut, ...corner }, { x: midX, y: TABLE.bottom + middleOut, ...middle }, { x: TABLE.right + cornerOut, y: TABLE.bottom + cornerOut, ...corner }
    );
    const spotX = (mm) => TABLE.left + mm * SNOOKER_SCALE;
    Object.assign(snookerSpots, {
      16: { x: BAULK_LINE_X, y: H / 2 + SNOOKER_D_RADIUS },
      17: { x: BAULK_LINE_X, y: H / 2 - SNOOKER_D_RADIUS },
      18: { x: BAULK_LINE_X, y: H / 2 },
      19: { x: spotX(1784.5), y: H / 2 },
      20: { x: spotX(2677), y: H / 2 },
      21: { x: spotX(3245), y: H / 2 }
    });
  }

  function isRed(number) {
    return number >= 1 && number <= 15;
  }

  function snookerValue(number) {
    return isRed(number) ? 1 : SNOOKER_VALUES[number] ?? 0;
  }

  function finalBallNumber() {
    return isTenBall() ? 10 : 9;
  }

  function groupOf(number) {
    return number === 8 ? "eight" : number < 8 ? "solids" : "stripes";
  }

  function rackBalls() {
    if (isSnooker()) {
      balls = [];
      const apexX = snookerSpots[20].x + BALL_R * 2 + .4;
      for (let row = 0; row < 5; row += 1) {
        for (let slot = 0; slot <= row; slot += 1) {
          balls.push(makeBall(balls.length + 1, apexX + row * BALL_R * Math.sqrt(3) + row * .2, H / 2 + (slot - row / 2) * (BALL_R * 2 + .2)));
        }
      }
      for (const number of [16, 17, 18, 19, 20, 21]) balls.push(makeBall(number, snookerSpots[number].x, snookerSpots[number].y));
      cueBall = makeBall(0, BAULK_LINE_X - SNOOKER_D_RADIUS * .4, H / 2);
      balls.push(cueBall);
      return;
    }
    if (isEightBall()) {
      const rows = [[1], [9, 2], [10, 8, 3], [4, 11, 12, 5], [6, 13, 7, 14, 15]];
      balls = [];
      rows.forEach((row, rowIndex) => row.forEach((number, slot) => {
        balls.push(makeBall(number, 650 + rowIndex * BALL_R * 1.75, H / 2 + (slot - rowIndex / 2) * BALL_R * 2.05));
      }));
      cueBall = makeBall(0, 275, H / 2);
      balls.push(cueBall);
      return;
    }
    if (isTenBall()) {
      const rows = [[1], [2, 3], [4, 10, 5], [6, 7, 8, 9]];
      balls = [];
      rows.forEach((row, rowIndex) => row.forEach((number, slot) => {
        balls.push(makeBall(number, 650 + rowIndex * BALL_R * 1.75, H / 2 + (slot - rowIndex / 2) * BALL_R * 2.05));
      }));
      cueBall = makeBall(0, 275, H / 2);
      balls.push(cueBall);
      return;
    }
    const rack = [
      { n: 1, row: 0, slot: 0 }, { n: 2, row: 1, slot: 0 }, { n: 3, row: 1, slot: 1 },
      { n: 4, row: 2, slot: 0 }, { n: 9, row: 2, slot: 1 }, { n: 5, row: 2, slot: 2 },
      { n: 6, row: 3, slot: 0 }, { n: 7, row: 3, slot: 1 }, { n: 8, row: 4, slot: 0 }
    ];
    balls = rack.map(({ n, row, slot }) => makeBall(
      n,
      650 + row * BALL_R * 2,
      H / 2 + (slot - (Math.min(row, 4 - row) / 2)) * BALL_R * 2.05
    ));
    cueBall = makeBall(0, 275, H / 2);
    balls.push(cueBall);
  }

  function resetGame({ rematch = false } = {}) {
    if (aiTimeout) window.clearTimeout(aiTimeout);
    aiTimeout = null;
    const cpuBreaks = rematch === true && mode === "ai" && lastWinnerByVariant[variant] === 1;
    if (rematch === true && mode === "ai") delete lastWinnerByVariant[variant];
    configureTable();
    rackBalls();
    snookerPhase = "red";
    snookerBreak = 0;
    currentPlayer = cpuBreaks ? 1 : 0;
    scores = [0, 0];
    moving = false;
    gameOver = false;
    ballInHand = false;
    turnNotice = "";
    lastShotPocketed = false;
    firstHitNumber = null;
    breakPending = true;
    ballInHand = mode !== "trick";
    placementPoint = { x: cueBall.x, y: cueBall.y };
    postBreakPushOutAvailable = false;
    pushOutCalled = false;
    shotWasPushOut = false;
    pushOutAwaitingChoice = false;
    pushOutShooter = null;
    ballsPocketedThisShot = false;
    railContactAfterFirstHit = false;
    nineBallPocketedThisShot = false;
    consecutiveFouls = [0, 0];
    groups = [null, null];
    pocketedThisShot = [];
    shotTargetNumbers = [];
    draggingCue = false;
    touchAiming = false;
    canvas.closest(".table-frame").classList.remove("is-pulling");
    draggedBall = null;
    pullDistance = 0;
    els.canvasMessage.innerHTML = "";
    if (mode === "timer") {
      remainingSeconds = selectedMinutes() * 60;
    }
    updateUI();
    if (cpuBreaks) scheduleAiShot();
  }

  function selectedMinutes() {
    const value = els.timeSelect.value === "custom" ? Number(els.customTime.value) : Number(els.timeSelect.value);
    return Math.max(1, Math.min(180, Number.isFinite(value) ? value : 5));
  }

  function setMode(nextMode) {
    mode = nextMode;
    els.modeButtons.forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const [title, description] = modeDetails[mode];
    els.modeTitle.textContent = title;
    els.modeDescription.textContent = typeof description === "string" ? description : description[variant];
    els.variantSettings.hidden = mode === "timer" || mode === "trick";
    els.aiSettings.hidden = mode !== "ai";
    els.rulesNine.hidden = isEightBall() || isTenBall() || isSnooker();
    els.rulesTen.hidden = !isTenBall();
    els.rulesEight.hidden = !isEightBall();
    els.rulesSnooker.hidden = !isSnooker();
    els.captionVariant.textContent = isSnooker() ? "SNOOKER" : isEightBall() ? "8-BALL" : isTenBall() ? "10-BALL" : "9-BALL";
    els.roomName.textContent = isSnooker() ? "THE SNOOKER ROOM" : isEightBall() ? "THE EIGHT-BALL ROOM" : isTenBall() ? "THE TEN-BALL ROOM" : "THE NINE-BALL ROOM";
    els.timerSettings.hidden = mode !== "timer";
    els.timerDisplay.hidden = mode !== "timer";
    updateCpuName();
    els.playerTwoToken.textContent = mode === "ai" ? "CPU" : "02";
    els.helpHeading.textContent = mode === "trick" ? "FREE PLAY" : mode === "timer" ? "RACE THE CLOCK" : "THE SHOT";
    els.helpCopy.textContent = mode === "trick"
      ? "Drag balls to place them. On touch screens, use the direction pad, power slider, and Shoot button. Set English or draw/follow spin below the table."
      : "Aim with the pointer or touch direction pad; set power and shoot with the touch controls. On a keyboard, hold Space to lock the aim, move the pointer back to set power, then release Space to shoot. English and draw/follow spin change the cue ball after ball and cushion contact.";
    remainingSeconds = selectedMinutes() * 60;
    resetGame();
  }

  function updateUI() {
    const eight = isEightBall();
    if (eight) {
      scores = [0, 1].map((player) => groups[player]
        ? balls.filter((ball) => ball.number > 0 && ball.number !== 8 && groupOf(ball.number) === groups[player] && !ball.active).length
        : 0);
    }
    els.playerOne.classList.toggle("active-player", currentPlayer === 0 && !gameOver);
    els.playerTwo.classList.toggle("active-player", currentPlayer === 1 && !gameOver);
    els.scoreOne.textContent = String(scores[0]);
    els.scoreTwo.textContent = String(scores[1]);
    const groupSuffix = (player) => eight && groups[player] ? ` · ${groups[player].toUpperCase()}` : "";
    els.playerOneState.textContent = (currentPlayer === 0 && !gameOver ? "AT THE TABLE" : "ON DECK") + groupSuffix(0);
    els.playerTwoState.textContent = (currentPlayer === 1 && !gameOver ? "AT THE TABLE" : "ON DECK") + groupSuffix(1);
    const activeBalls = balls.filter((ball) => ball.number > 0 && ball.active);
    const snooker = isSnooker();
    els.ballsCount.innerHTML = snooker
      ? `${activeBalls.filter((ball) => isRed(ball.number)).length} <small>REDS LEFT</small>`
      : `${activeBalls.length} <small>LEFT</small>`;
    els.ballTracker.innerHTML = "";
    els.ballTracker.classList.toggle("wide", eight);
    els.ballTracker.classList.toggle("ten", isTenBall());
    els.ballTracker.classList.toggle("snooker", snooker);
    const trackerNumbers = snooker
      ? Array.from({ length: 21 }, (_, index) => index + 1)
      : Array.from({ length: eight ? 15 : isTenBall() ? 10 : 9 }, (_, index) => index + 1);
    const highlighted = new Set(snookerHighlightTargets().map((ball) => ball.number));
    for (const number of trackerNumbers) {
      const ball = document.createElement("span");
      const pocketed = !balls.some((item) => item.number === number && item.active);
      const label = snooker ? String(snookerValue(number)) : String(number);
      const name = snooker ? (isRed(number) ? "Red" : SNOOKER_NAMES[number]) : `${number}`;
      ball.className = `tracker-ball${!snooker && number > 8 ? " stripe" : ""}${pocketed ? " pocketed" : ""}${highlighted.has(number) ? " on" : ""}`;
      ball.style.backgroundColor = snooker ? (isRed(number) ? "#c8261f" : SNOOKER_COLORS[number]) : colors[number];
      ball.setAttribute("aria-label", `${name} ball${pocketed ? ", pocketed" : ", on table"}`);
      ball.innerHTML = `<span>${label}</span>`;
      els.ballTracker.appendChild(ball);
    }
    els.statusLabel.textContent = gameOver ? "RACK COMPLETE" : mode === "trick" ? "FREE PLAY" : currentPlayer === 1 && mode === "ai" ? "HOUSE TURN" : `PLAYER ${currentPlayer + 1}'S TURN`;
    els.statusDetail.textContent = gameOver ? "Start a new rack to play again" : moving ? "Balls in motion" : ballInHand
      ? turnNotice || (snooker
        ? "Place the cue ball anywhere inside the D"
        : breakPending
        ? "Break setup — place the cue ball behind the baulk line"
        : cueBall.active
          ? "Ball in hand — click open spot to move, or click cue to shoot from here"
          : "Ball in hand — click a clear spot on the table to place the cue ball")
      : turnNotice || (mode === "trick" ? "Shoot or drag balls to place them" : snooker ? snookerTargetText() : eight ? eightTargetText() : `Target ball ${lowestBall()?.number ?? "—"}`);
    const isHumanTurn = mode === "pvp" || currentPlayer === 0;
    const canCallPushOut = postBreakPushOutAvailable && !moving && !gameOver && !ballInHand && !eight
      && !pushOutAwaitingChoice && isHumanTurn && mode !== "timer" && mode !== "trick";
    const shouldShowPushOut = canCallPushOut || pushOutAwaitingChoice;
    els.pushOutControls.hidden = !shouldShowPushOut;
    els.callPushOut.hidden = !canCallPushOut;
    els.pushOutResponse.hidden = !pushOutAwaitingChoice || !isHumanTurn;
    if (pushOutAwaitingChoice) {
      els.pushOutMessage.textContent = "Push-out played. Take the table, or pass the next shot back.";
    } else if (canCallPushOut) {
      els.pushOutMessage.textContent = "After the break, you may call a push-out instead of a regular shot.";
    }
    const touchControls = hasTouchControls();
    els.toggleShotControls.hidden = !touchControls;
    els.mobileShotControls.hidden = !touchControls || !showShotControls;
    const canTakeShot = cueBall.active && !ballInHand && !moving && !gameOver
      && !pushOutAwaitingChoice && (mode !== "ai" || currentPlayer === 0);
    const canAdjustSpin = cueBall.active && !moving && !gameOver
      && !pushOutAwaitingChoice && (mode !== "ai" || currentPlayer === 0);
    els.aimButtons.forEach((button) => {
      button.disabled = !canTakeShot;
    });
    els.mobilePower.disabled = !canTakeShot;
    els.mobileShoot.disabled = !canTakeShot;
    els.spinSliders.forEach((slider) => {
      slider.disabled = !canAdjustSpin;
    });
    updateSpinReadouts();
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    els.timerValue.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    els.timerDisplay.classList.toggle("low-time", remainingSeconds <= 30);
  }

  function legalTargets(player, ballList = balls) {
    const objectBalls = ballList.filter((ball) => ball.number > 0 && ball.active);
    if (isSnooker()) {
      if (snookerPhase === "red") {
        const reds = objectBalls.filter((ball) => isRed(ball.number));
        if (reds.length > 0) return reds;
      }
      const colours = objectBalls.filter((ball) => !isRed(ball.number)).sort((a, b) => a.number - b.number);
      if (snookerPhase === "sequence") return colours.slice(0, 1);
      return colours;
    }
    if (!isEightBall()) {
      const lowest = objectBalls.sort((a, b) => a.number - b.number)[0];
      return lowest ? [lowest] : [];
    }
    const own = groups[player] ? objectBalls.filter((ball) => groupOf(ball.number) === groups[player]) : objectBalls.filter((ball) => ball.number !== 8);
    return own.length > 0 ? own : objectBalls.filter((ball) => ball.number === 8);
  }

  function snookerTargetText() {
    const targets = legalTargets(currentPlayer);
    const prefix = snookerBreak > 0 ? `Break ${snookerBreak} · ` : "";
    if (targets.length === 0) return "No ball on";
    if (targets.every((ball) => isRed(ball.number))) return `${prefix}Red on`;
    if (snookerPhase === "sequence") return `${prefix}${SNOOKER_NAMES[targets[0].number]} on`;
    return `${prefix}Colour on — hit the colour you want to pot first`;
  }

  function eightTargetText() {
    const targets = legalTargets(currentPlayer);
    if (targets.length === 1 && targets[0].number === 8) return "Target the 8 ball";
    return groups[currentPlayer] ? `Shoot ${groups[currentPlayer]}` : "Open table — hit any solid or stripe";
  }

  function updateCpuName() {
    els.playerTwoName.textContent = mode === "ai" ? `THE HOUSE · ${difficultyNames[aiDifficulty].toUpperCase()}` : "PLAYER TWO";
  }

  function lowestBall() {
    return balls.filter((ball) => ball.number > 0 && ball.active).sort((a, b) => a.number - b.number)[0] ?? null;
  }

  function ballAt(x, y) {
    return balls.find((ball) => ball.active && Math.hypot(ball.x - x, ball.y - y) < BALL_R + 5);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }

  let touchAimOffset = 0;

  function onPointerDown(event) {
    if (spaceLocked) return;
    if (gameOver || moving || pushOutAwaitingChoice || (mode === "ai" && currentPlayer === 1)) return;
    const point = canvasPoint(event);
    lastPointerPoint = point;
    if (ballInHand) {
      const clickingCueBall = cueBall.active
        && Math.hypot(point.x - cueBall.x, point.y - cueBall.y) <= BALL_R + 5;
      if (clickingCueBall) {
        ballInHand = false;
        turnNotice = "";
      } else {
        placeCueBall(point);
        return;
      }
    }
    if (mode === "trick") {
      const selectedBall = ballAt(point.x, point.y);
      if (selectedBall) {
        canvas.setPointerCapture(event.pointerId);
        draggedBall = selectedBall;
        dragOffset = { x: selectedBall.x - point.x, y: selectedBall.y - point.y };
        return;
      }
    }
    if (!cueBall.active) return;
    if (event.pointerType === "touch" && !isTouchOnCueStick(point)) {
      touchAiming = true;
      const startAngle = Math.atan2(point.y - cueBall.y, point.x - cueBall.x);
      touchAimOffset = (aimGoal ?? aimAngle) - startAngle;
      setAimFromPoint(point);
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    aimFromPull = Math.hypot(point.x - cueBall.x, point.y - cueBall.y) <= BALL_R + 5;
    if (!aimFromPull) setAimFromPoint(point);
    canvas.setPointerCapture(event.pointerId);
    draggingCue = true;
    pullStart = point;
    pullDistance = 0;
    canvas.closest(".table-frame").classList.add("is-pulling");
    els.canvasMessage.innerHTML = "";
    els.statusDetail.textContent = "Aim locked — pull back to shoot";
    setPowerMeter(0);
  }

  function onPointerMove(event) {
    const point = canvasPoint(event);
    lastPointerPoint = point;
    if (touchAiming) {
      setAimFromPoint(point);
      return;
    }
    if (ballInHand) {
      placementPoint = point;
      return;
    }
    if (draggedBall) {
      draggedBall.x = clamp(point.x + dragOffset.x, TABLE.left + BALL_R, TABLE.right - BALL_R);
      draggedBall.y = clamp(point.y + dragOffset.y, TABLE.top + BALL_R, TABLE.bottom - BALL_R);
      return;
    }
    if (draggingCue) {
      const pullX = pullStart.x - point.x;
      const pullY = pullStart.y - point.y;
      if (aimFromPull && Math.hypot(pullX, pullY) > 1) {
        aimGoal = Math.atan2(pullY, pullX);
        aimAngle = aimEased = aimGoal;
      }
      const projected = pullX * Math.cos(aimAngle) + pullY * Math.sin(aimAngle);
      pullDistance = clamp(projected, 0, MAX_PULL);
      setPowerMeter(pullDistance / MAX_PULL);
      return;
    }
    if ((cueBall.active && mode !== "ai") || (cueBall.active && currentPlayer === 0)) {
      setAimFromPoint(point);
    }
  }

  function setAimFromPoint(point) {
    const offsetX = point.x - cueBall.x;
    const offsetY = point.y - cueBall.y;
    if (Math.hypot(offsetX, offsetY) > 1) {
      if (aimGoal === null) aimEased = aimAngle;
      aimGoal = Math.atan2(offsetY, offsetX) + (touchAiming ? touchAimOffset : 0);
    }
  }

  // Eases the visible aim toward the pointer angle; external writes to aimAngle (AI, keys) win.
  function easeAim(dt) {
    if (aimGoal === null) return;
    if (aimAngle !== aimEased) {
      aimGoal = null;
      aimEased = aimAngle;
      return;
    }
    let diff = aimGoal - aimAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    aimAngle = Math.abs(diff) < .0002 ? aimGoal : aimAngle + diff * (1 - Math.exp(-dt * 40));
    aimEased = aimAngle;
  }

  function adjustAim(x, y) {
    const directionX = Math.cos(aimAngle) + x * .035;
    const directionY = Math.sin(aimAngle) + y * .035;
    aimAngle = Math.atan2(directionY, directionX);
  }

  function isTouchOnCueStick(point) {
    const directionX = Math.cos(aimAngle);
    const directionY = Math.sin(aimAngle);
    const offsetX = cueBall.x - point.x;
    const offsetY = cueBall.y - point.y;
    const alongStick = offsetX * directionX + offsetY * directionY;
    const acrossStick = Math.abs(offsetX * directionY - offsetY * directionX);
    return alongStick >= 8 && alongStick <= 184 && acrossStick <= 34;
  }

  function onPointerUp() {
    if (draggedBall) {
      const pocket = pockets.find((candidate) => Math.hypot(draggedBall.x - candidate.x, draggedBall.y - candidate.y) < candidate.radius + 8);
      if (pocket && draggedBall.number > 0) {
        draggedBall.active = false;
        if (mode === "trick") scores[0] += 1;
      } else {
        separateFromNeighbors(draggedBall);
      }

      draggedBall = null;
      updateUI();
      return;
    }
    if (touchAiming) {
      touchAiming = false;
      return;
    }
    if (!draggingCue) return;
    draggingCue = false;
    aimFromPull = false;
    canvas.closest(".table-frame").classList.remove("is-pulling");
    if (aimGoal !== null && aimAngle === aimEased) aimAngle = aimEased = aimGoal;
    if (pullDistance > 1) shoot(pullDistance, aimAngle);
    pullDistance = 0;
    setPowerMeter(0);
    if (!moving) updateUI();
  }

  function lockShotWithKeyboard() {
    if (spaceLocked || draggingCue || draggedBall || touchAiming || ballInHand || !cueBall.active) return false;
    if (gameOver || moving || pushOutAwaitingChoice || (mode === "ai" && currentPlayer === 1)) return false;
    if (aimGoal !== null && aimAngle === aimEased) aimAngle = aimEased = aimGoal;
    spaceLocked = true;
    aimFromPull = false;
    draggingCue = true;
    pullStart = lastPointerPoint ?? { x: cueBall.x, y: cueBall.y };
    pullDistance = 0;
    canvas.closest(".table-frame").classList.add("is-pulling");
    els.canvasMessage.innerHTML = "";
    els.statusDetail.textContent = "Aim locked — move back, then release Space to shoot";
    setPowerMeter(0);
    return true;
  }

  function releaseKeyboardShot() {
    if (!spaceLocked) return;
    spaceLocked = false;
    onPointerUp();
  }

  function cancelPointerInteraction() {
    spaceLocked = false;
    draggedBall = null;
    touchAiming = false;
    draggingCue = false;
    aimFromPull = false;
    pullDistance = 0;
    canvas.closest(".table-frame").classList.remove("is-pulling");
    setPowerMeter(0);
    updateUI();
  }

  function isSpotFree(x, y, ignore = null, gap = 2) {
    if (x < TABLE.left + BALL_R || x > TABLE.right - BALL_R
      || y < TABLE.top + BALL_R || y > TABLE.bottom - BALL_R) return false;
    if (pockets.some((pocket) => Math.hypot(x - pocket.x, y - pocket.y) < pocketCaptureRadius(pocket))) return false;
    return balls.every((ball) => ball === cueBall || ball === ignore || !ball.active || Math.hypot(x - ball.x, y - ball.y) >= BALL_R * 2 + gap);
  }

  function isInsideD(x, y) {
    const centre = snookerSpots[18];
    return x <= BAULK_LINE_X && Math.hypot(x - centre.x, y - centre.y) <= SNOOKER_D_RADIUS;
  }

  function isCuePlacementValid(x, y) {
    if (isSnooker() && ballInHand && !isInsideD(x, y)) return false;
    if (x < TABLE.left + BALL_R || x > TABLE.right - BALL_R
      || y < TABLE.top + BALL_R || y > TABLE.bottom - BALL_R) return false;
    if (breakPending && mode !== "trick" && !isSnooker() && x > BAULK_LINE_X - BALL_R) return false;
    if (pockets.some((pocket) => Math.hypot(x - pocket.x, y - pocket.y) < pocketCaptureRadius(pocket))) return false;
    return balls.every((ball) => ball === cueBall || !ball.active || Math.hypot(x - ball.x, y - ball.y) >= BALL_R * 2 + 2);
  }

  function placeCueBall(point) {
    const x = clamp(point.x, TABLE.left + BALL_R, TABLE.right - BALL_R);
    const y = clamp(point.y, TABLE.top + BALL_R, TABLE.bottom - BALL_R);
    if (!isCuePlacementValid(x, y)) {
      turnNotice = isSnooker() && !isInsideD(x, y)
        ? "Place the cue ball inside the D"
        : breakPending && mode !== "trick" && x > BAULK_LINE_X - BALL_R
        ? "Place the cue ball behind the baulk line for the break"
        : "Choose a clear spot away from the balls and pockets";
      updateUI();
      return;
    }
    cueBall.x = x;
    cueBall.y = y;
    cueBall.vx = 0;
    cueBall.vy = 0;
    cueBall.spinX = 0;
    cueBall.spinY = 0;
    cueBall.active = true;
    ballInHand = false;
    turnNotice = "";
    updateUI();
  }

  function separateFromNeighbors(ball) {
    for (const other of balls) {
      if (!other.active || other === ball) continue;
      const dx = ball.x - other.x;
      const dy = ball.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance < BALL_R * 2 && distance > 0) {
        ball.x += dx / distance * (BALL_R * 2 - distance);
        ball.y += dy / distance * (BALL_R * 2 - distance);
      }
    }
  }

  function setPowerMeter(power) {
    const percent = Math.round(power * 100);
    els.powerFill.style.width = `${percent}%`;
    els.powerValue.textContent = `${percent}%`;
  }

  function updateSpinReadouts() {
    const english = Number(els.spinEnglish.value);
    const follow = Number(els.spinFollow.value);
    const amount = (value, negative, positive) => Math.abs(value) < 5
      ? "CENTER"
      : `${value < 0 ? negative : positive} ${Math.abs(value)}%`;
    els.spinEnglishValue.value = amount(english, "LEFT", "RIGHT");
    els.spinEnglishValue.textContent = amount(english, "LEFT", "RIGHT");
    els.spinFollowValue.value = amount(follow, "DRAW", "FOLLOW");
    els.spinFollowValue.textContent = amount(follow, "DRAW", "FOLLOW");
  }

  function shoot(power, angle, spin = {
    x: Number(els.spinEnglish.value) / 100,
    y: Number(els.spinFollow.value) / 100
  }) {
    turnNotice = "";
    shotTargetNumber = lowestBall()?.number ?? null;
    shotTargetNumbers = legalTargets(currentPlayer).map((ball) => ball.number);
    pocketedThisShot = [];
    firstHitNumber = null;
    lastShotPocketed = false;
    shotWasPushOut = pushOutCalled;
    pushOutCalled = false;
    postBreakPushOutAvailable = false;
    ballsPocketedThisShot = false;
    railContactAfterFirstHit = false;
    nineBallPocketedThisShot = false;
    const speed = power * SHOT_SPEED_PER_PULL;
    cueBall.vx = Math.cos(angle) * speed;
    cueBall.vy = Math.sin(angle) * speed;
    cueBall.spinX = spin.x;
    cueBall.spinY = spin.y;
    cueBall.spinAxisX = Math.cos(angle);
    cueBall.spinAxisY = Math.sin(angle);
    moving = true;
    updateUI();
    playTone(115, .045, .025);
  }

  function playTone(frequency, duration, volume) {
    if (!soundOn) return;
    try {
      audioContext ??= new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn("Unable to play pool sound.", error);
      soundOn = false;
      document.getElementById("sound-toggle").classList.add("muted");
    }
  }

  function stepPhysics(dt) {
    const fastestTravel = balls.reduce((maximum, ball) => ball.active
      ? Math.max(maximum, Math.hypot(ball.vx, ball.vy) * dt)
      : maximum, 0);
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)), Math.ceil(fastestTravel / (BALL_R / 2)));
    const step = dt / steps;
    for (let substep = 0; substep < steps; substep += 1) {
      const active = balls.filter((ball) => ball.active);
      for (const ball of active) {
        advanceBall(ball, step);

        const pocket = pockets.find((candidate) => Math.hypot(ball.x - candidate.x, ball.y - candidate.y) < pocketCaptureRadius(candidate));
        if (pocket) {
          ball.active = false;
          ball.vx = 0;
          ball.vy = 0;
          onPocket(ball);
          continue;
        }
        constrainBallToTable(ball);
      }

      for (let pass = 0; pass < 3; pass += 1) {
        for (let i = 0; i < active.length; i += 1) {
          for (let j = i + 1; j < active.length; j += 1) {
            collide(active[i], active[j]);
          }
        }
        for (const ball of active) {
          if (ball.active) constrainBallToTable(ball);
        }
      }
    }
    const stillMoving = balls.some((ball) => ball.active && Math.hypot(ball.vx, ball.vy) > 0);
    if (moving && !stillMoving) finishTurn();
  }

  function advanceBall(ball, dt) {
    const speed = Math.hypot(ball.vx, ball.vy);
    const spinRetention = Math.exp(-.45 * dt);
    ball.spinX *= spinRetention;
    ball.spinY *= spinRetention;
    if (ball.orient) {
      rotateOrient(ball, 0, 0, 1, -ball.spinX * 4 * dt);
      if (speed > 0) rotateOrient(ball, -ball.spinAxisY, ball.spinAxisX, 0, ball.spinY * 5 * dt);
    }
    if (speed === 0) return;
    const directionX = ball.vx / speed;
    const directionY = ball.vy / speed;
    const travelTime = Math.min(dt, speed / BALL_FRICTION);
    const distance = speed * travelTime - .5 * BALL_FRICTION * travelTime * travelTime;
    ball.x += directionX * distance;
    ball.y += directionY * distance;
    // Rolling without slipping: rotate about the horizontal axis perpendicular to travel.
    if (ball.orient) rotateOrient(ball, -directionY, directionX, 0, distance / BALL_R);
    const nextSpeed = Math.max(0, speed - BALL_FRICTION * dt);
    ball.vx = directionX * nextSpeed;
    ball.vy = directionY * nextSpeed;
  }

  function constrainBallToTable(ball) {
    // Let fast balls run into a pocket mouth instead of rebounding off the cushion in front of it.
    if (tableIsSnooker && pockets.some((pocket) => {
      const dx = pocket.x - ball.x;
      const dy = pocket.y - ball.y;
      return Math.hypot(dx, dy) < pocketCaptureRadius(pocket) + BALL_R * .75 && ball.vx * dx + ball.vy * dy > 0;
    })) return;
    const left = TABLE.left + BALL_R;
    const right = TABLE.right - BALL_R;
    const top = TABLE.top + BALL_R;
    const bottom = TABLE.bottom - BALL_R;
    let hitRail = false;

    if (ball.x < left) {
      ball.x = left;
      if (ball.vx < 0) {
        const impactSpeed = -ball.vx;
        ball.vx = -ball.vx * RAIL_RESTITUTION;
        ball.vy *= RAIL_TANGENTIAL_RETENTION;
        applyCueSideSpin(ball, impactSpeed, 0, 1);
        hitRail = true;
      }
    } else if (ball.x > right) {
      ball.x = right;
      if (ball.vx > 0) {
        const impactSpeed = ball.vx;
        ball.vx = -ball.vx * RAIL_RESTITUTION;
        ball.vy *= RAIL_TANGENTIAL_RETENTION;
        applyCueSideSpin(ball, impactSpeed, 0, 1);
        hitRail = true;
      }
    }
    if (ball.y < top) {
      ball.y = top;
      if (ball.vy < 0) {
        const impactSpeed = -ball.vy;
        ball.vy = -ball.vy * RAIL_RESTITUTION;
        ball.vx *= RAIL_TANGENTIAL_RETENTION;
        applyCueSideSpin(ball, impactSpeed, 1, 0);
        hitRail = true;
      }
    } else if (ball.y > bottom) {
      ball.y = bottom;
      if (ball.vy > 0) {
        const impactSpeed = ball.vy;
        ball.vy = -ball.vy * RAIL_RESTITUTION;
        ball.vx *= RAIL_TANGENTIAL_RETENTION;
        applyCueSideSpin(ball, impactSpeed, 1, 0);
        hitRail = true;
      }
    }
    if (hitRail) {
      if (firstHitNumber !== null) railContactAfterFirstHit = true;
      playTone(85, .025, .012);
    }
  }

  function applyCueSideSpin(ball, impactSpeed, tangentX, tangentY) {
    if (ball.number !== 0 || ball.spinX === 0) return;
    const spinSideX = -ball.spinAxisY;
    const spinSideY = ball.spinAxisX;
    const alignment = spinSideX * tangentX + spinSideY * tangentY;
    const sideVelocity = ball.spinX * impactSpeed * .18 * alignment;
    ball.vx += tangentX * sideVelocity;
    ball.vy += tangentY * sideVelocity;
    ball.spinX *= .72;
  }

  function collide(a, b) {
    if (!a.active || !b.active) return;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let distance = Math.hypot(dx, dy);
    const minimum = BALL_R * 2;
    if (distance >= minimum) return;
    if (distance === 0) {
      dx = .01;
      distance = .01;
    }
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = (minimum - distance) * .8;
    a.x -= nx * overlap / 2;
    a.y -= ny * overlap / 2;
    b.x += nx * overlap / 2;
    b.y += ny * overlap / 2;
    const relativeVelocity = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (relativeVelocity <= 0) return;
    if (firstHitNumber === null) {
      if (a.number === 0 && b.number > 0) firstHitNumber = b.number;
      else if (b.number === 0 && a.number > 0) firstHitNumber = a.number;
    }
    const impulse = relativeVelocity * (1 + BALL_RESTITUTION) / 2;
    const cueBallInCollision = a.number === 0 ? a : b.number === 0 ? b : null;
    const incomingCueSpeed = cueBallInCollision ? Math.hypot(cueBallInCollision.vx, cueBallInCollision.vy) : 0;
    const incomingCueDirectionX = incomingCueSpeed ? cueBallInCollision.vx / incomingCueSpeed : 0;
    const incomingCueDirectionY = incomingCueSpeed ? cueBallInCollision.vy / incomingCueSpeed : 0;
    a.vx -= impulse * nx;
    a.vy -= impulse * ny;
    b.vx += impulse * nx;
    b.vy += impulse * ny;
    if (cueBallInCollision?.spinY && incomingCueSpeed > 0) {
      const followVelocity = cueBallInCollision.spinY * incomingCueSpeed * .34;
      cueBallInCollision.vx += incomingCueDirectionX * followVelocity;
      cueBallInCollision.vy += incomingCueDirectionY * followVelocity;
      cueBallInCollision.spinY = 0;
    }
    playTone(240, .035, .012);
  }

  function onPocket(ball) {
    playTone(175, .11, .035);
    if (mode === "trick") {
      if (ball.number > 0) {
        scores[0] += 1;
        lastShotPocketed = true;
      }
      updateUI();
      return;
    }
    if (ball.number === 0) {
      ball.active = false;
      return;
    }
    if (isSnooker()) {
      pocketedThisShot.push(ball.number);
      ballsPocketedThisShot = true;
      lastShotPocketed = true;
      return;
    }
    if (isEightBall()) {
      pocketedThisShot.push(ball.number);
      ballsPocketedThisShot = true;
      lastShotPocketed = true;
      return;
    }
    if (ball.number === finalBallNumber()) {
      nineBallPocketedThisShot = true;
    }
    ballsPocketedThisShot = true;
    lastShotPocketed = true;
    if (ball.number !== finalBallNumber()) scores[currentPlayer] += 1;
  }

  function respotNineBall() {
    respotBall(finalBallNumber(), isTenBall() ? { x: 650, y: H / 2 } : { x: 650 + BALL_R * 4, y: H / 2 });
  }

  function respotBall(number, spot) {
    const nineBall = balls.find((ball) => ball.number === number);
    if (!nineBall) return;
    let position = (isSnooker() ? isSpotFree(spot.x, spot.y, null, 0) : isCuePlacementValid(spot.x, spot.y)) ? spot : null;
    for (let radius = BALL_R * 2; !position && radius < TABLE.right - TABLE.left; radius += BALL_R) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
        const candidate = { x: spot.x + Math.cos(angle) * radius, y: spot.y + Math.sin(angle) * radius };
        if (isSnooker() ? isSpotFree(candidate.x, candidate.y, null, 0) : isCuePlacementValid(candidate.x, candidate.y)) {
          position = candidate;
          break;
        }
      }
    }
    if (!position) {
      throw new Error(`Unable to respot the ${number} ball on the table.`);
    }
    nineBall.active = true;
    nineBall.x = position.x;
    nineBall.y = position.y;
    nineBall.vx = 0;
    nineBall.vy = 0;
    separateFromNeighbors(nineBall);
  }

  function judgeSnookerShot({ phase, targets, firstHit, pocketed, scratch, redsBefore }) {
    const redsPotted = pocketed.filter(isRed).length;
    const redsLeft = redsBefore - redsPotted;
    const coloursPotted = pocketed.filter((number) => !isRed(number));
    const illegal = [];
    let foul = scratch || firstHit === null || !targets.includes(firstHit);
    if (phase === "red") illegal.push(...coloursPotted);
    else if (phase === "colour") {
      illegal.push(...pocketed.filter(isRed));
      const first = coloursPotted.length === 1 && coloursPotted[0] === firstHit;
      if (!first) illegal.push(...coloursPotted);
    } else illegal.push(...pocketed.filter((number) => number !== targets[0]));
    if (illegal.length > 0) foul = true;
    let foulPoints = 0;
    if (foul) {
      foulPoints = Math.max(4, firstHit ? snookerValue(firstHit) : 0, ...illegal.map(snookerValue));
    }
    const points = foul ? 0 : pocketed.reduce((sum, number) => sum + snookerValue(number), 0);
    let nextPhase = phase;
    if (phase === "red") {
      if (!foul && redsPotted > 0) nextPhase = "colour";
    } else if (phase === "colour") {
      nextPhase = redsLeft > 0 ? "red" : "sequence";
    }
    if (nextPhase === "red" && redsLeft === 0) nextPhase = "sequence";
    const respot = phase === "sequence" && !foul ? [] : coloursPotted;
    return { foul, foulPoints, points, nextPhase, respot, redsLeft, keepsTurn: !foul && pocketed.length > 0 };
  }

  function respotSnookerColour(number) {
    const order = [number, ...[21, 20, 19, 18, 17, 16].filter((n) => n !== number)];
    for (const candidate of order) {
      const spot = snookerSpots[candidate];
      if (isSpotFree(spot.x, spot.y, null, 0)) {
        respotBall(number, spot);
        return;
      }
    }
    respotBall(number, snookerSpots[number]);
  }

  function finishSnookerTurn() {
    moving = false;
    const shooter = currentPlayer;
    const opponent = 1 - shooter;
    const scratch = !cueBall.active;
    const redsBefore = balls.filter((ball) => isRed(ball.number) && (ball.active || pocketedThisShot.includes(ball.number))).length;
    const result = judgeSnookerShot({
      phase: snookerPhase,
      targets: shotTargetNumbers,
      firstHit: firstHitNumber,
      pocketed: pocketedThisShot,
      scratch,
      redsBefore
    });
    breakPending = false;
    ballInHand = false;
    turnNotice = "";
    snookerPhase = result.nextPhase;
    result.respot.forEach(respotSnookerColour);

    if (result.foul) {
      scores[opponent] += result.foulPoints;
      snookerBreak = 0;
      currentPlayer = opponent;
      if (scratch) {
        ballInHand = true;
        placementPoint = { x: BAULK_LINE_X - SNOOKER_D_RADIUS / 2, y: snookerSpots[18].y };
      }
      turnNotice = `Foul — ${result.foulPoints} to Player ${opponent + 1}`
        + (scratch ? " · cue ball in hand in the D" : "");
    } else if (result.keepsTurn) {
      scores[shooter] += result.points;
      snookerBreak += result.points;
    } else {
      snookerBreak = 0;
      currentPlayer = opponent;
      turnNotice = "No ball potted — change of turn";
    }

    const remaining = balls.some((ball) => ball.number > 0 && ball.active);
    if (!remaining) {
      if (scores[0] === scores[1]) {
        respotSnookerColour(21);
        snookerPhase = "sequence";
        currentPlayer = Math.random() < .5 ? 0 : 1;
        ballInHand = true;
        placementPoint = { x: BAULK_LINE_X - SNOOKER_D_RADIUS / 2, y: snookerSpots[18].y };
        turnNotice = "Tied — black ball respotted";
      } else {
        const winner = scores[0] > scores[1] ? 0 : 1;
        gameOver = true;
        ballInHand = false;
        if (mode === "ai") lastWinnerByVariant[variant] = winner;
        els.canvasMessage.innerHTML = `<span>PLAYER ${winner + 1} WINS THE FRAME ${scores[winner]}–${scores[1 - winner]}</span>`;
        turnNotice = "Frame over";
      }
    }
    shotWasPushOut = false;
    lastShotPocketed = false;
    updateUI();
    if (mode === "ai" && currentPlayer === 1 && !gameOver) scheduleAiShot();
  }

  function respotCue() {
    cueBall.active = true;
    cueBall.vx = 0;
    cueBall.vy = 0;
    cueBall.spinX = 0;
    cueBall.spinY = 0;
    cueBall.x = 275;
    cueBall.y = H / 2;
    separateFromNeighbors(cueBall);
  }

  function finishTurn() {
    if (isSnooker()) {
      finishSnookerTurn();
      return;
    }
    if (isEightBall()) {
      finishEightBallTurn();
      return;
    }
    moving = false;
    const shooter = currentPlayer;
    const scratch = !cueBall.active;
    const foul = scratch || (!shotWasPushOut && (firstHitNumber !== shotTargetNumber || (!ballsPocketedThisShot && !railContactAfterFirstHit)));
    const wasBreak = breakPending;
    if (wasBreak) breakPending = false;

    if (mode !== "trick" && !gameOver) {
      if (foul) {
        if (nineBallPocketedThisShot) respotNineBall();
        consecutiveFouls[shooter] += 1;
        currentPlayer = mode === "timer" ? shooter : 1 - shooter;
        postBreakPushOutAvailable = false;
        pushOutCalled = false;
        pushOutAwaitingChoice = false;
        ballInHand = true;
        if (consecutiveFouls[shooter] >= 3) {
          gameOver = true;
          if (mode === "ai") lastWinnerByVariant[variant] = currentPlayer;
          if (mode === "timer") {
            els.canvasMessage.innerHTML = "<span>THREE CONSECUTIVE FOULS — RUN OVER</span>";
          } else {
            scores[currentPlayer] += 1;
            els.canvasMessage.innerHTML = `<span>THREE CONSECUTIVE FOULS — PLAYER ${currentPlayer + 1} WINS</span>`;
          }
          ballInHand = false;
          turnNotice = "Three consecutive fouls lose the rack";
        } else {
          placementPoint = {
            x: clamp(cueBall.x, TABLE.left + BALL_R, TABLE.right - BALL_R),
            y: clamp(cueBall.y, TABLE.top + BALL_R, TABLE.bottom - BALL_R)
          };
          turnNotice = scratch
            ? "Scratch — opponent has ball in hand"
            : firstHitNumber !== shotTargetNumber
              ? `Foul — hit the ${shotTargetNumber} ball first`
              : "Foul — a ball must be pocketed or reach a rail after contact";
        }
      } else {
        consecutiveFouls[shooter] = 0;
        ballInHand = false;
        if (nineBallPocketedThisShot && wasBreak && isTenBall() && !shotWasPushOut) {
          respotNineBall();
          nineBallPocketedThisShot = false;
        }
        if (shotWasPushOut) {
          if (nineBallPocketedThisShot) respotNineBall();
          currentPlayer = 1 - shooter;
          pushOutAwaitingChoice = true;
          pushOutShooter = shooter;
          postBreakPushOutAvailable = false;
          turnNotice = "Push-out played — choose whether to take the shot";
        } else if (nineBallPocketedThisShot) {
          gameOver = true;
          if (mode === "ai") lastWinnerByVariant[variant] = shooter;
          scores[shooter] += 1;
          els.canvasMessage.innerHTML = `<span>PLAYER ${shooter + 1} WINS THE RACK</span>`;
          turnNotice = `The ${finalBallNumber()} ball was legally pocketed`;
        } else {
          if (wasBreak) {
            breakPending = false;
            postBreakPushOutAvailable = true;
          }
          turnNotice = "";
          if (!ballsPocketedThisShot) {
            currentPlayer = 1 - shooter;
            if (wasBreak) postBreakPushOutAvailable = true;
            turnNotice = "No ball pocketed — change of turn";
          } else {
            currentPlayer = shooter;
          }
        }
      }
    }
    shotWasPushOut = false;
    lastShotPocketed = false;
    updateUI();
    if (mode === "ai" && currentPlayer === 1 && !gameOver && !pushOutAwaitingChoice) scheduleAiShot();
    if (mode === "ai" && currentPlayer === 1 && pushOutAwaitingChoice) {
      aiTimeout = window.setTimeout(() => resolvePushOut(true), 700);
    }
  }

  let lastShotPocketed = false;

  function finishEightBallTurn() {
    moving = false;
    const shooter = currentPlayer;
    const opponent = 1 - shooter;
    const wasBreak = breakPending;
    breakPending = false;
    const scratch = !cueBall.active;
    const foul = scratch || !shotTargetNumbers.includes(firstHitNumber)
      || (!ballsPocketedThisShot && !railContactAfterFirstHit);
    let pocketed = pocketedThisShot;

    if (pocketed.includes(8)) {
      if (wasBreak) {
        respotBall(8, { x: 650, y: H / 2 });
        pocketed = pocketed.filter((number) => number !== 8);
      } else {
        const legalWin = !foul && shotTargetNumbers.length === 1 && shotTargetNumbers[0] === 8;
        const winner = legalWin ? shooter : opponent;
        gameOver = true;
        if (mode === "ai") lastWinnerByVariant[variant] = winner;
        ballInHand = false;
        els.canvasMessage.innerHTML = `<span>PLAYER ${winner + 1} WINS THE RACK</span>`;
        turnNotice = legalWin ? "The 8 ball was legally pocketed"
          : scratch ? "Scratched while pocketing the 8 — rack lost" : "The 8 ball was pocketed too early or illegally";
        shotWasPushOut = false;
        lastShotPocketed = false;
        updateUI();
        return;
      }
    }

    if (foul) {
      currentPlayer = opponent;
      ballInHand = true;
      placementPoint = {
        x: clamp(cueBall.x, TABLE.left + BALL_R, TABLE.right - BALL_R),
        y: clamp(cueBall.y, TABLE.top + BALL_R, TABLE.bottom - BALL_R)
      };
      turnNotice = scratch
        ? "Scratch — opponent has ball in hand"
        : !shotTargetNumbers.includes(firstHitNumber)
          ? "Foul — hit one of your own balls first"
          : "Foul — a ball must be pocketed or reach a rail after contact";
    } else {
      ballInHand = false;
      if (!groups[shooter] && !wasBreak && pocketed.length > 0) {
        groups[shooter] = groupOf(pocketed[0]);
        groups[opponent] = groups[shooter] === "solids" ? "stripes" : "solids";
        turnNotice = `Player ${shooter + 1} is ${groups[shooter]}`;
      } else {
        turnNotice = "";
      }
      const keepsTurn = pocketed.some((number) => !groups[shooter] || groupOf(number) === groups[shooter]);
      if (keepsTurn) {
        currentPlayer = shooter;
      } else {
        currentPlayer = opponent;
        turnNotice = pocketed.length > 0 ? "Opponent's ball pocketed — change of turn" : "No ball pocketed — change of turn";
      }
    }
    shotWasPushOut = false;
    lastShotPocketed = false;
    updateUI();
    if (mode === "ai" && currentPlayer === 1 && !gameOver) scheduleAiShot();
  }

  function resolvePushOut(takeShot) {
    if (!pushOutAwaitingChoice) return;
    const receiver = currentPlayer;
    pushOutAwaitingChoice = false;
    postBreakPushOutAvailable = false;
    currentPlayer = takeShot ? receiver : pushOutShooter;
    turnNotice = takeShot ? "Push-out accepted" : "Push-out passed back — opponent shoots";
    updateUI();
    if (mode === "ai" && currentPlayer === 1 && !gameOver) scheduleAiShot();
  }

  // Used when no clean pot exists (typically a snooker behind another ball): sweeps every direction
  // and power, including cushion kicks around the blocker, and keeps the best legal hit that
  // either pots something or leaves the opponent a difficult table.
  function findEscapeShot(targets) {
    if (!cueBall.active || targets.length === 0) return null;
    const degrees = Math.PI / 180;
    const powers = [32, 62, 100];
    const legal = [];
    const tryShot = (angle, power) => {
      const sim = simulateShot(angle, power);
      if (!targets.some((target) => target.number === sim.firstHit)) return;
      const outcome = scoreAiOutcome(sim, targets);
      if (sim.scratch || outcome.score <= -300) return;
      legal.push({ angle, power, sim, score: outcome.score - power * .15 });
    };
    for (let deg = 0; deg < 360; deg += 3) {
      for (const power of powers) tryShot(deg * degrees, power);
    }
    if (legal.length === 0) return null;
    legal.sort((a, b) => b.score - a.score);
    for (const seed of legal.slice(0, 3)) {
      for (const offset of [-1.5, -.75, .75, 1.5]) tryShot(seed.angle + offset * degrees, seed.power);
    }
    legal.sort((a, b) => b.score - a.score);
    let best = null;
    for (const shot of legal.slice(0, 8)) {
      let score = shot.score;
      if (shot.score <= 0) {
        score += withSimulatedTable(shot.sim, () => {
          const opponentTargets = legalTargets(0);
          if (opponentTargets.length === 0) return 0;
          return Math.min(chooseBestShot(opponentTargets).quality, 600) / 20;
        });
      }
      if (!best || score > best.score) best = { ...shot, score };
    }
    return best ? { angle: best.angle, power: best.power, quality: 5000, target: targets[0] } : null;
  }

  function aiShotCandidates(target) {
    const objectBalls = balls.filter((ball) => ball.active && ball.number > 0 && ball !== target);
    const candidates = [];

    for (const pocket of pockets) {
      const objectX = pocket.x - target.x;
      const objectY = pocket.y - target.y;
      const objectDistance = Math.hypot(objectX, objectY);
      if (objectDistance === 0) continue;
      const objectDirection = { x: objectX / objectDistance, y: objectY / objectDistance };
      const pocketMiss = Math.abs((pocket.x - target.x) * objectDirection.y - (pocket.y - target.y) * objectDirection.x);
      const objectClearance = segmentClearance(target, objectDirection, objectDistance, objectBalls);
      if (pocketMiss > pocketAimTolerance(pocket) || objectClearance < 4) continue;

      const ghost = {
        x: target.x - objectDirection.x * BALL_R * 2,
        y: target.y - objectDirection.y * BALL_R * 2
      };
      if (ghost.x < TABLE.left + BALL_R || ghost.x > TABLE.right - BALL_R
        || ghost.y < TABLE.top + BALL_R || ghost.y > TABLE.bottom - BALL_R) continue;

      const approaches = findCueApproaches(ghost, objectDirection, objectBalls);
      for (const approach of approaches) {
        candidates.push({
          angle: approach.angle,
          distance: approach.cueDistance + objectDistance * .4 + (1 - approach.approach) * 210
            + pocketMiss * 5 + 110 / (objectClearance + 5) + 75 / (approach.clearance + 5)
            + (approach.banks || 0) * 22,
          approach: approach.approach,
          cueDistance: approach.cueDistance,
          objectDistance,
          pocket
        });
      }
    }

    candidates.sort((a, b) => a.distance - b.distance);
    return candidates;
  }

  function aiPowerFor(shot) {
    const targetTravel = Math.max(0, shot.objectDistance - shot.pocket.radius);
    const targetSpeedAtImpact = Math.sqrt(2 * BALL_FRICTION * targetTravel)
      / (BALL_RESTITUTION * shot.approach);
    const requiredCueSpeed = Math.sqrt(targetSpeedAtImpact ** 2 + 2 * BALL_FRICTION * shot.cueDistance);
    return clamp(requiredCueSpeed / SHOT_SPEED_PER_PULL * 1.32, 14, MAX_PULL);
  }

  function chooseAiShot(target) {
    const candidates = aiShotCandidates(target);
    if (candidates.length > 0) {
      const shot = candidates[0];
      return { angle: shot.angle, power: aiPowerFor(shot), quality: shot.distance, target };
    }

    const fallback = Math.atan2(target.y - cueBall.y, target.x - cueBall.x);
    return { angle: fallback, power: 54, quality: 10000, target };
  }

  function chooseBestShot(targets) {
    let best = null;
    for (const target of targets) {
      const shot = chooseAiShot(target);
      if (!best || shot.quality < best.quality) best = shot;
    }
    return best;
  }

  function simulateShot(angle, power) {
    const saved = { balls, cueBall, firstHitNumber, railContactAfterFirstHit, soundOn };
    const copy = balls.map((ball) => ({ ...ball, trail: [], orient: null }));
    const pocketed = [];
    let result;
    try {
      balls = copy;
      cueBall = copy.find((ball) => ball.number === 0);
      firstHitNumber = null;
      railContactAfterFirstHit = false;
      soundOn = false;
      cueBall.vx = Math.cos(angle) * power * SHOT_SPEED_PER_PULL;
      cueBall.vy = Math.sin(angle) * power * SHOT_SPEED_PER_PULL;
      cueBall.spinX = 0;
      cueBall.spinY = 0;
      const step = 1 / 120;
      for (let tick = 0; tick < 1200; tick += 1) {
        const active = copy.filter((ball) => ball.active);
        for (const ball of active) {
          advanceBall(ball, step);
          const pocket = pockets.find((candidate) => Math.hypot(ball.x - candidate.x, ball.y - candidate.y) < pocketCaptureRadius(candidate));
          if (pocket) {
            ball.active = false;
            ball.vx = 0;
            ball.vy = 0;
            pocketed.push(ball.number);
            continue;
          }
          constrainBallToTable(ball);
        }
        for (let pass = 0; pass < 3; pass += 1) {
          for (let i = 0; i < active.length; i += 1) {
            for (let j = i + 1; j < active.length; j += 1) collide(active[i], active[j]);
          }
          for (const ball of active) {
            if (ball.active) constrainBallToTable(ball);
          }
        }
        if (!copy.some((ball) => ball.active && (ball.vx !== 0 || ball.vy !== 0))) break;
      }
      result = {
        balls: copy,
        pocketed,
        scratch: !cueBall.active,
        firstHit: firstHitNumber,
        railAfterContact: railContactAfterFirstHit
      };
    } finally {
      ({ balls, cueBall, firstHitNumber, railContactAfterFirstHit, soundOn } = saved);
    }
    return result;
  }

  function withSimulatedTable(sim, callback) {
    const saved = { balls, cueBall };
    try {
      balls = sim.balls;
      cueBall = sim.balls.find((ball) => ball.number === 0);
      return callback();
    } finally {
      ({ balls, cueBall } = saved);
    }
  }

  function scoreAiOutcome(sim, targets) {
    const targetNumbers = targets.map((ball) => ball.number);
    const eight = isEightBall();
    const foul = sim.scratch || !targetNumbers.includes(sim.firstHit)
      || (sim.pocketed.length === 0 && !sim.railAfterContact);
    const finalBall = eight ? 8 : finalBallNumber();
    if (sim.pocketed.includes(finalBall)) {
      const wins = !foul && (eight ? targetNumbers.length === 1 && targetNumbers[0] === 8 : true);
      if (wins) return { score: 10000, keepsTurn: true, win: true };
      if (eight) return { score: -10000, keepsTurn: false };
    }
    if (foul) return { score: -300, keepsTurn: false };
    const mine = sim.pocketed.filter((number) => !eight || !groups[1] || groupOf(number) === groups[1]);
    const theirs = sim.pocketed.length - mine.length;
    if (mine.length === 0) return { score: -40 * theirs, keepsTurn: false };
    return { score: 100 * mine.length - 60 * theirs, keepsTurn: theirs === 0 || mine.length > 0 };
  }

  function evaluateAiShot(angle, power, targets, positional) {
    const sim = simulateShot(angle, power);
    const outcome = scoreAiOutcome(sim, targets);
    let score = outcome.score;
    if (positional && !outcome.win && score > -300) {
      score += withSimulatedTable(sim, () => {
        if (!cueBall.active) return 0;
        if (outcome.keepsTurn && score > 0) {
          const nextTargets = legalTargets(1);
          if (nextTargets.length === 0) return 40;
          return 40 - Math.min(chooseBestShot(nextTargets).quality, 600) / 15;
        }
        const opponentTargets = legalTargets(0);
        if (opponentTargets.length === 0) return 0;
        return Math.min(chooseBestShot(opponentTargets).quality, 600) / 30;
      });
    }
    return { score, sim };
  }

  function refineAiShot(baseShot, targets) {
    const expert = aiDifficulty >= 3;
    const degrees = Math.PI / 180;
    const attempts = [];
    const addAttempt = (angle, power) => attempts.push({ angle, power: clamp(power, 14, MAX_PULL) });
    addAttempt(baseShot.angle, baseShot.power);
    let ranked = [];
    for (const target of targets) ranked = ranked.concat(aiShotCandidates(target));
    ranked.sort((a, b) => a.distance - b.distance);
    for (const shot of ranked.slice(0, expert ? 10 : 5)) {
      const power = aiPowerFor(shot);
      addAttempt(shot.angle, power);
      if (expert) {
        addAttempt(shot.angle, power * .8);
        addAttempt(shot.angle, power * 1.25);
      }
    }
    for (const target of targets) {
      const direct = Math.atan2(target.y - cueBall.y, target.x - cueBall.x);
      addAttempt(direct, 44);
      addAttempt(direct, 80);
    }

    let best = null;
    const consider = (attempt) => {
      const result = evaluateAiShot(attempt.angle, attempt.power, targets, expert);
      if (!best || result.score > best.score) best = { ...attempt, score: result.score };
    };
    attempts.forEach(consider);
    if (best && best.score > 0) {
      const center = { ...best };
      for (const offset of expert ? [-.6, -.3, .3, .6] : [-.35, .35]) consider({ angle: center.angle + offset * degrees, power: center.power });
    }
    if (!best || best.score <= -300) return findEscapeShot(targets) || baseShot;
    return { ...baseShot, angle: best.angle, power: best.power };
  }

  function findCueApproaches(ghost, objectDirection, obstacles) {
    const approaches = [];
    const cueX = ghost.x - cueBall.x;
    const cueY = ghost.y - cueBall.y;
    const cueDistance = Math.hypot(cueX, cueY);
    if (cueDistance > 0) {
      const direction = { x: cueX / cueDistance, y: cueY / cueDistance };
      const clearance = segmentClearance(cueBall, direction, cueDistance - BALL_R, obstacles);
      const approach = direction.x * objectDirection.x + direction.y * objectDirection.y;
      if (clearance >= 4 && approach > 0) {
        approaches.push({ angle: Math.atan2(cueY, cueX), cueDistance, clearance, approach, banks: 0 });
        return approaches;
      }
    }

    const minX = TABLE.left + BALL_R;
    const maxX = TABLE.right - BALL_R;
    const minY = TABLE.top + BALL_R;
    const maxY = TABLE.bottom - BALL_R;
    const rails = [
      { axis: "x", position: minX, min: minY, max: maxY, direction: -1 },
      { axis: "x", position: maxX, min: minY, max: maxY, direction: 1 },
      { axis: "y", position: minY, min: minX, max: maxX, direction: -1 },
      { axis: "y", position: maxY, min: minX, max: maxX, direction: 1 }
    ];

    for (const rail of rails) {
      for (let tangent = rail.min + 2; tangent <= rail.max - 2; tangent += 2) {
        const bounce = rail.axis === "x" ? { x: rail.position, y: tangent } : { x: tangent, y: rail.position };
        if (isNearPocketMouth(bounce, rail.axis)) continue;

        const firstX = bounce.x - cueBall.x;
        const firstY = bounce.y - cueBall.y;
        const firstDistance = Math.hypot(firstX, firstY);
        if (firstDistance < BALL_R * 2) continue;
        const incoming = { x: firstX / firstDistance, y: firstY / firstDistance };
        if ((rail.axis === "x" ? incoming.x : incoming.y) * rail.direction <= 0) continue;

        const outgoing = rail.axis === "x"
          ? { x: -incoming.x * RAIL_RESTITUTION, y: incoming.y * RAIL_TANGENTIAL_RETENTION }
          : { x: incoming.x * RAIL_TANGENTIAL_RETENTION, y: -incoming.y * RAIL_RESTITUTION };
        const outgoingSpeed = Math.hypot(outgoing.x, outgoing.y);
        outgoing.x /= outgoingSpeed;
        outgoing.y /= outgoingSpeed;

        const remainingX = ghost.x - bounce.x;
        const remainingY = ghost.y - bounce.y;
        const secondDistance = Math.hypot(remainingX, remainingY);
        if (secondDistance < BALL_R * 2) continue;
        const miss = Math.abs(remainingX * outgoing.y - remainingY * outgoing.x);
        const alongPath = remainingX * outgoing.x + remainingY * outgoing.y;
        if (miss > 2.5 || alongPath <= 0) continue;

        const secondDirection = { x: remainingX / secondDistance, y: remainingY / secondDistance };
        const firstClearance = segmentClearance(cueBall, incoming, firstDistance - BALL_R, obstacles);
        const secondClearance = segmentClearance(bounce, secondDirection, secondDistance - BALL_R, obstacles);
        if (firstClearance < 4 || secondClearance < 4) continue;
        const approach = outgoing.x * objectDirection.x + outgoing.y * objectDirection.y;
        if (approach <= 0) continue;

        approaches.push({
          angle: Math.atan2(incoming.y, incoming.x),
          cueDistance: firstDistance + secondDistance,
          clearance: Math.min(firstClearance, secondClearance),
          approach,
          banks: 1
        });
      }
    }
    return approaches.concat(findMultiCushionApproaches(ghost, objectDirection, obstacles));
  }

  function findMultiCushionApproaches(ghost, objectDirection, obstacles) {
    const minX = TABLE.left + BALL_R;
    const maxX = TABLE.right - BALL_R;
    const minY = TABLE.top + BALL_R;
    const maxY = TABLE.bottom - BALL_R;
    const width = maxX - minX;
    const height = maxY - minY;
    const localX = ghost.x - minX;
    const localY = ghost.y - minY;
    const approaches = [];

    for (let tileX = -2; tileX <= 2; tileX += 1) {
      for (let tileY = -2; tileY <= 2; tileY += 1) {
        const image = {
          x: minX + tileX * width + (tileX % 2 === 0 ? localX : width - localX),
          y: minY + tileY * height + (tileY % 2 === 0 ? localY : height - localY)
        };
        const route = getUnfoldedRailSequence(cueBall, image, minX, minY, width, height);
        if (!route || route.length < 2 || route.length > 3) continue;

        const baseAngle = Math.atan2(image.y - cueBall.y, image.x - cueBall.x);
        let best = null;
        const steps = 240;
        const range = .36;
        for (let step = -steps; step <= steps; step += 1) {
          const angle = baseAngle + step * range / steps;
          const path = traceBankRoute(angle, ghost, objectDirection, route, obstacles, minX, maxX, minY, maxY);
          if (path && (!best || path.miss < best.miss)) best = { ...path, angle };
        }
        if (best && best.miss <= 2.5) {
          approaches.push({
            angle: best.angle,
            cueDistance: best.cueDistance,
            clearance: best.clearance,
            approach: best.approach,
            banks: route.length
          });
        }
      }
    }
    return approaches;
  }

  function getUnfoldedRailSequence(origin, image, minX, minY, width, height) {
    const events = [];
    const dx = image.x - origin.x;
    const dy = image.y - origin.y;
    if (dx !== 0) {
      const firstX = Math.floor((Math.min(origin.x, image.x) - minX) / width) + 1;
      const lastX = Math.ceil((Math.max(origin.x, image.x) - minX) / width) - 1;
      for (let tile = firstX; tile <= lastX; tile += 1) {
        const t = (minX + tile * width - origin.x) / dx;
        if (t > 0 && t < 1) events.push({
          t,
          axis: "x",
          side: tile % 2 === 0 ? "left" : "right"
        });
      }
    }

    if (dy !== 0) {
      const firstY = Math.floor((Math.min(origin.y, image.y) - minY) / height) + 1;
      const lastY = Math.ceil((Math.max(origin.y, image.y) - minY) / height) - 1;
      for (let tile = firstY; tile <= lastY; tile += 1) {
        const t = (minY + tile * height - origin.y) / dy;
        if (t > 0 && t < 1) events.push({
          t,
          axis: "y",
          side: tile % 2 === 0 ? "top" : "bottom"
        });
      }
    }

    events.sort((a, b) => a.t - b.t);
    for (let index = 1; index < events.length; index += 1) {
      if (Math.abs(events[index].t - events[index - 1].t) < .0001) return null;
    }
    return events.map(({ axis, side }) => ({ axis, side }));
  }

  function traceBankRoute(angle, ghost, objectDirection, expectedRails, obstacles, minX, maxX, minY, maxY) {
    let origin = { x: cueBall.x, y: cueBall.y };
    let direction = { x: Math.cos(angle), y: Math.sin(angle) };
    let cueDistance = 0;
    let clearance = Infinity;

    for (let bank = 0; bank <= expectedRails.length; bank += 1) {
      const toX = direction.x > 0 ? (maxX - origin.x) / direction.x
        : direction.x < 0 ? (minX - origin.x) / direction.x : Infinity;
      const toY = direction.y > 0 ? (maxY - origin.y) / direction.y
        : direction.y < 0 ? (minY - origin.y) / direction.y : Infinity;
      const hitAxis = toX < toY ? "x" : "y";
      const hitSide = hitAxis === "x" ? direction.x > 0 ? "right" : "left"
        : direction.y > 0 ? "bottom" : "top";
      const railDistance = Math.min(toX, toY);
      if (!Number.isFinite(railDistance) || railDistance <= 0) return null;

      const toGhostX = ghost.x - origin.x;
      const toGhostY = ghost.y - origin.y;
      const projection = toGhostX * direction.x + toGhostY * direction.y;
      const miss = Math.abs(toGhostX * direction.y - toGhostY * direction.x);
      if (projection > 0 && projection <= railDistance) {
        if (bank !== expectedRails.length) return null;
        const approach = direction.x * objectDirection.x + direction.y * objectDirection.y;
        const segmentSafety = segmentClearance(origin, direction, projection, obstacles);
        if (segmentSafety < 4 || approach <= 0) return null;
        return { miss, cueDistance: cueDistance + projection, clearance: Math.min(clearance, segmentSafety), approach };
      }

      if (bank >= expectedRails.length) return null;
      const segmentSafety = segmentClearance(origin, direction, railDistance - BALL_R, obstacles);
      if (segmentSafety < 4) return null;
      clearance = Math.min(clearance, segmentSafety);
      cueDistance += railDistance;
      const bounce = {
        x: origin.x + direction.x * railDistance,
        y: origin.y + direction.y * railDistance
      };
      if (expectedRails[bank].axis !== hitAxis || expectedRails[bank].side !== hitSide
        || isNearPocketMouth(bounce, hitAxis)) return null;

      if (hitAxis === "x") {
        direction.x *= -RAIL_RESTITUTION;
        direction.y *= RAIL_TANGENTIAL_RETENTION;
      } else {
        direction.x *= RAIL_TANGENTIAL_RETENTION;
        direction.y *= -RAIL_RESTITUTION;
      }
      const speed = Math.hypot(direction.x, direction.y);
      direction.x /= speed;
      direction.y /= speed;
      origin = bounce;
    }
    return null;
  }

  function isNearPocketMouth(point, railAxis) {
    return pockets.some((pocket) => {
      const pocketAlongRail = railAxis === "x" ? pocket.y : pocket.x;
      const pointAlongRail = railAxis === "x" ? point.y : point.x;
      return Math.abs(pointAlongRail - pocketAlongRail) < pocketCaptureRadius(pocket) + BALL_R;
    });
  }

  function rankTargetsForPlacement(targets, count) {
    const ranked = targets.map((target) => {
      const objectBalls = balls.filter((ball) => ball.active && ball.number > 0 && ball !== target);
      let cost = Infinity;
      for (const pocket of pockets) {
        const objectDistance = Math.hypot(pocket.x - target.x, pocket.y - target.y);
        if (objectDistance === 0) continue;
        const direction = { x: (pocket.x - target.x) / objectDistance, y: (pocket.y - target.y) / objectDistance };
        const pocketMiss = Math.abs((pocket.x - target.x) * direction.y - (pocket.y - target.y) * direction.x);
        const clearance = segmentClearance(target, direction, objectDistance, objectBalls);
        const ghostX = target.x - direction.x * BALL_R * 2;
        const ghostY = target.y - direction.y * BALL_R * 2;
        const onTable = ghostX >= TABLE.left + BALL_R && ghostX <= TABLE.right - BALL_R
          && ghostY >= TABLE.top + BALL_R && ghostY <= TABLE.bottom - BALL_R;
        if (pocketMiss > pocketAimTolerance(pocket) || clearance < 4 || !onTable) continue;
        cost = Math.min(cost, objectDistance + pocketMiss * 5 + 110 / (clearance + 5));
      }
      return { target, cost };
    });
    ranked.sort((a, b) => a.cost - b.cost);
    return ranked.slice(0, count).map((entry) => entry.target);
  }

  function placeCueBallForAi(allTargets) {
    let best = null;
    const origin = { x: cueBall.x, y: cueBall.y };
    // With many legal targets, only the most pocketable ones are evaluated to keep placement responsive.
    const wide = allTargets.length > 2;
    const targets = wide ? rankTargetsForPlacement(allTargets, 2) : allTargets;
    const coarseStep = wide ? 80 : 48;

    function considerPlacement(x, y) {
      if (!isCuePlacementValid(x, y)) return;
      cueBall.x = x;
      cueBall.y = y;
      const shot = chooseBestShot(targets);
      const quality = shot.quality + Math.hypot(x - origin.x, y - origin.y) * .02;
      if (!best || quality < best.quality) best = { x, y, shot, quality };
    }

    for (let y = TABLE.top + BALL_R + 2; y <= TABLE.bottom - BALL_R - 2; y += coarseStep) {
      for (let x = TABLE.left + BALL_R + 2; x <= TABLE.right - BALL_R - 2; x += coarseStep) {
        considerPlacement(x, y);
      }
    }
    if (best) {
      const coarseBest = best;
      const reach = coarseStep / 2;
      for (let y = Math.max(TABLE.top + BALL_R + 2, coarseBest.y - reach); y <= Math.min(TABLE.bottom - BALL_R - 2, coarseBest.y + reach); y += 12) {
        for (let x = Math.max(TABLE.left + BALL_R + 2, coarseBest.x - reach); x <= Math.min(TABLE.right - BALL_R - 2, coarseBest.x + reach); x += 12) {
          considerPlacement(x, y);
        }
      }
    }
    if (!best) {
      if (!cueBall.active) {
        throw new Error("Unable to place the CPU cue ball despite ball-in-hand.");
      }
      return chooseBestShot(allTargets);
    }

    cueBall.x = best.x;
    cueBall.y = best.y;
    cueBall.vx = 0;
    cueBall.vy = 0;
    cueBall.active = true;
    return best.shot;
  }

  // Guards against planned shots (e.g. bank routes or degenerate geometry) whose simulation never
  // contacts a legal ball first, such as the cue ball being fired at a pocket.
  function ensureShotHitsTarget(shot, targets) {
    const hitsTarget = (angle, power) => targets.some((target) => target.number === simulateShot(angle, power).firstHit);
    if (hitsTarget(shot.angle, shot.power)) return shot;
    const escape = findEscapeShot(targets);
    if (escape) return { ...shot, angle: escape.angle, power: escape.power };
    const ordered = [...targets].sort((a, b) => Math.hypot(a.x - cueBall.x, a.y - cueBall.y) - Math.hypot(b.x - cueBall.x, b.y - cueBall.y));
    for (const target of ordered) {
      const angle = Math.atan2(target.y - cueBall.y, target.x - cueBall.x);
      for (const power of [44, 80, 28]) {
        if (hitsTarget(angle, power)) return { ...shot, angle, power };
      }
    }
    const angle = Math.atan2(ordered[0].y - cueBall.y, ordered[0].x - cueBall.x);
    return { ...shot, angle, power: 44 };
  }

  // The break: the cue ball is placed behind the baulk line and must strike the lowest ball
  // (any legal target in eight-ball) first.
  function planAiBreak(targets) {
    cueBall.active = true;
    const minX = TABLE.left + BALL_R + 2;
    const maxX = BAULK_LINE_X - BALL_R - 2;
    const minY = TABLE.top + BALL_R + 2;
    const maxY = TABLE.bottom - BALL_R - 2;
    const powerLevels = [.45, .6, .75, .9, 1].map((level) => MAX_PULL * level);
    const legal = [];
    let fallback = null;

    // Try random spots anywhere behind the baulk line with varied power, keeping legal non-scratch breaks.
    for (let attempt = 0; attempt < 24 && legal.length < 6; attempt += 1) {
      const spot = { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) };
      if (!isCuePlacementValid(spot.x, spot.y)) continue;
      cueBall.x = spot.x;
      cueBall.y = spot.y;
      cueBall.vx = 0;
      cueBall.vy = 0;
      const ordered = [...targets].sort((a, b) => Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y));
      const lowest = isEightBall() ? ordered[0] : targets[0];
      const angle = Math.atan2(lowest.y - spot.y, lowest.x - spot.x);
      const power = powerLevels[Math.floor(Math.random() * powerLevels.length)];
      const sim = simulateShot(angle, power);
      if (!targets.some((target) => target.number === sim.firstHit)) continue;
      const candidate = { spot, shot: { angle, power, quality: 0, target: lowest } };
      if (sim.scratch) fallback = fallback || candidate;
      else legal.push(candidate);
    }

    let chosen = legal.length > 0 ? legal[Math.floor(Math.random() * legal.length)] : fallback;
    if (!chosen) {
      const spot = isCuePlacementValid(BAULK_LINE_X - BALL_R - 40, H / 2)
        ? { x: BAULK_LINE_X - BALL_R - 40, y: H / 2 }
        : { x: cueBall.x, y: cueBall.y };
      const lowest = targets[0];
      chosen = { spot, shot: { angle: Math.atan2(lowest.y - spot.y, lowest.x - spot.x), power: MAX_PULL * .6, quality: 0, target: lowest } };
    }
    cueBall.x = chosen.spot.x;
    cueBall.y = chosen.spot.y;
    cueBall.vx = 0;
    cueBall.vy = 0;
    placementPoint = { x: chosen.spot.x, y: chosen.spot.y };
    return chosen.shot;
  }

  function snookerBestShot(targets) {
    const redsBefore = balls.filter((ball) => isRed(ball.number) && ball.active).length;
    const numbers = targets.map((target) => target.number);
    const rate = (angle, power) => {
      const sim = simulateShot(angle, power);
      const result = judgeSnookerShot({
        phase: snookerPhase, targets: numbers, firstHit: sim.firstHit, pocketed: sim.pocketed, scratch: sim.scratch, redsBefore
      });
      return result.foul ? -result.foulPoints * 1.5 : result.points + (result.keepsTurn ? 1.5 : 0);
    };
    const ordered = [...targets].sort((a, b) => Math.hypot(a.x - cueBall.x, a.y - cueBall.y) - Math.hypot(b.x - cueBall.x, b.y - cueBall.y));
    let best = null;
    for (const target of ordered.slice(0, 8)) {
      for (const candidate of aiShotCandidates(target).slice(0, 2)) {
        const power = aiPowerFor(candidate);
        const score = rate(candidate.angle, power) + (isRed(target.number) ? 0 : snookerValue(target.number) * .2);
        if (!best || score > best.score) best = { angle: candidate.angle, power, score, target };
      }
    }
    if (!best || best.score <= 0) {
      const target = ordered[0];
      const angle = Math.atan2(target.y - cueBall.y, target.x - cueBall.x);
      for (const power of [16, 28, 42]) {
        const score = rate(angle, power);
        if (!best || score > best.score) best = { angle, power, score, target };
      }
    }
    return best;
  }

  function planAiSnooker(targets) {
    cueBall.active = true;
    const centre = snookerSpots[18];
    if (!ballInHand) return snookerBestShot(targets);
    const breaking = breakPending;
    let chosen = null;
    for (let attempt = 0; attempt < (breaking ? 30 : 14); attempt += 1) {
      const radius = SNOOKER_D_RADIUS * Math.sqrt(Math.random()) * .95;
      const theta = Math.PI / 2 + Math.random() * Math.PI;
      const x = centre.x + Math.cos(theta) * radius;
      const y = centre.y + Math.sin(theta) * radius;
      if (!isCuePlacementValid(x, y)) continue;
      cueBall.x = x;
      cueBall.y = y;
      cueBall.vx = 0;
      cueBall.vy = 0;
      let shot;
      if (breaking) {
        const apex = targets.reduce((nearest, ball) => (ball.x < nearest.x ? ball : nearest), targets[0]);
        const angle = Math.atan2(apex.y - y, apex.x - x);
        const power = MAX_PULL * [.4, .55, .7][Math.floor(Math.random() * 3)];
        const sim = simulateShot(angle, power);
        if (sim.scratch || !targets.some((target) => target.number === sim.firstHit)) continue;
        shot = { angle, power, score: 0 };
      } else {
        shot = snookerBestShot(targets);
      }
      if (!chosen || shot.score > chosen.shot.score) chosen = { x, y, shot };
      if (breaking) break;
    }
    if (!chosen) {
      const x = BAULK_LINE_X - SNOOKER_D_RADIUS / 2;
      cueBall.x = x;
      cueBall.y = centre.y;
      cueBall.vx = 0;
      cueBall.vy = 0;
      chosen = { x, y: centre.y, shot: snookerBestShot(targets) };
    }
    cueBall.x = chosen.x;
    cueBall.y = chosen.y;
    placementPoint = { x: chosen.x, y: chosen.y };
    return chosen.shot;
  }

  function scheduleAiShot() {
    const targets = legalTargets(1);
    if (targets.length === 0) return;
    if (isSnooker()) {
      const shot = planAiSnooker(targets);
      ballInHand = false;
      if (!shot) return;
      const noise = [.03, .014, .006][Math.min(aiDifficulty, 3) - 1] ?? .01;
      shot.angle += (Math.random() - .5) * noise;
      aimAngle = shot.angle;
      turnNotice = "The house is lining it up…";
      updateUI();
      aiTimeout = window.setTimeout(() => {
        if (mode !== "ai" || currentPlayer !== 1 || gameOver) return;
        turnNotice = "";
        shoot(shot.power, shot.angle, { x: 0, y: 0 });
      }, 850);
      return;
    }
    const isBreak = breakPending && ballInHand;
    let shot = isBreak
      ? planAiBreak(targets)
      : ballInHand
        ? placeCueBallForAi(targets)
        : cueBall.active
          ? chooseBestShot(targets)
          : null;
    if (!isBreak && shot && shot.quality >= 10000) shot = findEscapeShot(targets) || shot;
    ballInHand = false;
    if (!shot) return;
    if (!isBreak && aiDifficulty > 1 && shot.quality < 5000) shot = refineAiShot(shot, targets);
    if (cueBall.active) shot = ensureShotHitsTarget(shot, targets);
    aimAngle = shot.angle;
    turnNotice = "The house is lining it up…";
    updateUI();
    aiTimeout = window.setTimeout(() => {
      if (mode !== "ai" || currentPlayer !== 1 || gameOver) return;
      turnNotice = "";
      shoot(shot.power, shot.angle, { x: 0, y: 0 });
    }, 850);
  }

  function drawTable() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#121914";
    ctx.fillRect(0, 0, W, H);

    const wood = ctx.createLinearGradient(0, 0, 0, H);
    wood.addColorStop(0, "#9b6333");
    wood.addColorStop(.14, "#684020");
    wood.addColorStop(.5, "#84502a");
    wood.addColorStop(.88, "#61391f");
    wood.addColorStop(1, "#a16b39");
    const frame = tableIsSnooker
      ? { x: TABLE.left - 30, y: TABLE.top - 30, w: TABLE.right - TABLE.left + 60, h: TABLE.bottom - TABLE.top + 60 }
      : { x: 18, y: 18, w: 964, h: 554 };
    roundedRect(frame.x, frame.y, frame.w, frame.h, 17, wood);
    ctx.save();
    roundedPath(frame.x + 4, frame.y + 4, frame.w - 8, frame.h - 8, 14);
    ctx.clip();
    for (let i = 0; i < 26; i += 1) {
      const y = 24 + i * 21;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(246,192,115,.12)" : "rgba(45,23,11,.1)";
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.bezierCurveTo(250, y - 10, 700, y + 10, 980, y - 3);
      ctx.stroke();
    }
    ctx.restore();

    if (!tableIsSnooker) roundedRect(43, 43, 914, 504, 15, "#33271c");
    const cushion = ctx.createLinearGradient(0, 46, 0, 76);
    cushion.addColorStop(0, "#214a32");
    cushion.addColorStop(.55, "#163e2b");
    cushion.addColorStop(1, "#0e2e20");
    if (tableIsSnooker) {
      roundedRect(TABLE.left - 20, TABLE.top - 20, TABLE.right - TABLE.left + 40, TABLE.bottom - TABLE.top + 40, 9, "#33271c");
      roundedRect(TABLE.left - 10, TABLE.top - 10, TABLE.right - TABLE.left + 20, TABLE.bottom - TABLE.top + 20, 6, cushion);
    } else {
      roundedRect(58, 58, 884, 474, 11, cushion);
    }
    roundedRect(TABLE.left - 4, TABLE.top - 4, TABLE.right - TABLE.left + 8, TABLE.bottom - TABLE.top + 8, 8, tableIsSnooker ? snookerFelt : felt);
    if (tableIsSnooker) {
      const centre = snookerSpots[18];
      if (ballInHand) {
        ctx.fillStyle = "rgba(201,243,106,.12)";
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, SNOOKER_D_RADIUS, Math.PI / 2, Math.PI * 1.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(235,245,225,.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(BAULK_LINE_X, TABLE.top);
      ctx.lineTo(BAULK_LINE_X, TABLE.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, SNOOKER_D_RADIUS, Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.fillStyle = "rgba(235,245,225,.8)";
      for (const number of [16, 17, 18, 19, 20, 21]) {
        ctx.beginPath();
        ctx.arc(snookerSpots[number].x, snookerSpots[number].y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!tableIsSnooker && ballInHand && breakPending) {
      ctx.fillStyle = "rgba(201,243,106,.06)";
      ctx.fillRect(TABLE.left + 4, TABLE.top + 4, BAULK_LINE_X - BALL_R - TABLE.left - 4, TABLE.bottom - TABLE.top - 8);
    }

    if (!tableIsSnooker) {
    ctx.strokeStyle = "rgba(221,239,205,.11)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.moveTo(BAULK_LINE_X, TABLE.top + 4);
    ctx.lineTo(BAULK_LINE_X, TABLE.bottom - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(240,236,185,.42)";
    for (let i = 0; i < 5; i += 1) {
      const x = 145 + i * 138;
      ctx.beginPath(); ctx.arc(x, 63, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, 527, 1.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(BAULK_LINE_X, 295, 2.3, 0, Math.PI * 2); ctx.fill();
    }

    drawPockets();
    const canAim = !gameOver && cueBall.active && !moving && !draggedBall && !ballInHand;
    if (canAim && aimGuideOn) drawAimGuide({ x: Math.cos(aimAngle), y: Math.sin(aimAngle) });
    drawBalls();
    drawSnookerHighlights(canAim);
    if (canAim && (Number(els.spinEnglish.value) !== 0 || Number(els.spinFollow.value) !== 0)) drawSpinMarker();
    const canPlaceCueBall = mode !== "ai" || currentPlayer === 0;
    if (ballInHand && canPlaceCueBall && placementPoint.x >= TABLE.left && placementPoint.x <= TABLE.right
      && placementPoint.y >= TABLE.top && placementPoint.y <= TABLE.bottom) {
      ctx.save();
      ctx.globalAlpha = isCuePlacementValid(placementPoint.x, placementPoint.y) ? .58 : .22;
      drawBall({ ...cueBall, x: placementPoint.x, y: placementPoint.y, active: true });
      ctx.restore();
      ctx.fillStyle = "rgba(201,243,106,.9)";
      ctx.font = "10px 'DM Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        isSnooker() ? "CLICK INSIDE THE D TO PLACE" : breakPending
          ? "BREAK SETUP · CLICK BEHIND BAULK LINE TO PLACE"
          : cueBall.active ? "CLICK OPEN SPOT TO MOVE · CLICK CUE TO SHOOT FROM HERE" : "CLICK TO PLACE CUE BALL",
        placementPoint.x,
        Math.max(TABLE.top + 18, placementPoint.y - 24)
      );
      ctx.textAlign = "left";
    }
    if (canAim) drawCue();
    if (mode === "trick" && !moving) drawTrickHint();
  }

  function drawPockets() {
    ctx.save();
    if (tableIsSnooker) {
      // Keep pocket rings off the playing surface.
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(TABLE.left - 4, TABLE.top - 4, TABLE.right - TABLE.left + 8, TABLE.bottom - TABLE.top + 8);
      ctx.clip("evenodd");
    }
    for (const pocket of pockets) {
      const shadow = ctx.createRadialGradient(pocket.x, pocket.y, 3, pocket.x, pocket.y, pocket.radius + 9);
      shadow.addColorStop(0, "#030605");
      shadow.addColorStop(.75, "#080c09");
      shadow.addColorStop(1, "rgba(3,6,4,.15)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(204,162,105,.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius + 1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (tableIsSnooker) {
      for (const pocket of pockets) {
        ctx.fillStyle = "#030605";
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function snookerHighlightTargets() {
    if (!isSnooker() || gameOver || balls.some((ball) => ball.active && isRed(ball.number))) return [];
    return legalTargets(currentPlayer);
  }

  function drawSnookerHighlights(canAim) {
    if (!canAim) return;
    const pulse = .5 + .5 * Math.sin(performance.now() / 260);
    ctx.save();
    ctx.strokeStyle = `rgba(190,240,110,${.55 + .4 * pulse})`;
    ctx.lineWidth = 2;
    for (const ball of snookerHighlightTargets()) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R + 3.5 + pulse * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBalls() {
    for (const ball of balls) {
      if (!ball.active || (ball === cueBall && ballInHand)) continue;
      if (ball === draggedBall) {
        ctx.save();
        ctx.globalAlpha = .72;
        drawBall(ball);
        ctx.restore();
      } else {
        drawBall(ball);
      }
    }
  }

  function drawSpinMarker() {
    const x = cueBall.x + Number(els.spinEnglish.value) / 100 * BALL_R * .58;
    const y = cueBall.y - Number(els.spinFollow.value) / 100 * BALL_R * .58;
    ctx.save();
    ctx.fillStyle = "#8dca48";
    ctx.strokeStyle = "rgba(17,27,19,.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBall(ball) {
    const { x, y, number } = ball;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.56)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#e7e9dc";
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    if (number > 0 && isSnooker()) {
      const colour = isRed(number) ? "#c8261f" : SNOOKER_COLORS[number];
      const shade = ctx.createRadialGradient(x - BALL_R * .35, y - BALL_R * .4, BALL_R * .1, x, y, BALL_R);
      shade.addColorStop(0, "rgba(255,255,255,.75)");
      shade.addColorStop(.25, colour);
      shade.addColorStop(1, "rgba(0,0,0,.55)");
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      if (ball.orient) {
        // Marker spots rotate with the ball's orientation so rolling is visible.
        ctx.fillStyle = number === 20 || number === 16 ? "rgba(60,30,20,.7)" : "rgba(255,255,255,.7)";
        for (const axis of ball.orient) {
          for (const sign of [1, -1]) {
            if (axis[2] * sign < .1) continue;
            ctx.beginPath();
            ctx.ellipse(x + axis[0] * sign * BALL_R * .88, y + axis[1] * sign * BALL_R * .88, 1.3, 1.3 * axis[2] * sign, Math.atan2(axis[1], axis[0]), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (number > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, BALL_R - .7, 0, Math.PI * 2);
      ctx.clip();
      const orient = ball.orient || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const [ex, ey, ez] = orient;
      const base = ctx.createLinearGradient(x - BALL_R, y - BALL_R, x + BALL_R, y + BALL_R);
      base.addColorStop(0, "#ffffff");
      base.addColorStop(1, "#b9beb1");
      ctx.fillStyle = base;
      ctx.fillRect(x - BALL_R, y - BALL_R, BALL_R * 2, BALL_R * 2);
      ctx.fillStyle = colors[number];
      ctx.strokeStyle = colors[number];
      ctx.lineWidth = .6;
      if (number >= 9) {
        // Stripe is a band around the ball's local Y axis, projected from its current orientation.
        const band = .46;
        const segments = 32;
        const point = (angle, lat) => {
          const lx = Math.cos(angle) * Math.cos(lat);
          const ly = Math.sin(lat);
          const lz = Math.sin(angle) * Math.cos(lat);
          return [
            x + (lx * ex[0] + ly * ey[0] + lz * ez[0]) * BALL_R,
            y + (lx * ex[1] + ly * ey[1] + lz * ez[1]) * BALL_R,
            lx * ex[2] + ly * ey[2] + lz * ez[2]
          ];
        };
        for (let i = 0; i < segments; i += 1) {
          const a0 = (i / segments) * Math.PI * 2;
          const a1 = ((i + 1) / segments) * Math.PI * 2;
          const corners = [point(a0, -band), point(a1, -band), point(a1, band), point(a0, band)];
          if (corners.reduce((sum, c) => sum + c[2], 0) / 4 < -.02) continue;
          ctx.beginPath();
          ctx.moveTo(corners[0][0], corners[0][1]);
          for (let c = 1; c < 4; c += 1) ctx.lineTo(corners[c][0], corners[c][1]);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(x, y, BALL_R - .7, 0, Math.PI * 2);
        ctx.fill();
      }
      // Number discs sit at both poles of the local Z axis.
      for (const sign of [1, -1]) {
        const facing = ez[2] * sign;
        if (facing < .04) continue;
        ctx.save();
        ctx.transform(ex[0] * sign, ex[1] * sign, ey[0], ey[1], x + ez[0] * sign * BALL_R, y + ez[1] * sign * BALL_R);
        ctx.fillStyle = "#fffdf5";
        ctx.beginPath(); ctx.arc(0, 0, 6.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#20251f";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(number), 0, .4);
        ctx.restore();
      }
      const shade = ctx.createRadialGradient(x - 5, y - 6, 1, x, y, BALL_R + 2);
      shade.addColorStop(0, "rgba(255,255,255,.28)");
      shade.addColorStop(.55, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,.38)");
      ctx.fillStyle = shade;
      ctx.fillRect(x - BALL_R, y - BALL_R, BALL_R * 2, BALL_R * 2);
      ctx.restore();
      ctx.fillStyle = "rgba(248,247,237,.85)";
      ctx.beginPath(); ctx.arc(x - 4.5, y - 5, 2.2, 0, Math.PI * 2); ctx.fill();
    } else {
      const shine = ctx.createRadialGradient(x - 5, y - 6, 1, x, y, BALL_R + 2);
      shine.addColorStop(0, "#fffef2");
      shine.addColorStop(.68, "#e7e8da");
      shine.addColorStop(1, "#b7c0ae");
      ctx.fillStyle = shine;
      ctx.beginPath(); ctx.arc(x, y, BALL_R - 1, 0, Math.PI * 2); ctx.fill();
      if (ball.orient) {
        // Small marker dots on the cue ball make its spin visible while it rolls.
        ctx.fillStyle = "rgba(70,95,140,.75)";
        for (const axis of ball.orient) {
          for (const sign of [1, -1]) {
            if (axis[2] * sign < .1) continue;
            ctx.beginPath();
            ctx.ellipse(x + axis[0] * sign * BALL_R * .92, y + axis[1] * sign * BALL_R * .92, 1.7, 1.7 * axis[2] * sign, Math.atan2(axis[1], axis[0]), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.fillStyle = "rgba(255,255,255,.65)";
      ctx.beginPath(); ctx.arc(x - 4.5, y - 5, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawCue() {
    const direction = { x: Math.cos(aimAngle), y: Math.sin(aimAngle) };
    const normal = { x: -direction.y, y: direction.x };
    const tipDistance = BALL_R + 3 + pullDistance;
    const buttDistance = 205 + pullDistance;
    const handleLength = 78;
    const widthScale = isSnooker() ? .7 : 1;
    const tipWidth = 5.6 * widthScale;
    const connectWidth = 7 * widthScale;
    const buttWidth = 10 * widthScale;
    const at = (distance) => ({ x: cueBall.x - direction.x * distance, y: cueBall.y - direction.y * distance });
    const quad = (startDistance, endDistance, startWidth, endWidth) => {
      const a = at(startDistance);
      const b = at(endDistance);
      ctx.beginPath();
      ctx.moveTo(a.x + normal.x * startWidth / 2, a.y + normal.y * startWidth / 2);
      ctx.lineTo(b.x + normal.x * endWidth / 2, b.y + normal.y * endWidth / 2);
      ctx.lineTo(b.x - normal.x * endWidth / 2, b.y - normal.y * endWidth / 2);
      ctx.lineTo(a.x - normal.x * startWidth / 2, a.y - normal.y * startWidth / 2);
      ctx.closePath();
    };
    const roundShade = (startDistance, endDistance, width, startWidth = width) => {
      const a = at(startDistance);
      const b = at(endDistance);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const shade = ctx.createLinearGradient(mx - normal.x * width / 2, my - normal.y * width / 2, mx + normal.x * width / 2, my + normal.y * width / 2);
      shade.addColorStop(0, "rgba(0,0,0,.5)");
      shade.addColorStop(.3, "rgba(255,255,255,.35)");
      shade.addColorStop(.55, "rgba(255,255,255,0)");
      shade.addColorStop(1, "rgba(0,0,0,.55)");
      ctx.fillStyle = shade;
      quad(startDistance, endDistance, startWidth, width);
      ctx.fill();
    };
    const handleStartDistance = buttDistance - handleLength;
    const tip = at(tipDistance);
    const handleStart = at(handleStartDistance);
    const butt = at(buttDistance);
    const ferruleLength = 6;
    const tipLength = 4;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 3;
    const shaft = ctx.createLinearGradient(tip.x, tip.y, handleStart.x, handleStart.y);
    shaft.addColorStop(0, "#e1c99a");
    shaft.addColorStop(1, "#d3ae78");
    ctx.fillStyle = shaft;
    quad(tipDistance + tipLength + ferruleLength, handleStartDistance, tipWidth, connectWidth);
    ctx.fill();
    ctx.shadowColor = "transparent";
    roundShade(tipDistance + tipLength + ferruleLength, handleStartDistance, connectWidth, tipWidth);
    ctx.shadowColor = "rgba(0,0,0,.55)";
    const handle = ctx.createLinearGradient(handleStart.x, handleStart.y, butt.x, butt.y);
    handle.addColorStop(0, "#6b3f20");
    handle.addColorStop(.5, "#4a2a14");
    handle.addColorStop(1, "#2e1a0d");
    ctx.fillStyle = handle;
    quad(handleStartDistance, buttDistance, connectWidth, buttWidth);
    ctx.fill();
    ctx.shadowColor = "transparent";
    roundShade(handleStartDistance, buttDistance, buttWidth, connectWidth);
    ctx.fillStyle = "#c9a86a";
    quad(handleStartDistance, handleStartDistance - 3, connectWidth, connectWidth);
    ctx.fill();
    ctx.fillStyle = "#ece3c9";
    quad(tipDistance + tipLength, tipDistance + tipLength + ferruleLength, tipWidth, tipWidth);
    ctx.fill();
    roundShade(tipDistance + tipLength, tipDistance + tipLength + ferruleLength, tipWidth);
    ctx.fillStyle = "#3d7fb5";
    quad(tipDistance, tipDistance + tipLength, tipWidth, tipWidth);
    ctx.fill();
    roundShade(tipDistance, tipDistance + tipLength, tipWidth);
    ctx.restore();
  }
  function rayCircleDistance(origin, direction, center, radius) {
    const offsetX = center.x - origin.x;
    const offsetY = center.y - origin.y;
    const projection = offsetX * direction.x + offsetY * direction.y;
    if (projection <= 0) return null;
    const perpendicularSquared = offsetX * offsetX + offsetY * offsetY - projection * projection;
    const halfChordSquared = radius * radius - perpendicularSquared;
    if (halfChordSquared < 0) return null;
    const distance = projection - Math.sqrt(halfChordSquared);
    return distance > 0 ? distance : null;
  }

  function segmentClearance(origin, direction, length, obstacles) {
    let clearance = Infinity;
    for (const obstacle of obstacles) {
      const offsetX = obstacle.x - origin.x;
      const offsetY = obstacle.y - origin.y;
      const alongPath = clamp(offsetX * direction.x + offsetY * direction.y, 0, length);
      const separation = Math.hypot(offsetX - direction.x * alongPath, offsetY - direction.y * alongPath);
      clearance = Math.min(clearance, separation - BALL_R * 2);
    }
    return clearance;
  }

  function distanceToTableEdge(origin, direction) {
    const distances = [];
    if (direction.x > 0) distances.push((TABLE.right - BALL_R - origin.x) / direction.x);
    if (direction.x < 0) distances.push((TABLE.left + BALL_R - origin.x) / direction.x);
    if (direction.y > 0) distances.push((TABLE.bottom - BALL_R - origin.y) / direction.y);
    if (direction.y < 0) distances.push((TABLE.top + BALL_R - origin.y) / direction.y);
    return Math.min(...distances.filter((distance) => distance > 0));
  }

  function distanceToRailWithNormal(origin, direction) {
    let best = { distance: Infinity, nx: 0, ny: 0 };
    const consider = (distance, nx, ny) => {
      if (distance > 1e-6 && distance < best.distance) best = { distance, nx, ny };
    };
    if (direction.x > 0) consider((TABLE.right - BALL_R - origin.x) / direction.x, -1, 0);
    if (direction.x < 0) consider((TABLE.left + BALL_R - origin.x) / direction.x, 1, 0);
    if (direction.y > 0) consider((TABLE.bottom - BALL_R - origin.y) / direction.y, 0, -1);
    if (direction.y < 0) consider((TABLE.top + BALL_R - origin.y) / direction.y, 0, 1);
    return best;
  }

  function nearestBallOnRay(origin, direction) {
    let nearest = null;
    for (const ball of balls) {
      if (!ball.active || ball === cueBall) continue;
      const distance = rayCircleDistance(origin, direction, ball, BALL_R * 2);
      if (distance !== null && (!nearest || distance < nearest.distance)) nearest = { ball, distance };
    }
    return nearest;
  }

  function drawAimGuide(aimDirection) {
    const MAX_BANKS = 3;
    let origin = { x: cueBall.x, y: cueBall.y };
    let direction = aimDirection;
    let sideSpin = Number(els.spinEnglish.value) / 100;
    let hit = null;
    const segments = [];
    for (let bank = 0; bank <= MAX_BANKS; bank++) {
      const ballHit = nearestBallOnRay(origin, direction);
      const rail = distanceToRailWithNormal(origin, direction);
      if (ballHit && ballHit.distance <= rail.distance) {
        hit = ballHit;
        segments.push({ from: origin, to: { x: origin.x + direction.x * ballHit.distance, y: origin.y + direction.y * ballHit.distance } });
        break;
      }
      const end = { x: origin.x + direction.x * rail.distance, y: origin.y + direction.y * rail.distance };
      segments.push({ from: origin, to: end, bounce: bank < MAX_BANKS });
      if (bank === MAX_BANKS || !isFinite(rail.distance)) break;
      if (pockets.some((pocket) => Math.hypot(end.x - pocket.x, end.y - pocket.y) < pocketCaptureRadius(pocket) + BALL_R)) break;
      if (rail.nx !== 0) {
        direction.x *= -RAIL_RESTITUTION;
        direction.y *= RAIL_TANGENTIAL_RETENTION;
        direction.y += sideSpin * Math.abs(direction.x / RAIL_RESTITUTION) * .18 * aimDirection.x;
      } else {
        direction.x *= RAIL_TANGENTIAL_RETENTION;
        direction.y *= -RAIL_RESTITUTION;
        direction.x -= sideSpin * Math.abs(direction.y / RAIL_RESTITUTION) * .18 * aimDirection.y;
      }
      sideSpin *= .72;
      const speed = Math.hypot(direction.x, direction.y);
      direction.x /= speed;
      direction.y /= speed;
      origin = end;
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(243,247,229,.64)";
    ctx.lineWidth = 1.5;
    segments.forEach((segment, index) => {
      ctx.globalAlpha = Math.max(.4, 1 - index * .2);
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      const startOffset = index === 0 ? BALL_R + 2 : 0;
      const segDx = segment.to.x - segment.from.x;
      const segDy = segment.to.y - segment.from.y;
      const segLength = Math.hypot(segDx, segDy) || 1;
      ctx.moveTo(segment.from.x + segDx / segLength * startOffset, segment.from.y + segDy / segLength * startOffset);
      ctx.lineTo(segment.to.x, segment.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (segment.bounce) {
        ctx.fillStyle = "rgba(243,247,229,.8)";
        ctx.beginPath();
        ctx.arc(segment.to.x, segment.to.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    if (hit) {
      const impactCue = {
        x: origin.x + direction.x * hit.distance,
        y: origin.y + direction.y * hit.distance
      };
      const normalX = hit.ball.x - impactCue.x;
      const normalY = hit.ball.y - impactCue.y;
      const normalLength = Math.hypot(normalX, normalY);
      const targetDirection = { x: normalX / normalLength, y: normalY / normalLength };
      ctx.strokeStyle = "rgba(243,247,229,.82)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(impactCue.x, impactCue.y, BALL_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.globalAlpha = .35;
      drawBall({ ...cueBall, x: impactCue.x, y: impactCue.y });
      ctx.restore();

      const normalVelocity = direction.x * targetDirection.x + direction.y * targetDirection.y;
      const normalTransfer = (1 + BALL_RESTITUTION) / 2;
      const spinFollow = Number(els.spinFollow.value) / 100 * .34;
      const cueExitX = direction.x - targetDirection.x * normalVelocity * normalTransfer + direction.x * spinFollow;
      const cueExitY = direction.y - targetDirection.y * normalVelocity * normalTransfer + direction.y * spinFollow;
      const cueExitLength = Math.hypot(cueExitX, cueExitY);
      if (cueExitLength > .08) {
        const cueExit = { x: cueExitX / cueExitLength, y: cueExitY / cueExitLength };
        let cuePathLength = distanceToTableEdge(impactCue, cueExit);
        for (const ball of balls) {
          if (!ball.active || ball === cueBall || ball === hit.ball) continue;
          const distance = rayCircleDistance(impactCue, cueExit, ball, BALL_R * 2);
          if (distance !== null && distance < cuePathLength) cuePathLength = distance;
        }
        ctx.strokeStyle = "rgba(114,207,207,.65)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(impactCue.x + cueExit.x * BALL_R, impactCue.y + cueExit.y * BALL_R);
        ctx.lineTo(impactCue.x + cueExit.x * cuePathLength, impactCue.y + cueExit.y * cuePathLength);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const targetRail = distanceToRailWithNormal(hit.ball, targetDirection);
      let pathLength = targetRail.distance;
      let targetBlocked = false;
      for (const ball of balls) {
        if (!ball.active || ball === cueBall || ball === hit.ball) continue;
        const blockerDistance = rayCircleDistance(hit.ball, targetDirection, ball, BALL_R * 2);
        if (blockerDistance !== null && blockerDistance < pathLength) {
          pathLength = blockerDistance;
          targetBlocked = true;
        }
      }
      let pocketDistance = null;
      for (const pocket of pockets) {
        const distance = (pocket.x - hit.ball.x) * targetDirection.x + (pocket.y - hit.ball.y) * targetDirection.y;
        const perpendicular = Math.abs((pocket.x - hit.ball.x) * targetDirection.y - (pocket.y - hit.ball.y) * targetDirection.x);
        if (distance > 0 && distance < pathLength && perpendicular < pocket.radius && (pocketDistance === null || distance < pocketDistance)) {
          pocketDistance = distance;
        }
      }
      if (pocketDistance !== null) pathLength = pocketDistance;

      const pathEnd = {
        x: hit.ball.x + targetDirection.x * pathLength,
        y: hit.ball.y + targetDirection.y * pathLength
      };
      if (pathLength > BALL_R + 2) {
        const pathStart = {
          x: hit.ball.x + targetDirection.x * (BALL_R + 2),
          y: hit.ball.y + targetDirection.y * (BALL_R + 2)
        };
        ctx.strokeStyle = "rgba(201,243,106,.92)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(pathStart.x, pathStart.y);
        ctx.lineTo(pathEnd.x, pathEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);
        const reachesBank = !targetBlocked && pocketDistance === null
          && Math.abs(pathLength - targetRail.distance) < .001
          && !pockets.some((pocket) => Math.hypot(pathEnd.x - pocket.x, pathEnd.y - pocket.y)
            < pocketCaptureRadius(pocket) + BALL_R);
        if (reachesBank) {
          const normalVelocity = targetDirection.x * targetRail.nx + targetDirection.y * targetRail.ny;
          const reflected = {
            x: targetDirection.x - 2 * normalVelocity * targetRail.nx,
            y: targetDirection.y - 2 * normalVelocity * targetRail.ny
          };
          const bankPreviewLength = 30;
          const bankEnd = {
            x: pathEnd.x + reflected.x * bankPreviewLength,
            y: pathEnd.y + reflected.y * bankPreviewLength
          };
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(pathEnd.x, pathEnd.y);
          ctx.lineTo(bankEnd.x, bankEnd.y);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(201,243,106,.95)";
        ctx.beginPath();
        ctx.arc(pathEnd.x, pathEnd.y, reachesBank ? 3.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(201,243,106,.72)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hit.ball.x, hit.ball.y, BALL_R + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrickHint() {
    ctx.fillStyle = "rgba(201,243,106,.85)";
    ctx.font = "10px 'DM Mono', monospace";
    ctx.fillText("DRAG BALLS TO REPOSITION · DROP INTO A POCKET TO SINK", 89, 500);
  }

  function roundedRect(x, y, width, height, radius, fill) {
    roundedPath(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function roundedPath(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lighten(hex, amount) {
    return mixColor(hex, "#ffffff", amount);
  }

  function darken(hex, amount) {
    return mixColor(hex, "#000000", amount);
  }

  function mixColor(first, second, amount) {
    const a = first.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
    const b = second.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
    return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * amount)).join(",")})`;
  }

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, .04);
    lastTime = now;
    if (moving) stepPhysics(dt);
    easeAim(dt);
    if (mode === "timer" && !gameOver) {
      remainingSeconds = Math.max(0, remainingSeconds - dt);
      if (remainingSeconds === 0) {
        gameOver = true;
        moving = false;
        els.canvasMessage.innerHTML = `<span>TIME’S UP — ${balls.filter((ball) => ball.number > 0 && ball.active).length} BALLS LEFT</span>`;
        updateUI();
      }
      updateTimerDisplay();
    }
    drawTable();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", cancelPointerInteraction);
  canvas.addEventListener("lostpointercapture", cancelPointerInteraction);
  canvas.addEventListener("dragstart", (event) => event.preventDefault());
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("resize", updateUI);
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.("input, select, textarea")) return;
    if (lockShotWithKeyboard()) {
      event.preventDefault();
      if (event.target instanceof HTMLButtonElement) event.target.blur();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.code !== "Space" || !spaceLocked) return;
    event.preventDefault();
    releaseKeyboardShot();
  });
  window.addEventListener("pointermove", (event) => {
    if (spaceLocked && event.target !== canvas) onPointerMove(event);
  });
  window.addEventListener("blur", () => {
    if (spaceLocked) cancelPointerInteraction();
  });
  els.aimButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.disabled) return;
    adjustAim(Number(button.dataset.aimX), Number(button.dataset.aimY));
  }));
  els.mobilePower.addEventListener("input", () => {
    const percent = Math.round(Number(els.mobilePower.value) / MAX_PULL * 100);
    els.mobilePowerValue.value = `${percent}%`;
    els.mobilePowerValue.textContent = `${percent}%`;
  });
  els.toggleShotControls.addEventListener("click", () => {
    showShotControls = !showShotControls;
    els.toggleShotControls.setAttribute("aria-expanded", String(showShotControls));
    updateUI();
  });
  els.toggleSpinControls.addEventListener("click", () => {
    const show = els.spinControls.hidden;
    els.spinControls.hidden = !show;
    els.toggleSpinControls.setAttribute("aria-expanded", String(show));
  });
  els.mobileShoot.addEventListener("click", () => {
    if (els.mobileShoot.disabled) return;
    shoot(Number(els.mobilePower.value), aimAngle);
  });
  els.spinSliders.forEach((slider) => slider.addEventListener("input", updateSpinReadouts));
  els.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  document.getElementById("reset-button").addEventListener("click", () => resetGame({ rematch: true }));
  document.getElementById("new-rack-button").addEventListener("click", () => resetGame({ rematch: true }));
  els.callPushOut.addEventListener("click", () => {
    if (!postBreakPushOutAvailable || moving || gameOver || ballInHand) return;
    pushOutCalled = true;
    postBreakPushOutAvailable = false;
    turnNotice = "Push-out called — aim and shoot";
    updateUI();
  });
  els.acceptPushOut.addEventListener("click", () => resolvePushOut(true));
  els.passPushOut.addEventListener("click", () => resolvePushOut(false));
  els.aimSelect.addEventListener("change", () => {
    aimGuideOn = els.aimSelect.value === "on";
  });
  els.variantSelect.addEventListener("change", () => {
    variant = els.variantSelect.value;
    setMode(mode);
  });
  els.difficultySelect.addEventListener("change", () => {
    aiDifficulty = Number(els.difficultySelect.value);
    updateCpuName();
    if (mode === "ai") resetGame();
  });
  els.timeSelect.addEventListener("change", () => {
    const custom = els.timeSelect.value === "custom";
    els.customTime.hidden = !custom;
    els.minutesLabel.hidden = !custom;
    if (mode === "timer") resetGame();
  });
  els.customTime.addEventListener("change", () => {
    els.customTime.value = String(selectedMinutes());
    if (mode === "timer") resetGame();
  });
  document.getElementById("sound-toggle").addEventListener("click", (event) => {
    soundOn = !soundOn;
    event.currentTarget.classList.toggle("muted", !soundOn);
    event.currentTarget.setAttribute("aria-label", soundOn ? "Mute sound" : "Enable sound");
    if (soundOn && audioContext?.state === "suspended") audioContext.resume();
  });

  resetGame();
  requestAnimationFrame(frame);
})();
