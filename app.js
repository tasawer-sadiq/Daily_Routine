const STORAGE_KEY = "dailyRoutineData";

const state = {
  routines: [],
  checksByDate: {},
  monthKey: "",
  selectedDate: "",
  reportHistory: [],
};

const elements = {
  routineList: document.getElementById("routineList"),
  emptyState: document.getElementById("emptyState"),
  addRoutineBtn: document.getElementById("addRoutineBtn"),
  datePicker: document.getElementById("datePicker"),
  reportBtn: document.getElementById("reportBtn"),
  reportModal: document.getElementById("reportModal"),
  closeReport: document.getElementById("closeReport"),
  reportList: document.getElementById("reportList"),
  reportEmpty: document.getElementById("reportEmpty"),
  monthDetailModal: document.getElementById("monthDetailModal"),
  closeMonthDetail: document.getElementById("closeMonthDetail"),
  monthDetailList: document.getElementById("monthDetailList"),
  monthDetailEmpty: document.getElementById("monthDetailEmpty"),
  monthDetailTitle: document.getElementById("monthDetailTitle"),
  monthDetailRange: document.getElementById("monthDetailRange"),
  monthlyCard: document.getElementById("monthlyCard"),
  modal: document.getElementById("routineModal"),
  modalTitle: document.getElementById("modalTitle"),
  routineName: document.getElementById("routineName"),
  routineDescription: document.getElementById("routineDescription"),
  cancelModal: document.getElementById("cancelModal"),
  saveRoutine: document.getElementById("saveRoutine"),
  dailyPercent: document.getElementById("dailyPercent"),
  dailySummary: document.getElementById("dailySummary"),
  dailyRange: document.getElementById("dailyRange"),
  monthlyPercent: document.getElementById("monthlyPercent"),
  monthlySummary: document.getElementById("monthlySummary"),
  monthRange: document.getElementById("monthRange"),
  dailyRing: document.getElementById("dailyRing"),
  monthlyRing: document.getElementById("monthlyRing"),
};

let editId = null;

function getToday() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function toDate(value) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function getMonthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start,
    end,
    daysInMonth: end.getDate(),
  };
}

function isToday(dateValue) {
  return dateValue === getToday();
}

function sanitizeSelectedDate(value) {
  const today = getToday();
  if (!value || value < today) {
    return today;
  }
  return value;
}

function refreshDatePickerLimits() {
  const today = getToday();
  if (elements.datePicker) {
    elements.datePicker.min = today;
    elements.datePicker.max = today;
  }
}

function startDayRolloverTimer() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msUntilMidnight = nextMidnight - now;

  if (window.__dailyRolloverTimer) {
    clearTimeout(window.__dailyRolloverTimer);
  }

  window.__dailyRolloverTimer = setTimeout(() => {
    handleMonthRollover();
    setSelectedDate(getToday());
    // Restart the timer for the next day
    startDayRolloverTimer();
  }, Math.max(msUntilMidnight, 0));
}

function startPeriodicDateCheck() {
  // Check every minute if the date has changed and update if needed
  if (window.__periodicDateCheckTimer) {
    clearInterval(window.__periodicDateCheckTimer);
  }

  window.__periodicDateCheckTimer = setInterval(() => {
    const today = getToday();
    if (state.selectedDate !== today && isToday(state.selectedDate) === false) {
      // Date has changed, update the app
      handleMonthRollover();
      setSelectedDate(today);
    }
  }, 60000); // Check every minute
}

function getMonthLabel(monthKey) {
  const date = toDate(`${monthKey}-01`);
  const label = date.toLocaleString("default", { month: "short" });
  return `${label} ${date.getFullYear()}`;
}

function calculateMonthlyStatsForKey(monthKey) {
  const date = toDate(`${monthKey}-01`);
  const { daysInMonth } = getMonthRange(date);
  const activeIds = new Set(state.routines.map((item) => item.id));
  let completed = 0;

  Object.entries(state.checksByDate).forEach(([dateKey, checks]) => {
    if (!dateKey.startsWith(monthKey)) {
      return;
    }
    Object.keys(checks || {}).forEach((id) => {
      if (activeIds.has(Number(id))) {
        completed += 1;
      }
    });
  });

  const total = Math.max(state.routines.length * daysInMonth, 1);
  const percent = Math.round((completed / total) * 100);
  return { monthKey, percent, completed, total };
}

function storeMonthlyReport(monthKey) {
  if (!monthKey) {
    return;
  }
  const existing = state.reportHistory.find((item) => item.monthKey === monthKey);
  if (existing) {
    return;
  }
  const report = calculateMonthlyStatsForKey(monthKey);
  state.reportHistory.unshift(report);
  state.reportHistory = state.reportHistory.slice(0, 12);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state.routines = Array.isArray(parsed.routines) ? parsed.routines : [];
      state.checksByDate = parsed.checksByDate || {};
      state.monthKey = parsed.monthKey || getMonthKey();
      state.selectedDate = parsed.selectedDate || getToday();
      state.reportHistory = Array.isArray(parsed.reportHistory) ? parsed.reportHistory : [];
    } catch (error) {
      state.routines = [];
      state.checksByDate = {};
      state.monthKey = getMonthKey();
      state.selectedDate = getToday();
      state.reportHistory = [];
    }
  } else {
    state.monthKey = getMonthKey();
    state.selectedDate = getToday();
    state.reportHistory = [];
  }

  handleMonthRollover();
  state.selectedDate = sanitizeSelectedDate(state.selectedDate);
  refreshDatePickerLimits();
  startDayRolloverTimer();
  startPeriodicDateCheck();
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      routines: state.routines,
      checksByDate: state.checksByDate,
      monthKey: state.monthKey,
      selectedDate: state.selectedDate,
      reportHistory: state.reportHistory,
    })
  );
}

function setSelectedDate(value) {
  const safeValue = sanitizeSelectedDate(value);
  state.selectedDate = safeValue;
  refreshDatePickerLimits();
  if (elements.datePicker.value !== safeValue) {
    elements.datePicker.value = safeValue;
  }
  saveState();
  render();
}

function handleMonthRollover() {
  const currentMonthKey = getMonthKey();
  if (state.monthKey !== currentMonthKey) {
    const previousMonthKey = state.monthKey;
    // Store the report for the previous month
    storeMonthlyReport(previousMonthKey);
    state.monthKey = currentMonthKey;
    
    // Preserve all data from the current month, not just going forward
    // This ensures no data is lost during month transitions
    const keep = {};
    const prefix = `${currentMonthKey}-`;
    Object.keys(state.checksByDate).forEach((dateKey) => {
      if (dateKey.startsWith(prefix)) {
        keep[dateKey] = state.checksByDate[dateKey];
      }
    });
    state.checksByDate = keep;
    state.selectedDate = getToday();
    saveState();
  }
}

function openModal(isEdit, routine) {
  editId = isEdit ? routine.id : null;
  elements.modalTitle.textContent = isEdit ? "Edit routine" : "Add routine";
  elements.routineName.value = isEdit ? routine.name : "";
  elements.routineDescription.value = isEdit ? routine.description : "";
  elements.modal.classList.add("is-open");
  elements.modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  editId = null;
  elements.modal.classList.remove("is-open");
  elements.modal.setAttribute("aria-hidden", "true");
}

function openReport() {
  elements.reportModal.classList.add("is-open");
  elements.reportModal.setAttribute("aria-hidden", "false");
  renderReportList();
}

function closeReport() {
  elements.reportModal.classList.remove("is-open");
  elements.reportModal.setAttribute("aria-hidden", "true");
}

function openMonthDetail() {
  elements.monthDetailModal.classList.add("is-open");
  elements.monthDetailModal.setAttribute("aria-hidden", "false");
  renderMonthDetailList();
}

function closeMonthDetail() {
  elements.monthDetailModal.classList.remove("is-open");
  elements.monthDetailModal.setAttribute("aria-hidden", "true");
}

function addRoutine(name, description) {
  state.routines.push({
    id: Date.now(),
    name,
    description,
  });
  saveState();
  render();
}

function updateRoutine(id, name, description) {
  const routine = state.routines.find((item) => item.id === id);
  if (!routine) {
    return;
  }
  routine.name = name;
  routine.description = description;
  saveState();
  render();
}

function deleteRoutine(id) {
  state.routines = state.routines.filter((item) => item.id !== id);
  Object.keys(state.checksByDate).forEach((dateKey) => {
    const checks = state.checksByDate[dateKey];
    if (checks && checks[id]) {
      delete checks[id];
    }
  });
  saveState();
  render();
}

function toggleCheck(id, checked) {
  if (!isToday(state.selectedDate)) {
    return;
  }

  const targetDate = state.selectedDate;
  if (!state.checksByDate[targetDate]) {
    state.checksByDate[targetDate] = {};
  }
  if (checked) {
    state.checksByDate[targetDate][id] = true;
  } else {
    delete state.checksByDate[targetDate][id];
  }
  saveState();
  renderProgress();
}

function calculateMonthlyProgress(dateValue) {
  const targetDate = toDate(dateValue);
  const { daysInMonth, start, end } = getMonthRange(targetDate);
  const monthKey = getMonthKey(targetDate);
  const activeIds = new Set(state.routines.map((item) => item.id));
  let completed = 0;

  Object.entries(state.checksByDate).forEach(([dateKey, checks]) => {
    if (!dateKey.startsWith(monthKey)) {
      return;
    }
    Object.keys(checks || {}).forEach((id) => {
      if (activeIds.has(Number(id))) {
        completed += 1;
      }
    });
  });

  const total = Math.max(state.routines.length * daysInMonth, 1);
  const percent = Math.round((completed / total) * 100);
  return { percent, completed, total, daysInMonth, start, end };
}

function calculateDailyProgress(dateValue) {
  const checks = state.checksByDate[dateValue] || {};
  const completed = Object.keys(checks).length;
  const total = Math.max(state.routines.length, 1);
  const percent = Math.round((completed / total) * 100);
  return { percent, completed, total };
}

function setRingProgress(target, percent) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (percent / 100) * circumference;
  target.style.strokeDasharray = `${circumference}`;
  target.style.strokeDashoffset = `${offset}`;
}

function renderProgress() {
  const daily = calculateDailyProgress(state.selectedDate);
  const progress = calculateMonthlyProgress(state.selectedDate);
  elements.dailyPercent.textContent = `${daily.percent}%`;
  elements.dailySummary.textContent = `${daily.completed} of ${daily.total} done`;
  elements.dailyRange.textContent = toDate(state.selectedDate).toLocaleDateString("default", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  elements.monthlyPercent.textContent = `${progress.percent}%`;
  elements.monthlySummary.textContent = `${progress.completed} of ${progress.total} checks`;

  const monthLabel = progress.start.toLocaleString("default", { month: "long" });
  elements.monthRange.textContent = `${monthLabel} ${progress.start.getFullYear()} (${progress.start.getDate()} - ${progress.end.getDate()})`;

  setRingProgress(elements.dailyRing, daily.percent);
  setRingProgress(elements.monthlyRing, progress.percent);
}

function renderList() {
  elements.routineList.innerHTML = "";
  const todayChecks = state.checksByDate[state.selectedDate] || {};

  if (state.routines.length === 0) {
    elements.emptyState.style.display = "block";
    return;
  }
  elements.emptyState.style.display = "none";

  state.routines.forEach((routine) => {
    const card = document.createElement("li");
    card.className = "routine-card";

    const info = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "routine-title";
    const nameSpan = document.createElement("span");
    nameSpan.className = "routine-name";
    nameSpan.textContent = routine.name;
    const descSpan = document.createElement("span");
    descSpan.className = "routine-desc";
    descSpan.textContent = routine.description ? `- ${routine.description}` : "";
    title.appendChild(nameSpan);
    title.appendChild(descSpan);
    info.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "routine-actions";

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "checkbox";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(todayChecks[routine.id]);
    checkbox.disabled = !isToday(state.selectedDate);
    checkbox.addEventListener("change", (event) => {
      toggleCheck(routine.id, event.target.checked);
    });
    const checkText = document.createElement("span");
    checkText.textContent = isToday(state.selectedDate) ? "Done" : "Locked";
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(checkText);

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn emoji";
    editBtn.textContent = "✏️";
    editBtn.setAttribute("aria-label", "Edit routine");
    editBtn.addEventListener("click", () => openModal(true, routine));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn emoji";
    deleteBtn.textContent = "🗑️";
    deleteBtn.setAttribute("aria-label", "Delete routine");
    deleteBtn.addEventListener("click", () => deleteRoutine(routine.id));

    actions.appendChild(checkboxLabel);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(info);
    card.appendChild(actions);
    elements.routineList.appendChild(card);
  });
}

function render() {
  renderList();
  renderProgress();
  renderReportList();
}

function renderReportList() {
  if (!elements.reportList) {
    return;
  }
  elements.reportList.innerHTML = "";
  if (!state.reportHistory.length) {
    elements.reportEmpty.style.display = "block";
    return;
  }
  elements.reportEmpty.style.display = "none";

  state.reportHistory.forEach((report) => {
    const item = document.createElement("li");
    item.className = "report-item";
    const label = document.createElement("strong");
    label.textContent = getMonthLabel(report.monthKey);
    const value = document.createElement("span");
    value.textContent = `${report.percent}% (${report.completed}/${report.total})`;
    item.appendChild(label);
    item.appendChild(value);
    elements.reportList.appendChild(item);
  });
}

function formatDateLabel(dateValue) {
  return toDate(dateValue).toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function renderMonthDetailList() {
  if (!elements.monthDetailList) {
    return;
  }
  elements.monthDetailList.innerHTML = "";

  if (!state.routines.length) {
    elements.monthDetailEmpty.style.display = "block";
    elements.monthDetailRange.textContent = "";
    return;
  }

  elements.monthDetailEmpty.style.display = "none";
  const progress = calculateMonthlyProgress(state.selectedDate);
  const monthLabel = progress.start.toLocaleString("default", { month: "long" });
  elements.monthDetailRange.textContent = `${monthLabel} ${progress.start.getFullYear()} (${progress.start.getDate()} - ${progress.end.getDate()})`;

  const totalDays = progress.daysInMonth;
  const year = progress.start.getFullYear();
  const month = progress.start.getMonth();

  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = new Date(year, month, day).toISOString().slice(0, 10);
    const daily = calculateDailyProgress(dateKey);
    const item = document.createElement("li");
    item.className = "report-item";

    const label = document.createElement("strong");
    label.textContent = formatDateLabel(dateKey);

    const value = document.createElement("span");
    value.textContent = `${daily.percent}% (${daily.completed}/${daily.total})`;

    item.appendChild(label);
    item.appendChild(value);
    elements.monthDetailList.appendChild(item);
  }
}

function initEvents() {
  elements.addRoutineBtn.addEventListener("click", () => openModal(false, null));
  elements.cancelModal.addEventListener("click", closeModal);
  elements.datePicker.addEventListener("change", (event) => {
    if (event.target.value) {
      setSelectedDate(event.target.value);
    }
  });
  elements.reportBtn.addEventListener("click", openReport);
  elements.closeReport.addEventListener("click", closeReport);
  elements.monthlyCard.addEventListener("click", openMonthDetail);
  elements.monthlyCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMonthDetail();
    }
  });
  elements.closeMonthDetail.addEventListener("click", closeMonthDetail);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });
  elements.reportModal.addEventListener("click", (event) => {
    if (event.target === elements.reportModal) {
      closeReport();
    }
  });
  elements.monthDetailModal.addEventListener("click", (event) => {
    if (event.target === elements.monthDetailModal) {
      closeMonthDetail();
    }
  });

  elements.saveRoutine.addEventListener("click", () => {
    const name = elements.routineName.value.trim();
    const description = elements.routineDescription.value.trim();
    if (!name) {
      return;
    }
    if (editId) {
      updateRoutine(editId, name, description);
    } else {
      addRoutine(name, description);
    }
    closeModal();
  });

  // Add visibility change handler to detect when the page comes back into focus
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      const today = getToday();
      const currentMonthKey = getMonthKey();
      // Check if date or month has changed
      if (state.selectedDate !== today || state.monthKey !== currentMonthKey) {
        handleMonthRollover();
        setSelectedDate(today);
      }
    }
  });

  // Add focus handler as fallback
  window.addEventListener("focus", () => {
    const today = getToday();
    const currentMonthKey = getMonthKey();
    if (state.selectedDate !== today || state.monthKey !== currentMonthKey) {
      handleMonthRollover();
      setSelectedDate(today);
    }
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((registration) => {
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for new service worker installation
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              // New service worker activated
              if (confirm("New version available! Reload to get the latest updates?")) {
                window.location.reload();
              }
            }
          });
        });
      });
    });
  }
}

loadState();
setSelectedDate(state.selectedDate || getToday());
initEvents();
render();
registerServiceWorker();
