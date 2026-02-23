const STORAGE_KEY = "parking_spot_tracker_v1";

const state = {
  mapImageDataUrl: "",
  records: {},
};

const dateInput = document.getElementById("dateInput");
const todayBtn = document.getElementById("todayBtn");
const floorInput = document.getElementById("floorInput");
const memoInput = document.getElementById("memoInput");
const mapUpload = document.getElementById("mapUpload");
const clearMapBtn = document.getElementById("clearMapBtn");
const mapImage = document.getElementById("mapImage");
const mapContainer = document.getElementById("mapContainer");
const mapStage = document.getElementById("mapStage");
const marker = document.getElementById("marker");
const emptyState = document.getElementById("emptyState");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const historyList = document.getElementById("historyList");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const recordCountLabel = document.getElementById("recordCountLabel");
const toast = document.getElementById("toast");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomLabel = document.getElementById("zoomLabel");
const nudgeUpBtn = document.getElementById("nudgeUpBtn");
const nudgeDownBtn = document.getElementById("nudgeDownBtn");
const nudgeLeftBtn = document.getElementById("nudgeLeftBtn");
const nudgeRightBtn = document.getElementById("nudgeRightBtn");

let toastTimer = null;
let zoomLevel = 1;
let lastPointerStamp = 0;

function todayLocalDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state.mapImageDataUrl = parsed.mapImageDataUrl || "";
      state.records = parsed.records || {};
    }
  } catch {
    console.warn("Failed to load local data.");
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 1800);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyZoom() {
  mapStage.style.width = `${Math.round(zoomLevel * 100)}%`;
  zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
}

function setZoom(nextZoom) {
  zoomLevel = clamp(Number(nextZoom.toFixed(2)), 1, 3);
  applyZoom();
}

function setMapImage(src) {
  state.mapImageDataUrl = src || "";
  if (state.mapImageDataUrl) {
    mapImage.src = state.mapImageDataUrl;
    mapImage.classList.remove("hidden");
    emptyState.classList.add("hidden");
  } else {
    mapImage.src = "";
    mapImage.classList.add("hidden");
    emptyState.classList.remove("hidden");
    marker.classList.add("hidden");
  }
  saveState();
}

function currentRecord() {
  return state.records[dateInput.value] || null;
}

function renderMarker(record) {
  if (!record || typeof record.x !== "number" || typeof record.y !== "number") {
    marker.classList.add("hidden");
    marker.style.display = "";
    return;
  }

  marker.style.left = `${record.x}%`;
  marker.style.top = `${record.y}%`;
  marker.classList.remove("hidden");
  marker.style.display = "block";
}

function renderFields(record) {
  floorInput.value = record?.floor || "";
  memoInput.value = record?.memo || "";
}

function renderHistory() {
  const entries = Object.entries(state.records)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12);

  historyList.innerHTML = "";
  if (entries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "저장된 기록이 없습니다.";
    historyList.appendChild(li);
    return;
  }

  for (const [date, rec] of entries) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    const floor = rec.floor ? rec.floor : "층/구역 미입력";
    const memo = rec.memo ? rec.memo : "메모 없음";
    button.innerHTML = `<strong>${date} · ${floor}</strong><span>${memo}</span>`;
    button.addEventListener("click", () => {
      dateInput.value = date;
      renderDate();
      showToast("해당 날짜 기록을 불러왔습니다.");
    });
    li.appendChild(button);
    historyList.appendChild(li);
  }
}

function renderSummary() {
  selectedDateLabel.textContent = dateInput.value || "-";
  recordCountLabel.textContent = String(Object.keys(state.records).length);
}

function renderDate() {
  const record = currentRecord();
  renderFields(record);
  renderMarker(record);
  renderSummary();
}

function nudgeCurrentPin(dx, dy) {
  const existing = currentRecord();
  if (!existing || typeof existing.x !== "number" || typeof existing.y !== "number") {
    showToast("먼저 도면에서 위치를 찍어 주세요.");
    return;
  }

  state.records[dateInput.value] = {
    ...existing,
    x: Number(clamp(existing.x + dx, 0, 100).toFixed(2)),
    y: Number(clamp(existing.y + dy, 0, 100).toFixed(2)),
    floor: floorInput.value.trim(),
    memo: memoInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveState();
  renderDate();
  renderHistory();
}

function saveCurrentRecord() {
  if (!state.mapImageDataUrl) {
    showToast("먼저 주차장 도면 이미지를 업로드해 주세요.");
    return;
  }

  const existing = currentRecord();
  if (!existing || typeof existing.x !== "number" || typeof existing.y !== "number") {
    showToast("도면에서 주차 위치를 먼저 클릭해 주세요.");
    return;
  }

  state.records[dateInput.value] = {
    ...existing,
    floor: floorInput.value.trim(),
    memo: memoInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveState();
  renderHistory();
  renderSummary();
  showToast("저장되었습니다.");
}

function deleteCurrentRecord() {
  if (!state.records[dateInput.value]) {
    showToast("삭제할 기록이 없습니다.");
    return;
  }
  if (!confirm("선택한 날짜 기록을 삭제할까요?")) return;
  delete state.records[dateInput.value];
  saveState();
  renderDate();
  renderHistory();
  renderSummary();
  showToast("기록을 삭제했습니다.");
}

function placePinAt(clientX, clientY) {
  if (!state.mapImageDataUrl) return;
  const rect = mapImage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  state.records[dateInput.value] = {
    x: Number(clamp(x, 0, 100).toFixed(2)),
    y: Number(clamp(y, 0, 100).toFixed(2)),
    floor: floorInput.value.trim(),
    memo: memoInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveState();
  renderDate();
  renderHistory();
  renderSummary();
  showToast("위치가 지정되었습니다. 저장 버튼으로 확정하세요.");
}

function handleMapPointerUp(event) {
  lastPointerStamp = Date.now();
  placePinAt(event.clientX, event.clientY);
}

function handleMapTouchEnd(event) {
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  lastPointerStamp = Date.now();
  placePinAt(touch.clientX, touch.clientY);
}

function handleMapClick(event) {
  if (Date.now() - lastPointerStamp < 350) return;
  placePinAt(event.clientX, event.clientY);
}

function init() {
  loadState();
  dateInput.value = todayLocalDate();
  setMapImage(state.mapImageDataUrl);
  renderDate();
  renderHistory();

  dateInput.addEventListener("change", renderDate);
  todayBtn.addEventListener("click", () => {
    dateInput.value = todayLocalDate();
    renderDate();
  });
  saveBtn.addEventListener("click", saveCurrentRecord);
  deleteBtn.addEventListener("click", deleteCurrentRecord);
  mapContainer.addEventListener("pointerup", handleMapPointerUp);
  mapContainer.addEventListener("touchend", handleMapTouchEnd, { passive: true });
  mapContainer.addEventListener("click", handleMapClick);
  zoomInBtn.addEventListener("click", () => setZoom(zoomLevel + 0.25));
  zoomOutBtn.addEventListener("click", () => setZoom(zoomLevel - 0.25));
  nudgeUpBtn.addEventListener("click", () => nudgeCurrentPin(0, -0.4));
  nudgeDownBtn.addEventListener("click", () => nudgeCurrentPin(0, 0.4));
  nudgeLeftBtn.addEventListener("click", () => nudgeCurrentPin(-0.4, 0));
  nudgeRightBtn.addEventListener("click", () => nudgeCurrentPin(0.4, 0));

  mapUpload.addEventListener("change", () => {
    const file = mapUpload.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMapImage(String(reader.result || ""));
      renderDate();
      showToast("도면 이미지가 적용되었습니다.");
    };
    reader.readAsDataURL(file);
  });

  clearMapBtn.addEventListener("click", () => {
    if (!confirm("도면 이미지를 초기화할까요? (기록은 유지됩니다)")) return;
    setMapImage("");
    mapUpload.value = "";
    showToast("도면 이미지를 초기화했습니다.");
  });

  applyZoom();
}

init();
