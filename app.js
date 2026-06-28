const appConfig = {
  requestTimeoutMs: 4500
};

const controllers = [
  { id: "cabana", name: "Cabana", ip: "192.168.0.161" },
  { id: "kitchen", name: "Kitchen", ip: "192.168.0.31" }
];

const effects = [
  { label: "Solid", value: 0 },
  { label: "Breathe", value: 2 },
  { label: "Rainbow", value: 9 },
  { label: "Twinkle", value: 20 },
  { label: "Chase", value: 28 }
];

const state = {
  statuses: new Map(),
  values: new Map()
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  els.controllerGrid = document.getElementById("controllerGrid");
  seedState();
  renderControllers();
  refreshStatus();
});

function seedState() {
  controllers.forEach((controller) => {
    state.statuses.set(controller.id, "unknown");
    state.values.set(controller.id, {
      on: true,
      bri: 160,
      color: "#FFD6A0",
      effect: 0
    });
  });
}

function renderControllers() {
  els.controllerGrid.innerHTML = "";

  controllers.forEach((controller) => {
    els.controllerGrid.appendChild(createControllerCard(controller));
  });

  updateStatusDisplay();
}

function createControllerCard(controller) {
  const saved = state.values.get(controller.id);
  const card = document.createElement("article");
  card.className = "controller-card";
  card.dataset.controllerId = controller.id;

  card.innerHTML = `
    <header class="card-header">
      <div>
        <h1>${escapeHtml(controller.name)}</h1>
        <p>${escapeHtml(controller.ip)}</p>
      </div>
      <span class="status-pill" data-status-for="${controller.id}">Unknown</span>
    </header>

    <label class="power-row">
      <input data-field="on" type="checkbox" ${saved.on ? "checked" : ""}>
      <span>Power</span>
    </label>

    <label class="control-row">
      <span>Brightness</span>
      <input data-field="bri" type="range" min="1" max="255" value="${saved.bri}">
    </label>

    <label class="control-row">
      <span>Color</span>
      <input data-field="color" type="color" value="${saved.color}">
    </label>

    <label class="control-row">
      <span>Effect</span>
      <select data-field="effect">
        ${effects.map(effect => `<option value="${effect.value}" ${saved.effect === effect.value ? "selected" : ""}>${effect.label}</option>`).join("")}
      </select>
    </label>

    <div class="card-actions">
      <button class="primary-action" data-action="apply" type="button">Apply</button>
      <button data-action="test" type="button">Test</button>
    </div>
  `;

  card.querySelector('[data-field="on"]').addEventListener("change", (event) => {
    sendToController(controller.id, { on: event.target.checked });
  });

  card.querySelector('[data-action="apply"]').addEventListener("click", () => {
    sendToController(controller.id, controlReadoutToPayload(readCardValues(card)));
  });

  card.querySelector('[data-action="test"]').addEventListener("click", () => {
    testController(controller.id);
  });

  return card;
}

async function sendWledCommand(controller, payload) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), appConfig.requestTimeoutMs);

  try {
    const response = await fetch(`http://${controller.ip}/json/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    updateLocalControllerState(controller.id, payload);
    markControllerOnline(controller);
  } catch (error) {
    markControllerOffline(controller);
    console.warn(`${controller.name} command failed`, error);
  } finally {
    clearTimeout(timeoutId);
    updateStatusDisplay();
  }
}

function sendToController(controllerId, payload) {
  const controller = controllers.find(item => item.id === controllerId);
  if (!controller) return Promise.resolve();
  return sendWledCommand(controller, payload);
}

async function refreshStatus() {
  await Promise.all(controllers.map(async (controller) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), appConfig.requestTimeoutMs);

    try {
      const response = await fetch(`http://${controller.ip}/json`, {
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      markControllerOnline(controller);
    } catch (error) {
      markControllerOffline(controller);
      console.warn(`${controller.name} status check failed`, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }));

  updateStatusDisplay();
}

async function testController(controllerId) {
  const controller = controllers.find(item => item.id === controllerId);
  if (!controller) return;

  await sendWledCommand(controller, {
    on: true,
    bri: 255,
    seg: [{ col: [hexToRgb("#FFFFFF")], fx: 1 }]
  });

  await delay(800);

  await sendWledCommand(controller, {
    on: true,
    bri: 160,
    seg: [{ col: [hexToRgb("#FFD6A0")], fx: 0 }]
  });
}

function controlReadoutToPayload(readout) {
  return {
    on: readout.on,
    bri: readout.bri,
    seg: [{ col: [hexToRgb(readout.color)], fx: readout.effect }]
  };
}

function readCardValues(card) {
  return {
    on: card.querySelector('[data-field="on"]').checked,
    bri: Number(card.querySelector('[data-field="bri"]').value),
    color: card.querySelector('[data-field="color"]').value,
    effect: Number(card.querySelector('[data-field="effect"]').value)
  };
}

function updateLocalControllerState(controllerId, payload) {
  const current = state.values.get(controllerId) || {};

  if (typeof payload.on === "boolean") current.on = payload.on;
  if (typeof payload.bri === "number") current.bri = payload.bri;
  if (payload.seg && payload.seg[0]) {
    if (payload.seg[0].col && payload.seg[0].col[0]) current.color = rgbToHex(payload.seg[0].col[0]);
    if (typeof payload.seg[0].fx === "number") current.effect = payload.seg[0].fx;
  }

  state.values.set(controllerId, current);
}

function markControllerOnline(controller) {
  state.statuses.set(controller.id, "online");
}

function markControllerOffline(controller) {
  state.statuses.set(controller.id, "offline");
}

function updateStatusDisplay() {
  controllers.forEach((controller) => {
    const status = state.statuses.get(controller.id) || "unknown";
    const pill = document.querySelector(`[data-status-for="${controller.id}"]`);
    if (!pill) return;

    pill.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    pill.className = `status-pill ${status}`;
  });
}

function hexToRgb(hexColor) {
  const normalized = hexColor.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16)
  ];
}

function rgbToHex(rgb) {
  return `#${rgb.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.refreshStatus = refreshStatus;
window.sendToController = sendToController;
window.testController = testController;
