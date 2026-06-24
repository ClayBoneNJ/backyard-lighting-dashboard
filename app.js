const appConfig = {
  demoMode: true,
  networkLabel: "BackyardLights",
  demoOfflineChance: 0.12,
  requestTimeoutMs: 4500
};

const controllers = [
  { id: "kitchen", name: "Kitchen", ip: "192.168.0.71", group: "Kitchen" },
  { id: "cabana", name: "Cabana", ip: "192.168.0.72", group: "Cabana" },
  { id: "palm-group-left", name: "Palm Group Left", ip: "192.168.0.73", group: "Palms" },
  { id: "palm-group-right", name: "Palm Group Right", ip: "192.168.0.74", group: "Palms" },
  { id: "palm-01", name: "Palm 01", ip: "192.168.0.81", group: "Palms" },
  { id: "palm-02", name: "Palm 02", ip: "192.168.0.82", group: "Palms" },
  { id: "palm-03", name: "Palm 03", ip: "192.168.0.83", group: "Palms" },
  { id: "palm-04", name: "Palm 04", ip: "192.168.0.84", group: "Palms" },
  { id: "palm-05", name: "Palm 05", ip: "192.168.0.85", group: "Palms" },
  { id: "palm-06", name: "Palm 06", ip: "192.168.0.86", group: "Palms" },
  { id: "palm-07", name: "Palm 07", ip: "192.168.0.87", group: "Palms" },
  { id: "palm-08", name: "Palm 08", ip: "192.168.0.88", group: "Palms" }
];

const effects = [
  { label: "Solid", value: 0 },
  { label: "Blink", value: 1 },
  { label: "Breathe", value: 2 },
  { label: "Wipe", value: 3 },
  { label: "Rainbow", value: 9 },
  { label: "Twinkle", value: 20 },
  { label: "Chase", value: 28 },
  { label: "Aurora", value: 38 }
];

const scenes = [
  { id: "allOn", label: "All On" },
  { id: "allOff", label: "All Off" },
  { id: "normalWarmWhite", label: "Normal Warm White" },
  { id: "partyMode", label: "Party Mode" },
  { id: "redWhiteBlue", label: "Red White Blue" },
  { id: "palmsOnly", label: "Palms Only" },
  { id: "cabanaOnly", label: "Cabana Only" },
  { id: "kitchenOnly", label: "Kitchen Only" },
  { id: "chillBlue", label: "Chill Blue" },
  { id: "sunset", label: "Sunset" }
];

const state = {
  statuses: new Map(),
  values: new Map(),
  failures: [],
  logLines: []
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  seedState();
  renderScenes();
  renderGroups();
  renderControllers();
  bindAdminActions();
  updateClock();
  setInterval(updateClock, 1000);
  refreshStatus();
});

function cacheElements() {
  els.modeStatus = document.getElementById("modeStatus");
  els.currentTime = document.getElementById("currentTime");
  els.onlineCount = document.getElementById("onlineCount");
  els.offlineCount = document.getElementById("offlineCount");
  els.controllerCount = document.getElementById("controllerCount");
  els.sceneGrid = document.getElementById("sceneGrid");
  els.groupGrid = document.getElementById("groupGrid");
  els.controllerGrid = document.getElementById("controllerGrid");
  els.demoToggle = document.getElementById("demoToggle");
  els.refreshStatus = document.getElementById("refreshStatus");
  els.exportConfig = document.getElementById("exportConfig");
  els.commandLog = document.getElementById("commandLog");
  els.failureSummary = document.getElementById("failureSummary");
}

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

function renderScenes() {
  els.sceneGrid.innerHTML = "";
  scenes.forEach((scene) => {
    const button = document.createElement("button");
    button.className = "scene-button";
    button.type = "button";
    button.textContent = scene.label;
    button.addEventListener("click", () => activateScene(scene.id));
    els.sceneGrid.appendChild(button);
  });
}

function renderGroups() {
  els.groupGrid.innerHTML = "";
  getGroups().forEach((groupName) => {
    els.groupGrid.appendChild(createControlCard({
      type: "group",
      id: groupName,
      title: groupName,
      meta: `${getControllerIdsByGroup(groupName).length} controllers`,
      onApply: readout => applyGroupControls(groupName, readout)
    }));
  });
}

function renderControllers() {
  els.controllerGrid.innerHTML = "";
  controllers.forEach((controller) => {
    els.controllerGrid.appendChild(createControlCard({
      type: "controller",
      id: controller.id,
      title: controller.name,
      meta: `${controller.ip} | ${controller.group}`,
      controller,
      onApply: readout => applyControllerControls(controller.id, readout)
    }));
  });
  updateStatusDisplay();
}

function createControlCard(options) {
  const saved = state.values.get(options.id) || { on: true, bri: 160, color: "#FFD6A0", effect: 0 };
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.cardId = options.id;

  const statusMarkup = options.type === "controller"
    ? `<span class="status-pill" data-status-for="${options.id}">Unknown</span>`
    : "";

  card.innerHTML = `
    <div class="card-header">
      <div>
        <h3>${escapeHtml(options.title)}</h3>
        <p class="card-meta">${escapeHtml(options.meta)}</p>
      </div>
      ${statusMarkup}
    </div>
    <div class="control-grid">
      <label class="switch-row">
        <input data-field="on" type="checkbox" ${saved.on ? "checked" : ""}>
        <span>Power</span>
      </label>
      <label class="control-row">
        <span class="control-label">Brightness</span>
        <input data-field="bri" type="range" min="1" max="255" value="${saved.bri}">
      </label>
      <label class="control-row">
        <span class="control-label">Color</span>
        <input data-field="color" type="color" value="${saved.color}">
      </label>
      <label class="control-row">
        <span class="control-label">Effect</span>
        <select data-field="effect">
          ${effects.map(effect => `<option value="${effect.value}" ${Number(saved.effect) === effect.value ? "selected" : ""}>${effect.label}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="card-actions">
      <button class="primary-action" data-action="apply" type="button">Apply</button>
      ${options.type === "controller" ? `<button data-action="test" type="button">Test</button>` : `<button data-action="group-on" type="button">Group On</button>`}
    </div>
  `;

  card.querySelector('[data-action="apply"]').addEventListener("click", () => {
    options.onApply(readCardValues(card));
  });

  const secondary = card.querySelector('[data-action="test"], [data-action="group-on"]');
  secondary.addEventListener("click", () => {
    if (options.type === "controller") {
      testController(options.id);
    } else {
      sendToGroup(options.id, { on: true, bri: 160 });
    }
  });

  return card;
}

function bindAdminActions() {
  els.demoToggle.addEventListener("change", () => {
    appConfig.demoMode = els.demoToggle.checked;
    logCommand(appConfig.demoMode ? "Demo Mode enabled." : "Live Mode enabled. Real WLED requests will be sent.");
    refreshStatus();
  });

  els.refreshStatus.addEventListener("click", refreshStatus);
  els.exportConfig.addEventListener("click", exportCurrentConfig);
}

async function sendWledCommand(controller, payload) {
  const startedAt = Date.now();

  if (appConfig.demoMode) {
    await delay(180 + Math.random() * 420);
    if (Math.random() < appConfig.demoOfflineChance) {
      markControllerFailure(controller, "Simulated offline controller");
      throw new Error(`${controller.name} simulated offline`);
    }
    updateLocalControllerState(controller.id, payload);
    markControllerOnline(controller);
    return { ok: true, controller: controller.id, demo: true, elapsedMs: Date.now() - startedAt };
  }

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
    return { ok: true, controller: controller.id, elapsedMs: Date.now() - startedAt };
  } catch (error) {
    markControllerFailure(controller, error.message || "Network error");
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendToControllers(controllerIds, payload) {
  const selectedControllers = controllerIds
    .map(id => controllers.find(controller => controller.id === id))
    .filter(Boolean);

  const results = await Promise.allSettled(
    selectedControllers.map(controller => sendWledCommand(controller, payload))
  );

  const succeeded = results.filter(result => result.status === "fulfilled").length;
  const failed = results.length - succeeded;
  logCommand(`${succeeded}/${results.length} controller commands succeeded.`, payload);
  if (failed > 0) {
    logCommand(`${failed} controller request${failed === 1 ? "" : "s"} failed.`);
  }
  updateStatusDisplay();
  return results;
}

function sendToGroup(groupName, payload) {
  return sendToControllers(getControllerIdsByGroup(groupName), payload);
}

function sendToAll(payload) {
  return sendToControllers(controllers.map(controller => controller.id), payload);
}

function setBrightness(controllerIds, brightness) {
  return sendToControllers(controllerIds, { bri: Number(brightness) });
}

function setColor(controllerIds, hexColor) {
  return sendToControllers(controllerIds, { seg: [{ col: [hexToRgb(hexColor)] }] });
}

async function activateScene(sceneId) {
  clearFailures();
  logCommand(`Activating scene: ${sceneId}`);

  if (sceneId === "allOn") {
    return sendToAll({ on: true, bri: 180 });
  }

  if (sceneId === "allOff") {
    return sendToAll({ on: false });
  }

  if (sceneId === "normalWarmWhite") {
    return sendToAll({ on: true, bri: 160, seg: [{ col: [hexToRgb("#FFD6A0")], fx: 0 }] });
  }

  if (sceneId === "partyMode") {
    return sendToAll({ on: true, bri: 200, seg: [{ fx: 9 }] });
  }

  if (sceneId === "redWhiteBlue") {
    await sendToGroup("Kitchen", { on: true, bri: 180, seg: [{ col: [hexToRgb("#FF1F3D")], fx: 0 }] });
    await sendToGroup("Cabana", { on: true, bri: 180, seg: [{ col: [hexToRgb("#F6F9FF")], fx: 0 }] });
    return sendToGroup("Palms", { on: true, bri: 180, seg: [{ col: [hexToRgb("#2F7DFF")], fx: 0 }] });
  }

  if (sceneId === "palmsOnly") {
    await sendToGroup("Kitchen", { on: false });
    await sendToGroup("Cabana", { on: false });
    return sendToGroup("Palms", { on: true, bri: 170, seg: [{ col: [hexToRgb("#72FFBB")], fx: 2 }] });
  }

  if (sceneId === "cabanaOnly") {
    await sendToGroup("Kitchen", { on: false });
    await sendToGroup("Palms", { on: false });
    return sendToGroup("Cabana", { on: true, bri: 170, seg: [{ col: [hexToRgb("#FFD6A0")], fx: 0 }] });
  }

  if (sceneId === "kitchenOnly") {
    await sendToGroup("Cabana", { on: false });
    await sendToGroup("Palms", { on: false });
    return sendToGroup("Kitchen", { on: true, bri: 170, seg: [{ col: [hexToRgb("#FFF2D6")], fx: 0 }] });
  }

  if (sceneId === "chillBlue") {
    return sendToAll({ on: true, bri: 120, seg: [{ col: [hexToRgb("#38D8FF")], fx: 2 }] });
  }

  if (sceneId === "sunset") {
    await sendToGroup("Kitchen", { on: true, bri: 150, seg: [{ col: [hexToRgb("#FFB35F")], fx: 0 }] });
    await sendToGroup("Cabana", { on: true, bri: 150, seg: [{ col: [hexToRgb("#FF7A90")], fx: 0 }] });
    return sendToGroup("Palms", { on: true, bri: 150, seg: [{ col: [hexToRgb("#FF8A3D")], fx: 2 }] });
  }
}

async function refreshStatus() {
  clearFailures();
  updateModeStatus();

  if (appConfig.demoMode) {
    await Promise.all(controllers.map(async (controller) => {
      await delay(80 + Math.random() * 220);
      if (Math.random() < appConfig.demoOfflineChance) {
        markControllerFailure(controller, "Simulated offline during refresh");
      } else {
        markControllerOnline(controller);
      }
    }));
    logCommand("Demo status refresh complete.");
    updateStatusDisplay();
    return;
  }

  const checks = await Promise.allSettled(controllers.map(async (controller) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), appConfig.requestTimeoutMs);
    try {
      const response = await fetch(`http://${controller.ip}/json`, { signal: abortController.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      markControllerOnline(controller);
    } catch (error) {
      markControllerFailure(controller, error.message || "Status request failed");
    } finally {
      clearTimeout(timeoutId);
    }
  }));

  logCommand(`Live status refresh complete. ${checks.length} controllers checked.`);
  updateStatusDisplay();
}

async function testController(controllerId) {
  const controller = controllers.find(item => item.id === controllerId);
  if (!controller) return;

  clearFailures();
  logCommand(`Testing ${controller.name}.`);
  try {
    await sendWledCommand(controller, { on: true, bri: 255, seg: [{ col: [hexToRgb("#FFFFFF")], fx: 1 }] });
    await delay(800);
    await sendWledCommand(controller, { on: true, bri: 160, seg: [{ col: [hexToRgb("#FFD6A0")], fx: 0 }] });
    logCommand(`${controller.name} test complete.`);
  } catch (error) {
    logCommand(`${controller.name} test failed: ${error.message}`);
  }
  updateStatusDisplay();
}

function applyGroupControls(groupName, readout) {
  clearFailures();
  const payload = controlReadoutToPayload(readout);
  return sendToGroup(groupName, payload);
}

function applyControllerControls(controllerId, readout) {
  clearFailures();
  const payload = controlReadoutToPayload(readout);
  return sendToControllers([controllerId], payload);
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

function markControllerFailure(controller, reason) {
  state.statuses.set(controller.id, "offline");
  state.failures.push({ controller: controller.name, ip: controller.ip, reason });
}

function clearFailures() {
  state.failures = [];
  updateFailureSummary();
}

function updateStatusDisplay() {
  controllers.forEach((controller) => {
    const status = state.statuses.get(controller.id) || "unknown";
    const pill = document.querySelector(`[data-status-for="${controller.id}"]`);
    if (pill) {
      pill.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      pill.className = `status-pill ${status}`;
    }
  });

  const online = controllers.filter(controller => state.statuses.get(controller.id) === "online").length;
  const offline = controllers.filter(controller => state.statuses.get(controller.id) === "offline").length;
  els.onlineCount.textContent = online;
  els.offlineCount.textContent = offline;
  els.controllerCount.textContent = controllers.length;
  updateFailureSummary();
  updateModeStatus();
}

function updateFailureSummary() {
  if (!els.failureSummary) return;

  if (state.failures.length === 0) {
    els.failureSummary.textContent = "No failed controller requests.";
    els.failureSummary.classList.remove("has-failures");
    return;
  }

  els.failureSummary.textContent = state.failures
    .map(failure => `${failure.controller} (${failure.ip}): ${failure.reason}`)
    .join(" | ");
  els.failureSummary.classList.add("has-failures");
}

function updateModeStatus() {
  els.demoToggle.checked = appConfig.demoMode;
  els.modeStatus.textContent = appConfig.demoMode
    ? "Demo Mode - no real lights connected."
    : "Live Mode - sending commands to WLED controllers.";
  els.modeStatus.classList.toggle("live", !appConfig.demoMode);
}

function updateClock() {
  els.currentTime.textContent = new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function exportCurrentConfig() {
  const payload = {
    exportedAt: new Date().toISOString(),
    appConfig,
    controllers,
    controllerState: Object.fromEntries(state.values)
  };

  const text = JSON.stringify(payload, null, 2);
  navigator.clipboard?.writeText(text).catch(() => {});
  logCommand("Current config exported. JSON copied to clipboard when browser permissions allow.", payload);
}

function getGroups() {
  return [...new Set(controllers.map(controller => controller.group))];
}

function getControllerIdsByGroup(groupName) {
  return controllers
    .filter(controller => controller.group === groupName)
    .map(controller => controller.id);
}

function logCommand(message, payload) {
  const timestamp = new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());

  const line = payload
    ? `[${timestamp}] ${message}\n${JSON.stringify(payload, null, 2)}`
    : `[${timestamp}] ${message}`;

  state.logLines.unshift(line);
  state.logLines = state.logLines.slice(0, 8);
  els.commandLog.textContent = state.logLines.join("\n\n");
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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.sendWledCommand = sendWledCommand;
window.sendToControllers = sendToControllers;
window.sendToGroup = sendToGroup;
window.sendToAll = sendToAll;
window.setBrightness = setBrightness;
window.setColor = setColor;
window.activateScene = activateScene;
window.refreshStatus = refreshStatus;
window.testController = testController;
