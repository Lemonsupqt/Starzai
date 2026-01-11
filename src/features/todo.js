/**
 * features/todo.js
 * Auto-extracted from index.js
 */

// =====================
// ADVANCED TODO SYSTEM
// Lines 6748-7482 from original index.js
// =====================

// =====================
// ADVANCED TODO/CHECKLIST SYSTEM
// =====================

// Priority emoji mapping
const PRIORITY_EMOJI = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
  none: "⚪"
};

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None"
};

// Category emoji mapping
const CATEGORY_EMOJI = {
  work: "💼",
  personal: "👤",
  shopping: "🛒",
  health: "💪",
  learning: "📚",
  finance: "💰",
  home: "🏠",
  social: "👥",
  travel: "✈️",
  other: "📌"
};

// Get category emoji
function getCategoryEmoji(category) {
  if (!category) return "📌";
  return CATEGORY_EMOJI[category.toLowerCase()] || "📌";
}

// Get task by ID
function getTaskById(userId, taskId) {
  const userTodos = getUserTodos(userId);
  return userTodos.tasks.find(t => t.id === taskId) || null;
}

// Update a task's properties
function updateTask(userId, taskId, updates) {
  const userTodos = getUserTodos(userId);
  const task = userTodos.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  if (updates.text !== undefined) task.text = updates.text;
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.category !== undefined) task.category = updates.category;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
  
  saveTodos();
  return task;
}

// Check if a due date is overdue
function isOverdue(dueDate) {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

// Get user's completion streak
function getCompletionStreak(userId) {
  const userTodos = getUserTodos(userId);
  return userTodos.stats?.currentStreak || 0;
}

// Category emoji mapping
const DEFAULT_CATEGORIES = {
  personal: "👤",
  work: "💼",
  shopping: "🛒",
  health: "💪",
  learning: "📚",
  finance: "💰",
  home: "🏠",
  other: "📌"
};

// Get user's todo list
function getUserTodos(userId) {
  const id = String(userId);
  if (!todosDb.todos[id]) {
    todosDb.todos[id] = {
      tasks: [],
      categories: { ...DEFAULT_CATEGORIES },
      settings: {
        defaultCategory: "personal",
        defaultPriority: "none",
        showCompleted: true,
        sortBy: "created"
      },
      stats: {
        totalCreated: 0,
        totalCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null
      }
    };
    saveTodos();
  }
  return todosDb.todos[id];
}

// Generate unique task ID
function generateTaskId() {
  return crypto.randomBytes(4).toString("hex");
}

// Create a new task
function createTask(userId, taskData) {
  const userTodos = getUserTodos(userId);
  const task = {
    id: generateTaskId(),
    text: taskData.text,
    completed: false,
    priority: taskData.priority || userTodos.settings.defaultPriority,
    category: taskData.category || userTodos.settings.defaultCategory,
    dueDate: taskData.dueDate || null,
    dueTime: taskData.dueTime || null,
    recurring: taskData.recurring || null,
    subtasks: [],
    notes: taskData.notes || "",
    createdAt: new Date().toISOString(),
    completedAt: null,
    parentId: taskData.parentId || null
  };
  
  if (task.parentId) {
    const parentTask = userTodos.tasks.find(t => t.id === task.parentId);
    if (parentTask) {
      parentTask.subtasks.push(task);
    }
  } else {
    userTodos.tasks.push(task);
  }
  
  userTodos.stats.totalCreated++;
  saveTodos();
  return task;
}

// Toggle task completion
function toggleTaskCompletion(userId, taskId) {
  const userTodos = getUserTodos(userId);
  
  let task = userTodos.tasks.find(t => t.id === taskId);
  let isSubtask = false;
  
  if (!task) {
    for (const t of userTodos.tasks) {
      const subtask = t.subtasks?.find(st => st.id === taskId);
      if (subtask) {
        task = subtask;
        isSubtask = true;
        break;
      }
    }
  }
  
  if (!task) return null;
  
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  
  if (task.completed) {
    userTodos.stats.totalCompleted++;
    
    const today = new Date().toISOString().slice(0, 10);
    const lastCompleted = userTodos.stats.lastCompletedDate;
    
    if (!lastCompleted) {
      userTodos.stats.currentStreak = 1;
    } else {
      const lastDate = new Date(lastCompleted);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        userTodos.stats.currentStreak++;
      } else if (diffDays > 1) {
        userTodos.stats.currentStreak = 1;
      }
    }
    
    userTodos.stats.lastCompletedDate = today;
    userTodos.stats.longestStreak = Math.max(
      userTodos.stats.longestStreak,
      userTodos.stats.currentStreak
    );
    
    // Handle recurring tasks
    if (task.recurring && !isSubtask) {
      const newTask = { ...task };
      newTask.id = generateTaskId();
      newTask.completed = false;
      newTask.completedAt = null;
      newTask.createdAt = new Date().toISOString();
      
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const interval = task.recurring.interval || 1;
        
        switch (task.recurring.type) {
          case 'daily':
            dueDate.setDate(dueDate.getDate() + interval);
            break;
          case 'weekly':
            dueDate.setDate(dueDate.getDate() + (7 * interval));
            break;
          case 'monthly':
            dueDate.setMonth(dueDate.getMonth() + interval);
            break;
        }
        newTask.dueDate = dueDate.toISOString().slice(0, 10);
      }
      
      userTodos.tasks.push(newTask);
    }
  }
  
  saveTodos();
  return task;
}

// Delete a task
function deleteTaskById(userId, taskId) {
  const userTodos = getUserTodos(userId);
  
  const index = userTodos.tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    userTodos.tasks.splice(index, 1);
    saveTodos();
    return true;
  }
  
  for (const task of userTodos.tasks) {
    const subIndex = task.subtasks?.findIndex(st => st.id === taskId);
    if (subIndex !== -1) {
      task.subtasks.splice(subIndex, 1);
      saveTodos();
      return true;
    }
  }
  
  return false;
}

// Get tasks with filters
function getFilteredTasks(userId, filters = {}) {
  const userTodos = getUserTodos(userId);
  let tasks = [...userTodos.tasks];
  
  if (!userTodos.settings.showCompleted && !filters.showCompleted) {
    tasks = tasks.filter(t => !t.completed);
  }
  
  if (filters.category) {
    tasks = tasks.filter(t => t.category === filters.category);
  }
  
  if (filters.priority) {
    tasks = tasks.filter(t => t.priority === filters.priority);
  }
  
  if (filters.dueFilter) {
    const today = new Date().toISOString().slice(0, 10);
    
    switch (filters.dueFilter) {
      case 'today':
        tasks = tasks.filter(t => t.dueDate === today);
        break;
      case 'overdue':
        tasks = tasks.filter(t => t.dueDate && t.dueDate < today && !t.completed);
        break;
      case 'upcoming':
        tasks = tasks.filter(t => t.dueDate && t.dueDate > today);
        break;
      case 'noduedate':
        tasks = tasks.filter(t => !t.dueDate);
        break;
    }
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    tasks = tasks.filter(t => 
      t.text.toLowerCase().includes(searchLower) ||
      t.notes?.toLowerCase().includes(searchLower)
    );
  }
  
  const sortBy = filters.sortBy || userTodos.settings.sortBy;
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      case 'category':
        return (a.category || '').localeCompare(b.category || '');
      case 'created':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  
  return tasks;
}

// Format task for display
function formatTaskDisplay(task, userTodos, showIndex = true, index = 0) {
  const checkbox = task.completed ? "✅" : "⬜";
  const priority = PRIORITY_EMOJI[task.priority] || "";
  const category = userTodos.categories[task.category] || "📌";
  
  let text = `${checkbox} `;
  if (showIndex) text += `*${index}.* `;
  if (priority && task.priority !== 'none') text += `${priority} `;
  
  if (task.completed) {
    text += `~${task.text}~`;
  } else {
    text += task.text;
  }
  
  if (task.dueDate) {
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = task.dueDate < today && !task.completed;
    const isToday = task.dueDate === today;
    
    if (isOverdue) {
      text += ` ⚠️ _Overdue_`;
    } else if (isToday) {
      text += ` 📅 _Today_`;
    } else {
      text += ` 📅 _${task.dueDate}_`;
    }
  }
  
  if (task.recurring) {
    text += ` 🔄`;
  }
  
  text += ` ${category}`;
  
  return text;
}

// Build todo list message
function buildTodoListMessage(userId, page = 0, filters = {}) {
  const userTodos = getUserTodos(userId);
  const tasks = getFilteredTasks(userId, filters);
  const pageSize = 8;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const totalTasks = userTodos.tasks.length;
  const completedTasks = userTodos.tasks.filter(t => t.completed).length;
  const todayDate = new Date().toISOString().slice(0, 10);
  const overdueTasks = userTodos.tasks.filter(t => 
    t.dueDate && t.dueDate < todayDate && !t.completed
  ).length;
  
  let message = [
    "✅ *Starz Check - Personal*",
    "",
    `📊 *Progress:* ${completedTasks}/${totalTasks} completed`,
  ];
  
  if (overdueTasks > 0) {
    message.push(`⚠️ *Overdue:* ${overdueTasks} task${overdueTasks > 1 ? 's' : ''}`);
  }
  
  if (userTodos.stats.currentStreak > 0) {
    message.push(`🔥 *Streak:* ${userTodos.stats.currentStreak} day${userTodos.stats.currentStreak > 1 ? 's' : ''}`);
  }
  
  message.push("");
  
  if (pageTasks.length === 0) {
    if (filters.category || filters.priority || filters.dueFilter || filters.search) {
      message.push("_No tasks match your filters._");
    } else {
      message.push("_No tasks yet! Tap ➕ Add to create one._");
    }
  } else {
    message.push("_Tap a task to toggle • Double-tap for options_");
  }
  
  if (totalPages > 1) {
    message.push("");
    message.push(`_Page ${currentPage + 1}/${totalPages}_`);
  }
  
  return message.join("\n");
}

// Build todo keyboard
function buildTodoKeyboard(userId, page = 0, filters = {}) {
  const userTodos = getUserTodos(userId);
  const tasks = getFilteredTasks(userId, filters);
  const pageSize = 8;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const kb = new InlineKeyboard();
  
  // Task buttons with text (one per row, like inline mode)
  pageTasks.forEach(task => {
    if (!task || !task.text) return; // Skip invalid tasks
    
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 25) + (task.text.length > 25 ? "..." : "");
    
    // Category emoji
    const catEmoji = userTodos.categories?.[task.category]?.emoji || "👤";
    
    // Priority indicator
    let priInd = "";
    if (task.priority === "high") priInd = " 🔴";
    else if (task.priority === "medium") priInd = " 🟡";
    
    // Due indicator
    let dueInd = "";
    if (task.dueDate) {
      const today = new Date().toISOString().slice(0, 10);
      if (task.dueDate < today && !task.completed) dueInd = " ⚠️";
      else if (task.dueDate === today) dueInd = " 📅";
    }
    
    kb.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `todo_toggle:${task.id}`);
    kb.row();
  });
  
  // Pagination
  if (totalPages > 1) {
    if (currentPage > 0) {
      kb.text("◀️", `todo_page:${currentPage - 1}`);
    }
    kb.text(`${currentPage + 1}/${totalPages}`, "todo_noop");
    if (currentPage < totalPages - 1) {
      kb.text("▶️", `todo_page:${currentPage + 1}`);
    }
    kb.row();
  }
  
  // Action buttons - simplified to match inline style
  kb.text("➕ Add", "todo_add")
    .text("🔍 Filter", "todo_filter")
    .text("👥 Collab", "collab_list")
    .row()
    .text("🗑️ Clear Done", "todo_clear_done")
    .text("« Menu", "menu_back");
  
  return kb;
}

// Build filter keyboard
function buildTodoFilterKeyboard(userId) {
  const userTodos = getUserTodos(userId);
  const kb = new InlineKeyboard();
  
  kb.text("📅 Today", "todo_filter_due:today")
    .text("⚠️ Overdue", "todo_filter_due:overdue")
    .row()
    .text("🔜 Upcoming", "todo_filter_due:upcoming")
    .text("📭 No Date", "todo_filter_due:noduedate")
    .row();
  
  kb.text("🔴 High", "todo_filter_priority:high")
    .text("🟡 Med", "todo_filter_priority:medium")
    .text("🟢 Low", "todo_filter_priority:low")
    .row();
  
  const categories = Object.entries(userTodos.categories).slice(0, 4);
  categories.forEach(([key, emoji]) => {
    kb.text(`${emoji}`, `todo_filter_category:${key}`);
  });
  kb.row();
  
  const showCompleted = userTodos.settings.showCompleted;
  kb.text(showCompleted ? "👁️ Hide Done" : "👁️ Show Done", "todo_toggle_completed")
    .row();
  
  kb.text("🔄 Clear Filters", "todo_clear_filters")
    .text("« Back", "todo_list")
    .row();
  
  return kb;
}

// Build settings keyboard
function buildTodoSettingsKeyboard(userId) {
  const userTodos = getUserTodos(userId);
  const kb = new InlineKeyboard();
  
  kb.text("📊 Sort by:", "todo_noop").row();
  
  const sortOptions = [
    { key: 'created', label: '🕐' },
    { key: 'priority', label: '🎯' },
    { key: 'dueDate', label: '📅' },
    { key: 'category', label: '📁' }
  ];
  
  sortOptions.forEach(opt => {
    const isActive = userTodos.settings.sortBy === opt.key;
    kb.text(`${isActive ? '✓ ' : ''}${opt.label}`, `todo_sort:${opt.key}`);
  });
  kb.row();
  
  kb.text("Default Priority:", "todo_noop").row();
  ['none', 'low', 'medium', 'high'].forEach(p => {
    const isActive = userTodos.settings.defaultPriority === p;
    kb.text(`${isActive ? '✓ ' : ''}${PRIORITY_EMOJI[p]}`, `todo_default_priority:${p}`);
  });
  kb.row();
  
  kb.text("📊 View Stats", "todo_stats").row();
  
  kb.text("« Back to Tasks", "todo_list");
  
  return kb;
}

// Build stats message
function buildTodoStatsMessage(userId) {
  const userTodos = getUserTodos(userId);
  const stats = userTodos.stats;
  const tasks = userTodos.tasks;
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const categoryStats = {};
  tasks.forEach(t => {
    const cat = t.category || 'other';
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, completed: 0 };
    categoryStats[cat].total++;
    if (t.completed) categoryStats[cat].completed++;
  });
  
  const priorityStats = { high: 0, medium: 0, low: 0, none: 0 };
  tasks.filter(t => !t.completed).forEach(t => {
    priorityStats[t.priority || 'none']++;
  });
  
  let message = [
    "📊 *Task Statistics*",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `📋 *Total Tasks:* ${totalTasks}`,
    `✅ *Completed:* ${completedTasks}`,
    `⏳ *Pending:* ${pendingTasks}`,
    `📈 *Completion Rate:* ${completionRate}%`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `🔥 *Current Streak:* ${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`,
    `🏆 *Longest Streak:* ${stats.longestStreak} day${stats.longestStreak !== 1 ? 's' : ''}`,
    `📅 *All-time Completed:* ${stats.totalCompleted}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "*Pending by Priority:*",
    `${PRIORITY_EMOJI.high} High: ${priorityStats.high}`,
    `${PRIORITY_EMOJI.medium} Medium: ${priorityStats.medium}`,
    `${PRIORITY_EMOJI.low} Low: ${priorityStats.low}`,
  ];
  
  if (Object.keys(categoryStats).length > 0) {
    message.push("");
    message.push("*By Category:*");
    Object.entries(categoryStats).forEach(([cat, s]) => {
      const emoji = userTodos.categories[cat] || "📌";
      message.push(`${emoji} ${cat}: ${s.completed}/${s.total}`);
    });
  }
  
  return message.join("\n");
}

// Pending task input tracking
const pendingTodoInput = new Map();

// Current filter state per user
const todoFilters = new Map();

function getTodoFilters(userId) {
  return todoFilters.get(String(userId)) || {};
}

function setTodoFilters(userId, filters) {
  todoFilters.set(String(userId), filters);
}

function clearTodoFilters(userId) {
  todoFilters.delete(String(userId));
}

// Filter todos based on filters
function filterTodos(tasks, filters) {
  if (!tasks || !Array.isArray(tasks)) return [];
  if (!filters || Object.keys(filters).length === 0) return tasks;
  
  return tasks.filter(task => {
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.category && task.category !== filters.category) return false;
    if (filters.completed !== undefined && task.completed !== filters.completed) return false;
    if (filters.hasDueDate && !task.dueDate) return false;
    return true;
  });
}

// Sort todos based on sort option
function sortTodos(tasks, sortBy) {
  if (!tasks || !Array.isArray(tasks)) return [];
  
  const sorted = [...tasks];
  
  switch (sortBy) {
    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2, null: 3 };
      sorted.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
      break;
    case 'dueDate':
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      break;
    case 'category':
      sorted.sort((a, b) => (a.category || 'zzz').localeCompare(b.category || 'zzz'));
      break;
    case 'created':
    default:
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }
  
  return sorted;
}

// Parse due date from natural language
function parseTodoDueDate(input) {
  const lower = input.toLowerCase().trim();
  const today = new Date();
  
  if (lower === 'today') {
    return today.toISOString().slice(0, 10);
  }
  if (lower === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return today.toISOString().slice(0, 10);
  }
  if (lower === 'nextweek' || lower === 'next week') {
    today.setDate(today.getDate() + 7);
    return today.toISOString().slice(0, 10);
  }
  
  const dateMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    return input;
  }
  
  const shortMatch = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const month = parseInt(shortMatch[1]);
    const day = parseInt(shortMatch[2]);
    const year = today.getFullYear();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  return null;
}

// Parse task from text (supports inline options)
// Format: task text #category !priority @date
function parseTaskText(text) {
  const result = {
    text: text,
    category: null,
    priority: null,
    dueDate: null
  };
  
  const categoryMatch = text.match(/#(\w+)/);
  if (categoryMatch) {
    result.category = categoryMatch[1].toLowerCase();
    result.text = result.text.replace(/#\w+/, '').trim();
  }
  
  const priorityMatch = text.match(/!(high|med|medium|low|h|m|l)/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    if (p === 'h' || p === 'high') result.priority = 'high';
    else if (p === 'm' || p === 'med' || p === 'medium') result.priority = 'medium';
    else if (p === 'l' || p === 'low') result.priority = 'low';
    result.text = result.text.replace(/!(high|med|medium|low|h|m|l)/i, '').trim();
  }
  
  const dateMatch = text.match(/@(\S+)/);
  if (dateMatch) {
    result.dueDate = parseTodoDueDate(dateMatch[1]);
    result.text = result.text.replace(/@\S+/, '').trim();
  }
  
  return result;
}


