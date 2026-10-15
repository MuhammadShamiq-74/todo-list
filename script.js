const STORAGE_KEY = "todoTasks";
const HISTORY_KEY = "todoHistory";
const LAST_VISIT_KEY = "todoLastVisit";
const THEME_KEY = "todoTheme";

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>'
};

let tasks = loadTasks();
let history = loadHistory();
let currentFilter = "all";
let selectedDateKey = getDateKey(new Date());

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyText = document.getElementById("emptyText");
const taskCount = document.getElementById("taskCount");
const clearCompletedBtn = document.getElementById("clearCompleted");
const themeToggle = document.getElementById("themeToggle");
const filterBtns = document.querySelectorAll(".filter-btn");
const dateBars = document.getElementById("dateBars");
const dateDetails = document.getElementById("dateDetails");
const weekTotal = document.getElementById("weekTotal");

checkDayRollover();
pruneHistory();
initTheme();
bindEvents();
render();

setInterval(() => {
  if (checkDayRollover()) render();
}, 30000);

function bindEvents() {
  taskForm.addEventListener("submit", addTask);
  if (taskList) {
    taskList.addEventListener("click", handleTaskClick);
    taskList.addEventListener("dblclick", handleTaskDoubleClick);
  }
  clearCompletedBtn.addEventListener("click", clearCompleted);
  themeToggle.addEventListener("click", toggleTheme);
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });
}

function nextTaskId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function addTask(e) {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  tasks.unshift({ id: nextTaskId(), text, completed: false });
  taskInput.value = "";
  saveTasks();
  render();
}

function handleTaskClick(e) {
  const li = e.target.closest(".task-item");
  if (!li) return;
  const id = li.dataset.id;
  if (e.target.closest(".delete-btn")) {
    deleteTask(id);
  } else if (e.target.closest(".edit-btn")) {
    startEdit(li, id);
  } else if (e.target.closest(".task-checkbox")) {
    toggleTask(id);
  }
}

function handleTaskDoubleClick(e) {
  const li = e.target.closest(".task-item");
  if (!li || !e.target.closest(".task-text")) return;
  startEdit(li, li.dataset.id);
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  if (task.completed) {
    addToTodayLog(task.text);
  } else {
    removeFromTodayLog(task.text);
  }
  saveTasks();
  render();
}

function startEdit(li, id) {
  const task = tasks.find(t => t.id === id);
  if (!task || li.classList.contains("editing")) return;
  li.classList.add("editing");
  li.textContent = "";

  const form = document.createElement("form");
  form.className = "edit-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = task.text;
  input.maxLength = 200;

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "btn btn-save";
  saveBtn.textContent = "Save";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn-cancel";
  cancelBtn.textContent = "Cancel";

  form.append(input, saveBtn, cancelBtn);
  li.appendChild(form);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  form.addEventListener("submit", e => {
    e.preventDefault();
    const newText = input.value.trim();
    if (newText) {
      if (task.completed && newText !== task.text) {
        updateHistoryEntry(task.text, newText);
      }
      task.text = newText;
    }
    saveTasks();
    render();
  });
  cancelBtn.addEventListener("click", render);
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") render();
  });
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  filterBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  render();
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.dataset.theme === "dark";
  themeToggle.innerHTML = isDark ? ICONS.sun : ICONS.moon;
}

function checkDayRollover() {
  const today = getDateKey(new Date());
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  let reset = false;
  if (lastVisit && lastVisit !== today) {
    if (tasks.some(t => t.completed)) {
      tasks = tasks.filter(t => !t.completed);
      saveTasks();
      reset = true;
    }
    localStorage.setItem(LAST_VISIT_KEY, today);
  } else if (!lastVisit) {
    localStorage.setItem(LAST_VISIT_KEY, today);
  }
  return reset;
}

function pruneHistory() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffKey = getDateKey(cutoff);
  let changed = false;
  Object.keys(history).forEach(key => {
    if (key < cutoffKey) {
      delete history[key];
      changed = true;
    }
  });
  if (changed) saveHistory();
}

function addToTodayLog(text) {
  const key = getDateKey(new Date());
  if (!history[key]) history[key] = [];
  history[key].push(text);
  selectedDateKey = key;
  saveHistory();
}

function removeFromTodayLog(text) {
  const key = getDateKey(new Date());
  const items = history[key];
  if (!items) return;
  const idx = items.indexOf(text);
  if (idx !== -1) items.splice(idx, 1);
  if (items.length === 0) delete history[key];
  saveHistory();
}

function updateHistoryEntry(oldText, newText) {
  const key = getDateKey(new Date());
  const items = history[key];
  if (!items) return;
  const idx = items.indexOf(oldText);
  if (idx !== -1) items[idx] = newText;
  saveHistory();
}

function removeHistoryEntry(key, text) {
  const items = history[key];
  if (!items) return;
  const idx = items.indexOf(text);
  if (idx !== -1) items.splice(idx, 1);
  if (items.length === 0) delete history[key];
  saveHistory();
  renderDatePanel();
}

function renderDatePanel() {
  if (currentFilter !== "completed") {
    dateBars.parentElement.style.display = "none";
    dateDetails.style.display = "none";
  } else {
    if (dateBars.parentElement) dateBars.parentElement.style.display = "";
    dateDetails.style.display = "";
  }

  if (currentFilter !== "completed") return;

  dateBars.innerHTML = "";
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const counts = days.map(d => (history[getDateKey(d)] || []).length);
  const max = Math.max(1, ...counts);
  const weekSum = counts.reduce((a, b) => a + b, 0);

  days.forEach((d, i) => {
    const key = getDateKey(d);
    const count = counts[i];
    const col = document.createElement("button");
    col.type = "button";
    col.className = "date-col" + (i === days.length - 1 ? " today" : "") + (key === selectedDateKey ? " selected" : "");

    const countEl = document.createElement("span");
    countEl.className = "date-count";
    countEl.textContent = count > 0 ? count : "";

    const track = document.createElement("span");
    track.className = "date-bar-track";
    const bar = document.createElement("span");
    bar.className = "date-bar";
    bar.style.height = `${Math.round((count / max) * 100)}%`;
    track.appendChild(bar);

    const label = document.createElement("span");
    label.className = "date-label";
    label.textContent = d.toLocaleDateString(undefined, { weekday: "short" });

    col.append(countEl, track, label);
    col.title = `${d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} — ${count} task${count === 1 ? "" : "s"} completed`;
    col.addEventListener("click", () => {
      selectedDateKey = key;
      renderDatePanel();
    });
    dateBars.appendChild(col);
  });

  weekTotal.textContent = weekSum > 0 ? `${weekSum} done in 7 days` : "no activity yet";

  renderDateDetails();
}

function renderDateDetails() {
  if (currentFilter !== "completed") return;
  const parts = selectedDateKey.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const items = history[selectedDateKey] || [];

  dateDetails.innerHTML = "";

  const header = document.createElement("div");
  header.className = "date-details-header";
  header.textContent = `${date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} — ${items.length} task${items.length === 1 ? "" : "s"} completed`;
  dateDetails.appendChild(header);

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "date-details-empty";
    empty.textContent = "No tasks completed on this day.";
    dateDetails.appendChild(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "date-details-list";
  items.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
  dateDetails.appendChild(list);
}

function render() {
  const filtered = getFilteredTasks();
  if (taskList) {
    taskList.innerHTML = "";
    filtered.forEach(task => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.completed ? " completed" : "");
      li.dataset.id = task.id;
      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""} aria-label="Mark task complete">
        <span class="task-text">${escapeHtml(task.text)}</span>
        <div class="task-actions">
          <button class="action-btn edit-btn" aria-label="Edit task" title="Edit (or double-click text)">${ICONS.edit}</button>
          <button class="action-btn delete-btn" aria-label="Delete task" title="Delete">${ICONS.trash}</button>
        </div>
      `;
      taskList.appendChild(li);
    });
  }

  emptyState.style.display = filtered.length ? "none" : "block";
  emptyText.textContent = currentFilter === "completed"
    ? "No completed tasks yet."
    : currentFilter === "active"
      ? "No active tasks. Nice work!"
      : "No tasks to show. Add one above!";

  const remaining = tasks.filter(t => !t.completed).length;
  taskCount.textContent = `${remaining} task${remaining !== 1 ? "s" : ""} left`;

  clearCompletedBtn.style.display = tasks.some(t => t.completed) ? "" : "none";

  renderDatePanel();
}

function getFilteredTasks() {
  if (currentFilter === "all") return tasks.filter(t => !t.completed);
  if (currentFilter === "active") return tasks.filter(t => !t.completed);
  if (currentFilter === "completed") return tasks.filter(t => t.completed);
  return tasks;
}

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const migrated = {};
      Object.entries(data).forEach(([key, value]) => {
        migrated[key] = Array.isArray(value) ? value : [];
      });
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML.replace(/"/g, "&quot;");
}
