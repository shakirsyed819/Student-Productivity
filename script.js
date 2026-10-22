
"use strict";

// StudySpace - first version
// Data is saved in this browser using localStorage.

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const STORAGE_KEY = "studyspace_v1";

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday"
];

const TODAY = DAYS[new Date().getDay()];
const TODAY_DATE = dateString(new Date());

const DEFAULT_DATA = {
  classes: [
    { id: 1, title: "Python Programming", day: TODAY, time: "09:00", end: "10:00", room: "Room 201" },
    { id: 2, title: "Statistical Foundations", day: TODAY, time: "10:15", end: "11:15", room: "Room 105" },
    { id: 3, title: "Digital Logic Design", day: TODAY, time: "12:00", end: "13:00", room: "Lab 2" }
  ],
  tasks: [
    { id: 4, title: "Complete PLA and PAL assignment", subject: "Digital Logic Design", due: TODAY_DATE, priority: "High", completed: false },
    { id: 5, title: "Revise Python OOP concepts", subject: "Python Programming", due: addDays(TODAY_DATE, 2), priority: "Medium", completed: false },
    { id: 6, title: "Prepare statistics notes", subject: "Statistics", due: addDays(TODAY_DATE, 4), priority: "Low", completed: true }
  ],
  sessions: [
    { id: 7, title: "Revise Python classes", subject: "Python Programming", date: TODAY_DATE, time: "17:00", duration: 45, done: false },
    { id: 8, title: "Practice discrete mathematics", subject: "Discrete Mathematics", date: TODAY_DATE, time: "18:00", duration: 60, done: false }
  ],
  notes: [
    { id: 9, title: "Study goals", subject: "Personal", content: "Review today's lectures.\nComplete pending assignments.\nSpend time practising difficult concepts.", updated: TODAY_DATE }
  ],
  exams: [
    { id: 10, title: "Python Programming", date: addDays(TODAY_DATE, 14), subject: "Python Programming", preparation: 25 },
    { id: 11, title: "Statistical Foundations", date: addDays(TODAY_DATE, 21), subject: "Statistics", preparation: 10 }
  ]
};

function dateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return dateString(d);
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(DEFAULT_DATA);

    const parsed = JSON.parse(saved);

    for (const key of Object.keys(DEFAULT_DATA)) {
      if (!Array.isArray(parsed[key])) parsed[key] = [];
    }

    return parsed;
  } catch (error) {
    console.error("Could not load saved data:", error);
    return structuredClone(DEFAULT_DATA);
  }
}

let data = loadData();
let activeDay = TODAY;
let taskFilter = "all";
let currentPage = "dashboard";
let editing = null;
let toastTimer;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    showToast("Storage is full or unavailable. Export your data before continuing.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function daysUntil(value) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - today) / 86400000);
}

function emptyState(title, description) {
  return `<div class="empty-state"><strong>${escapeHTML(title)}</strong>${escapeHTML(description)}</div>`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function persistAndRender(message) {
  if (!saveData()) return;
  renderAll();
  if (message) showToast(message);
}

// ---------- Navigation ----------

function navigate(page) {
  const validPages = ["dashboard", "timetable", "assignments", "planner", "notes", "exams"];
  if (!validPages.includes(page)) page = "dashboard";

  currentPage = page;

  $$(".page-section").forEach(section => section.classList.add("hidden"));
  $(`#${page}Page`).classList.remove("hidden");

  $$(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  $("#currentSection").textContent =
    page.charAt(0).toUpperCase() + page.slice(1);

  $("#sidebar").classList.remove("open");

  if (location.hash !== `#${page}`) {
    history.replaceState(null, "", `#${page}`);
  }
}

$$(".nav-link").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    navigate(link.dataset.page);
  });
});

$$("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

$("#menuButton").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

document.addEventListener("click", event => {
  const sidebar = $("#sidebar");
  if (
    window.innerWidth <= 760 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(event.target) &&
    !$("#menuButton").contains(event.target)
  ) {
    sidebar.classList.remove("open");
  }
});

// ---------- Date and dashboard ----------

$("#todayDate").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short"
});

const hour = new Date().getHours();
$("#greeting").textContent =
  hour < 12 ? "GOOD MORNING" :
  hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";

function renderDashboard() {
  const pending = data.tasks.filter(task => !task.completed);
  const completed = data.tasks.filter(task => task.completed);
  const todaySessions = data.sessions.filter(
    session => session.date === TODAY_DATE && !session.done
  );
  const upcoming = data.exams.filter(exam => daysUntil(exam.date) >= 0);

  $("#pendingStat").textContent = pending.length;
  $("#completedStat").textContent = completed.length;
  $("#sessionsStat").textContent = todaySessions.length;
  $("#examsStat").textContent = upcoming.length;

  const percentage = data.tasks.length
    ? Math.round(completed.length / data.tasks.length * 100)
    : 0;

  $("#progressPercent").textContent = `${percentage}%`;
  $("#progressCircle").style.background =
    `conic-gradient(var(--primary) ${percentage}%, #eeecf9 ${percentage}%)`;
  $("#progressBar").style.width = `${percentage}%`;

  $("#progressSummary").textContent =
    percentage === 100 && data.tasks.length
      ? "Everything completed!"
      : percentage >= 50
        ? "You're making progress!"
        : "Keep building momentum";

  $("#progressDescription").textContent = data.tasks.length
    ? `${completed.length} of ${data.tasks.length} assignments completed.`
    : "Add your first task to track your progress.";

  const classes = data.classes
    .filter(item => item.day === TODAY)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 4);

  $("#todayClasses").innerHTML = classes.length
    ? classes.map(item => `
      <div class="item-row">
        <span class="item-marker blue-marker"></span>
        <div class="item-main">
          <strong>${escapeHTML(item.title)}</strong>
          <small>${escapeHTML(formatTime(item.time))}–${escapeHTML(formatTime(item.end))} · ${escapeHTML(item.room || "Room not set")}</small>
        </div>
      </div>
    `).join("")
    : emptyState("No classes scheduled", "Add classes in your timetable.");

  $("#dashboardTasks").innerHTML = pending.length
    ? pending.slice().sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4)
      .map(task => taskRow(task, true)).join("")
    : emptyState("You're all caught up!", "Add an assignment whenever you need.");

  $("#dashboardExams").innerHTML = upcoming.length
    ? upcoming.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
      .map(exam => `
        <div class="item-row">
          <span class="item-marker orange-marker"></span>
          <div class="item-main">
            <strong>${escapeHTML(exam.title)}</strong>
            <small>${escapeHTML(formatDate(exam.date))}</small>
          </div>
          <span class="status-badge">${daysUntil(exam.date) === 0 ? "Today" : `${daysUntil(exam.date)}d left`}</span>
        </div>
      `).join("")
    : emptyState("No upcoming exams", "Add your exam dates to start a countdown.");
}

// ---------- Assignments ----------

function taskRow(task, compact = false) {
  const due = daysUntil(task.due);
  const dueText = due === null ? "No deadline" :
    due < 0 ? `Overdue by ${Math.abs(due)} day(s)` :
    due === 0 ? "Due today" :
    due === 1 ? "Due tomorrow" : `Due ${formatDate(task.due)}`;

  const priorityClass = task.priority === "High"
    ? "orange-marker" : task.priority === "Low" ? "green-marker" : "";

  return `
    <div class="item-row">
      <button class="check-button ${task.completed ? "checked" : ""}"
        data-action="toggle-task" data-id="${task.id}"
        aria-label="${task.completed ? "Mark pending" : "Mark completed"}"
        title="Toggle completion">${task.completed ? "✓" : ""}</button>
      <div class="item-main">
        <strong class="${task.completed ? "done-text" : ""}">${escapeHTML(task.title)}</strong>
        <small>${escapeHTML(task.subject)} · ${escapeHTML(dueText)} · ${escapeHTML(task.priority)} priority</small>
      </div>
      ${compact ? "" : `<div class="row-actions">
        <button class="icon-button" data-action="edit-task" data-id="${task.id}" aria-label="Edit task">✎</button>
        <button class="icon-button danger" data-action="delete-task" data-id="${task.id}" aria-label="Delete task">×</button>
      </div>`}
    </div>`;
}

function renderTasks() {
  let tasks = [...data.tasks];

  if (taskFilter === "pending") tasks = tasks.filter(task => !task.completed);
  if (taskFilter === "completed") tasks = tasks.filter(task => task.completed);

  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    return a.due.localeCompare(b.due);
  });

  $("#taskList").innerHTML = tasks.length
    ? tasks.map(task => taskRow(task)).join("")
    : emptyState("No assignments here", "Add a task to organise your coursework.");
}

$("#taskFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  taskFilter = button.dataset.filter;
  $$("#taskFilters .filter").forEach(item =>
    item.classList.toggle("active", item === button)
  );
  renderTasks();
});

// ---------- Timetable ----------

function renderDayFilters() {
  $("#dayFilters").innerHTML = DAYS.map(day => `
    <button class="filter ${day === activeDay ? "active" : ""}"
      data-day="${day}">${day.slice(0, 3)}</button>
  `).join("");
}

function renderClasses() {
  const classes = data.classes
    .filter(item => item.day === activeDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  $("#classList").innerHTML = classes.length
    ? classes.map(item => `
      <div class="item-row">
        <span class="item-marker blue-marker"></span>
        <div class="item-main">
          <strong>${escapeHTML(item.title)}</strong>
          <small>${escapeHTML(item.day)} · ${escapeHTML(formatTime(item.time))}–${escapeHTML(formatTime(item.end))} · ${escapeHTML(item.room || "Room not set")}</small>
        </div>
        <div class="row-actions">
          <button class="icon-button" data-action="edit-class" data-id="${item.id}" aria-label="Edit class">✎</button>
          <button class="icon-button danger" data-action="delete-class" data-id="${item.id}" aria-label="Delete class">×</button>
        </div>
      </div>
    `).join("")
    : emptyState("No classes for " + activeDay, "Add a class to build your timetable.");
}

$("#dayFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-day]");
  if (!button) return;
  activeDay = button.dataset.day;
  renderDayFilters();
  renderClasses();
});

// ---------- Study planner ----------

function renderSessions() {
  const sessions = [...data.sessions].sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  );

  $("#sessionList").innerHTML = sessions.length
    ? sessions.map(session => `
      <div class="item-row">
        <button class="check-button ${session.done ? "checked" : ""}"
          data-action="toggle-session" data-id="${session.id}"
          aria-label="Toggle session completion">${session.done ? "✓" : ""}</button>
        <div class="item-main">
          <strong class="${session.done ? "done-text" : ""}">${escapeHTML(session.title)}</strong>
          <small>${escapeHTML(session.subject)} · ${escapeHTML(formatDate(session.date))} · ${escapeHTML(formatTime(session.time))} · ${session.duration} minutes</small>
        </div>
        <div class="row-actions">
          <button class="icon-button" data-action="edit-session" data-id="${session.id}" aria-label="Edit session">✎</button>
          <button class="icon-button danger" data-action="delete-session" data-id="${session.id}" aria-label="Delete session">×</button>
        </div>
      </div>
    `).join("")
    : emptyState("No study sessions yet", "Plan a focused session for a subject.");
}

// ---------- Notes ----------

function renderNotes() {
  $("#notesList").innerHTML = data.notes.length
    ? [...data.notes].sort((a, b) => b.updated.localeCompare(a.updated))
      .map(note => `
        <article class="note-card">
          <span class="note-tag">${escapeHTML(note.subject || "General")}</span>
          <h3>${escapeHTML(note.title)}</h3>
          <p>${escapeHTML(note.content)}</p>
          <div class="note-footer">
            <span>Updated ${escapeHTML(formatDate(note.updated))}</span>
            <div class="row-actions">
              <button class="icon-button" data-action="edit-note" data-id="${note.id}" aria-label="Edit note">✎</button>
              <button class="icon-button danger" data-action="delete-note" data-id="${note.id}" aria-label="Delete note">×</button>
            </div>
          </div>
        </article>
      `).join("")
    : emptyState("Your notes start here", "Create a note to save important concepts.");
}

// ---------- Exams ----------

function renderExams() {
  const exams = [...data.exams].sort((a, b) => a.date.localeCompare(b.date));

  $("#examList").innerHTML = exams.length
    ? exams.map(exam => {
      const remaining = daysUntil(exam.date);
      const countText = remaining === null ? "Date not set" :
        remaining < 0 ? `${Math.abs(remaining)} days ago` :
        remaining === 0 ? "Today!" : `${remaining} days`;

      return `
        <article class="exam-card">
          <span class="note-tag">${escapeHTML(exam.subject)}</span>
          <h3>${escapeHTML(exam.title)}</h3>
          <p>Exam date: ${escapeHTML(formatDate(exam.date))}</p>
          <div class="exam-count">${escapeHTML(countText)}${remaining >= 0 ? '<small> left</small>' : ""}</div>
          <div class="item-main">
            <small>Preparation: ${exam.preparation}%</small>
            <div class="progress-track"><span style="width:${exam.preparation}%"></span></div>
          </div>
          <div class="row-actions" style="justify-content:flex-end;margin-top:18px">
            <button class="button secondary" data-action="edit-exam" data-id="${exam.id}">Edit</button>
            <button class="button secondary" data-action="delete-exam" data-id="${exam.id}">Delete</button>
          </div>
        </article>
      `;
    }).join("")
    : emptyState("No exams added", "Add an exam to see the countdown.");
}

// ---------- Modal and forms ----------

const modal = $("#modal");
const form = $("#itemForm");
const fields = $("#formFields");

const schemas = {
  class: {
    title: "Class",
    fields: [
      { name: "title", label: "Subject / class name", required: true, placeholder: "e.g. Python Programming", full: true },
      { name: "day", label: "Day", type: "select", required: true, options: DAYS.map(day => ({ value: day, label: day })) },
      { name: "time", label: "Start time", type: "time", required: true },
      { name: "end", label: "End time", type: "time", required: true },
      { name: "room", label: "Room / location", placeholder: "e.g. Room 201", full: true }
    ]
  },
  task: {
    title: "Assignment",
    fields: [
      { name: "title", label: "Assignment title", required: true, placeholder: "What do you need to do?", full: true },
      { name: "subject", label: "Subject", required: true, placeholder: "e.g. Statistics" },
      { name: "due", label: "Deadline", type: "date", required: true },
      { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"].map(x => ({ value: x, label: x })) }
    ]
  },
  session: {
    title: "Study session",
    fields: [
      { name: "title", label: "Study goal", required: true, placeholder: "e.g. Revise linked lists", full: true },
      { name: "subject", label: "Subject", required: true, placeholder: "e.g. Data Structures" },
      { name: "date", label: "Study date", type: "date", required: true },
      { name: "time", label: "Start time", type: "time", required: true },
      { name: "duration", label: "Duration (minutes)", type: "number", required: true, min: 5, max: 600, value: 45 }
    ]
  },
  note: {
    title: "Note",
    fields: [
      { name: "title", label: "Note title", required: true, placeholder: "e.g. Python OOP", full: true },
      { name: "subject", label: "Subject / category", placeholder: "e.g. Python", full: true },
      { name: "content", label: "Your notes", type: "textarea", required: true, placeholder: "Write your important points here...", full: true }
    ]
  },
  exam: {
    title: "Exam",
    fields: [
      { name: "title", label: "Exam name", required: true, placeholder: "e.g. Python Programming", full: true },
      { name: "subject", label: "Subject", required: true, placeholder: "e.g. Python" },
      { name: "date", label: "Exam date", type: "date", required: true },
      { name: "preparation", label: "Preparation (%)", type: "number", required: true, min: 0, max: 100, value: 0 }
    ]
  }
};

function openModal(type, id = null) {
  const schema = schemas[type];
  if (!schema) return;

  editing = { type, id };
  const existing = id === null ? {} : data[`${type}s`].find(item => item.id === id);

  if (id !== null && !existing) {
    showToast("This item could not be found.");
    return;
  }

  $("#modalTitle").textContent = `${id === null ? "Add" : "Edit"} ${schema.title.toLowerCase()}`;

  fields.innerHTML = schema.fields.map(field => {
    const value = existing?.[field.name] ?? field.value ?? "";

    let input;
    if (field.type === "select") {
      input = `<select id="field-${field.name}" name="${field.name}" ${field.required ? "required" : ""}>
        ${field.options.map(option => `
          <option value="${escapeHTML(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHTML(option.label)}</option>
        `).join("")}
      </select>`;
    } else if (field.type === "textarea") {
      input = `<textarea id="field-${field.name}" name="${field.name}" placeholder="${escapeHTML(field.placeholder || "")}" ${field.required ? "required" : ""}>${escapeHTML(value)}</textarea>`;
    } else {
      input = `<input id="field-${field.name}" name="${field.name}"
        type="${field.type || "text"}" value="${escapeHTML(value)}"
        placeholder="${escapeHTML(field.placeholder || "")}"
        ${field.required ? "required" : ""}
        ${field.min !== undefined ? `min="${field.min}"` : ""}
        ${field.max !== undefined ? `max="${field.max}"` : ""}>`;
    }

    return `<div class="field ${field.full ? "full" : ""}">
      <label for="field-${field.name}">${escapeHTML(field.label)}</label>${input}
    </div>`;
  }).join("");

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  fields.querySelector("input, select, textarea")?.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  editing = null;
  form.reset();
}

$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!editing) return;

  const { type, id } = editing;
  const values = Object.fromEntries(new FormData(form).entries());

  const record = {};
  for (const key of Object.keys(values)) {
    record[key] = values[key].trim();
  }

  if (type === "session" || type === "exam") {
    record[type === "session" ? "duration" : "preparation"] =
      Number(record[type === "session" ? "duration" : "preparation"]);
  }

  if (type === "exam") {
    record.preparation = Math.min(100, Math.max(0, record.preparation));
  }

  if (type === "session") {
    record.duration = Math.min(600, Math.max(5, record.duration));
  }

  const collection = `${type}s`;
  const previous = id === null ? null : data[collection].find(item => item.id === id);

  record.id = id === null ? Date.now() : id;

  if (previous) {
    // Preserve completion status when editing.
    if (type === "task") record.completed = previous.completed;
    if (type === "session") record.done = previous.done;
    data[collection] = data[collection].map(item => item.id === id ? record : item);
  } else {
    if (type === "task") record.completed = false;
    if (type === "session") record.done = false;
    if (type === "note") record.updated = TODAY_DATE;
    data[collection].push(record);
  }

  closeModal();
  persistAndRender(id === null ? "Item added successfully!" : "Changes saved!");
});

// ---------- Add buttons ----------

$("#addClass").addEventListener("click", () => openModal("class"));
$("#addTask").addEventListener("click", () => openModal("task"));
$("#quickAdd").addEventListener("click", () => openModal("task"));
$("#addSession").addEventListener("click", () => openModal("session"));
$("#addNote").addEventListener("click", () => openModal("note"));
$("#addExam").addEventListener("click", () => openModal("exam"));

// ---------- Edit, delete and completion actions ----------

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id: rawId } = button.dataset;
  const id = Number(rawId);

  const actions = {
    "edit-class": ["class", "classes"],
    "edit-task": ["task", "tasks"],
    "edit-session": ["session", "sessions"],
    "edit-note": ["note", "notes"],
    "edit-exam": ["exam", "exams"]
  };

  if (actions[action]) {
    openModal(actions[action][0], id);
    return;
  }

  if (action === "toggle-task") {
    const task = data.tasks.find(item => item.id === id);
    if (!task) return;
    task.completed = !task.completed;
    persistAndRender(task.completed ? "Assignment completed!" : "Assignment marked pending.");
    return;
  }

  if (action === "toggle-session") {
    const session = data.sessions.find(item => item.id === id);
    if (!session) return;
    session.done = !session.done;
    persistAndRender(session.done ? "Study session completed!" : "Session marked pending.");
    return;
  }

  const deleteCollections = {
    "delete-class": "classes",
    "delete-task": "tasks",
    "delete-session": "sessions",
    "delete-note": "notes",
    "delete-exam": "exams"
  };

  if (deleteCollections[action]) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const collection = deleteCollections[action];
    data[collection] = data[collection].filter(item => item.id !== id);
    persistAndRender("Item deleted.");
  }
});

// ---------- Daily reminder ----------

const reminders = [
  "Progress comes from consistency, not perfection.",
  "You don't need to finish everything today. Start with one task.",
  "A focused 30 minutes can make a real difference.",
  "Every difficult topic becomes easier with practice.",
  "Your future self will thank you for the effort you make today."
];

$("#newReminder").addEventListener("click", () => {
  const current = $("#reminderText").textContent;
  const options = reminders.filter(text => text !== current);
  $("#reminderText").textContent =
    options[Math.floor(Math.random() * options.length)];
});

