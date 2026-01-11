/**
 * features/collab-todo.js
 * Auto-extracted from index.js
 */

// =====================
// COLLABORATIVE TODO SYSTEM
// Lines 7483-8905 from original index.js
// =====================


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

// =====================
// COLLABORATIVE TODO SYSTEM (Starz Check - Collab)
// =====================

// Generate unique list ID
function generateCollabListId() {
  return crypto.randomBytes(4).toString("hex");
}

// Generate join code (shorter, user-friendly)
function generateJoinCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// Get all collab lists for a user
function getCollabListsForUser(userId) {
  const id = String(userId);
  if (!collabTodosDb.userLists) collabTodosDb.userLists = {};
  if (!collabTodosDb.userLists[id]) collabTodosDb.userLists[id] = [];
  
  // Return actual list objects
  return collabTodosDb.userLists[id]
    .map(listId => collabTodosDb.lists[listId])
    .filter(Boolean);
}

// Get a specific collab list by ID
function getCollabList(listId) {
  return collabTodosDb.lists?.[listId] || null;
}

// Get a collab list by join code
function getCollabListByCode(code) {
  const upperCode = code.toUpperCase();
  return Object.values(collabTodosDb.lists || {}).find(l => l.joinCode === upperCode) || null;
}

// Create a new collaborative list
function createCollabList(userId, name, description = "") {
  const listId = generateCollabListId();
  const joinCode = generateJoinCode();
  
  if (!collabTodosDb.lists) collabTodosDb.lists = {};
  if (!collabTodosDb.userLists) collabTodosDb.userLists = {};
  
  const list = {
    id: listId,
    name: name,
    description: description,
    joinCode: joinCode,
    ownerId: String(userId),
    members: [{ userId: String(userId), username: null, joinedAt: new Date().toISOString(), role: "owner" }],
    tasks: [],
    createdAt: new Date().toISOString(),
    settings: {
      allowMemberAdd: true,
      showCompletedBy: true,
      notifyOnComplete: true
    },
    stats: {
      totalCreated: 0,
      totalCompleted: 0
    }
  };
  
  collabTodosDb.lists[listId] = list;
  
  // Add to user's list
  if (!collabTodosDb.userLists[String(userId)]) {
    collabTodosDb.userLists[String(userId)] = [];
  }
  collabTodosDb.userLists[String(userId)].push(listId);
  
  saveCollabTodos();
  return list;
}

// Join a collaborative list
function joinCollabList(userId, joinCode, username = null) {
  const list = getCollabListByCode(joinCode);
  if (!list) return { success: false, error: "List not found" };
  
  const id = String(userId);
  
  // Check if already a member
  if (list.members.some(m => m.userId === id)) {
    return { success: false, error: "Already a member", list };
  }
  
  // Add member
  list.members.push({
    userId: id,
    username: username,
    joinedAt: new Date().toISOString(),
    role: "member"
  });
  
  // Add to user's lists
  if (!collabTodosDb.userLists[id]) {
    collabTodosDb.userLists[id] = [];
  }
  if (!collabTodosDb.userLists[id].includes(list.id)) {
    collabTodosDb.userLists[id].push(list.id);
  }
  
  saveCollabTodos();
  return { success: true, list };
}

// Leave a collaborative list
function leaveCollabList(userId, listId) {
  const list = getCollabList(listId);
  if (!list) return false;
  
  const id = String(userId);
  
  // Can't leave if owner
  if (list.ownerId === id) {
    return { success: false, error: "Owner cannot leave. Delete the list instead." };
  }
  
  // Remove from members
  list.members = list.members.filter(m => m.userId !== id);
  
  // Remove from user's lists
  if (collabTodosDb.userLists[id]) {
    collabTodosDb.userLists[id] = collabTodosDb.userLists[id].filter(lid => lid !== listId);
  }
  
  saveCollabTodos();
  return { success: true };
}

// Delete a collaborative list (owner only)
function deleteCollabList(userId, listId) {
  const list = getCollabList(listId);
  if (!list) return { success: false, error: "List not found" };
  
  if (list.ownerId !== String(userId)) {
    return { success: false, error: "Only the owner can delete this list" };
  }
  
  // Remove from all members' lists
  list.members.forEach(m => {
    if (collabTodosDb.userLists[m.userId]) {
      collabTodosDb.userLists[m.userId] = collabTodosDb.userLists[m.userId].filter(lid => lid !== listId);
    }
  });
  
  // Delete the list
  delete collabTodosDb.lists[listId];
  
  saveCollabTodos();
  return { success: true };
}

// Add task to collaborative list
function addCollabTask(userId, listId, taskData, username = null) {
  const list = getCollabList(listId);
  if (!list) return null;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return null;
  }
  
  const task = {
    id: generateTaskId(),
    text: taskData.text,
    completed: false,
    priority: taskData.priority || "none",
    category: taskData.category || "other",
    dueDate: taskData.dueDate || null,
    createdAt: new Date().toISOString(),
    createdBy: { userId: String(userId), username },
    completedAt: null,
    completedBy: null,
    assignedTo: taskData.assignedTo || null
  };
  
  list.tasks.push(task);
  list.stats.totalCreated++;
  
  saveCollabTodos();
  return task;
}

// Toggle collab task completion
function toggleCollabTask(userId, listId, taskId, username = null) {
  const list = getCollabList(listId);
  if (!list) return null;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return null;
  }
  
  const task = list.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  task.completed = !task.completed;
  
  if (task.completed) {
    task.completedAt = new Date().toISOString();
    task.completedBy = { userId: String(userId), username };
    list.stats.totalCompleted++;
  } else {
    task.completedAt = null;
    task.completedBy = null;
  }
  
  saveCollabTodos();
  return task;
}

// Delete collab task
function deleteCollabTask(userId, listId, taskId) {
  const list = getCollabList(listId);
  if (!list) return false;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return false;
  }
  
  const index = list.tasks.findIndex(t => t.id === taskId);
  if (index === -1) return false;
  
  list.tasks.splice(index, 1);
  saveCollabTodos();
  return true;
}

// Get collab task by ID
function getCollabTaskById(listId, taskId) {
  const list = getCollabList(listId);
  if (!list) return null;
  return list.tasks.find(t => t.id === taskId) || null;
}

// Update collab task
function updateCollabTask(userId, listId, taskId, updates) {
  const list = getCollabList(listId);
  if (!list) return null;
  
  // Check if user is a member
  if (!list.members.some(m => m.userId === String(userId))) {
    return null;
  }
  
  const task = list.tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  if (updates.text !== undefined) task.text = updates.text;
  if (updates.priority !== undefined) task.priority = updates.priority;
  if (updates.category !== undefined) task.category = updates.category;
  if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
  if (updates.assignedTo !== undefined) task.assignedTo = updates.assignedTo;
  
  saveCollabTodos();
  return task;
}

// Clear completed tasks from collab list
function clearCollabCompletedTasks(userId, listId) {
  const list = getCollabList(listId);
  if (!list) return 0;
  
  // Check if user is owner or member
  if (!list.members.some(m => m.userId === String(userId))) {
    return 0;
  }
  
  const beforeCount = list.tasks.length;
  list.tasks = list.tasks.filter(t => !t.completed);
  const removed = beforeCount - list.tasks.length;
  
  if (removed > 0) saveCollabTodos();
  return removed;
}

// Build collab list display message
function buildCollabListMessage(list, page = 0) {
  const pageSize = 8;
  const tasks = list.tasks;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  
  let message = [
    `👥 <b>${escapeHTML(list.name)}</b>`,
    ``,
    `📊 ${pendingCount} pending • ${completedCount} done • ${list.members.length} members`,
    `🔑 Join code: <code>${list.joinCode}</code>`,
    ``,
  ];
  
  if (pageTasks.length === 0) {
    message.push(`<i>No tasks yet! Add one with the button below.</i>`);
  } else {
    pageTasks.forEach((task, i) => {
      const idx = startIndex + i + 1;
      const checkbox = task.completed ? "✅" : "⬜";
      const text = task.completed ? `<s>${escapeHTML(task.text)}</s>` : escapeHTML(task.text);
      const priorityIndicator = task.priority === "high" ? " 🔴" : task.priority === "medium" ? " 🟡" : "";
      
      let completedByText = "";
      if (task.completed && task.completedBy && list.settings.showCompletedBy) {
        const completer = task.completedBy.username || `User ${task.completedBy.userId.slice(-4)}`;
        completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
      }
      
      message.push(`${checkbox} ${idx}. ${text}${priorityIndicator}${completedByText}`);
    });
  }
  
  if (totalPages > 1) {
    message.push(``);
    message.push(`<i>Page ${currentPage + 1}/${totalPages}</i>`);
  }
  
  message.push(``);
  message.push(`<i>Tap task to toggle • Tap again for options</i>`);
  
  return message.join("\n");
}

// Build collab list keyboard
function buildCollabListKeyboard(list, page = 0) {
  const pageSize = 8;
  const tasks = list.tasks;
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * pageSize;
  const pageTasks = tasks.slice(startIndex, startIndex + pageSize);
  
  const kb = new InlineKeyboard();
  
  // Task toggle buttons (2 per row)
  for (let i = 0; i < pageTasks.length; i += 2) {
    const task1 = pageTasks[i];
    const icon1 = task1.completed ? "✅" : "⬜";
    kb.text(`${icon1} ${startIndex + i + 1}`, `ct_tap:${list.id}:${task1.id}`);
    
    if (pageTasks[i + 1]) {
      const task2 = pageTasks[i + 1];
      const icon2 = task2.completed ? "✅" : "⬜";
      kb.text(`${icon2} ${startIndex + i + 2}`, `ct_tap:${list.id}:${task2.id}`);
    }
    kb.row();
  }
  
  // Pagination
  if (totalPages > 1) {
    if (currentPage > 0) {
      kb.text("◀️", `ct_page:${list.id}:${currentPage - 1}`);
    }
    kb.text(`${currentPage + 1}/${totalPages}`, "ct_noop");
    if (currentPage < totalPages - 1) {
      kb.text("▶️", `ct_page:${list.id}:${currentPage + 1}`);
    }
    kb.row();
  }
  
  // Action buttons - simplified
  kb.text("➕ Add", `ct_add:${list.id}`)
    .text("👥 Members", `ct_members:${list.id}`)
    .text("🔗 Share", `ct_share:${list.id}`)
    .row()
    .text("🗑️ Clear Done", `ct_clear:${list.id}`)
    .text("← My Lists", "collab_list");
  
  return kb;
}

// /todo - Advanced todo/checklist command
bot.command("todo", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  ensureUser(u.id, u);
  const args = ctx.message.text.replace(/^\/todo\s*/i, "").trim();
  const parts = args.split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const rest = parts.slice(1).join(" ").trim();
  
  // No subcommand - show task list
  if (!subcommand) {
    const filters = getTodoFilters(u.id);
    await ctx.reply(buildTodoListMessage(u.id, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(u.id, 0, filters),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo add <task>
  if (subcommand === "add" || subcommand === "a") {
    if (!rest) {
      return ctx.reply(
        "📋 *Add Task*\n\n" +
        "Usage: `/todo add Buy groceries`\n\n" +
        "*Quick options:*\n" +
        "• `#work` - Set category\n" +
        "• `!high` - Set priority (high/med/low)\n" +
        "• `@today` - Set due date (today/tomorrow/nextweek)\n\n" +
        "Example: `/todo add Finish report #work !high @tomorrow`",
        { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id }
      );
    }
    
    const parsed = parseTaskText(rest);
    if (!parsed.text) {
      return ctx.reply("❌ Task text cannot be empty!", { reply_to_message_id: ctx.message?.message_id });
    }
    
    const task = createTask(u.id, parsed);
    const userTodos = getUserTodos(u.id);
    
    let confirmMsg = `✅ *Task added!*\n\n${formatTaskDisplay(task, userTodos, false)}`;
    if (parsed.dueDate) confirmMsg += `\n📅 Due: ${parsed.dueDate}`;
    if (parsed.priority) confirmMsg += `\n${PRIORITY_EMOJI[parsed.priority]} Priority: ${PRIORITY_LABELS[parsed.priority]}`;
    
    await ctx.reply(confirmMsg, {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo done <number>
  if (subcommand === "done" || subcommand === "d" || subcommand === "check") {
    const num = parseInt(rest);
    if (!num || num < 1) {
      return ctx.reply("Usage: `/todo done 1` (task number)", { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id });
    }
    
    const tasks = getFilteredTasks(u.id, getTodoFilters(u.id));
    if (num > tasks.length) {
      return ctx.reply(`❌ Task #${num} not found. You have ${tasks.length} tasks.`, { reply_to_message_id: ctx.message?.message_id });
    }
    
    const task = tasks[num - 1];
    toggleTaskCompletion(u.id, task.id);
    
    const status = task.completed ? "completed" : "marked incomplete";
    const emoji = task.completed ? "✅" : "⬜";
    
    await ctx.reply(`${emoji} Task #${num} ${status}!`, {
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo delete <number>
  if (subcommand === "delete" || subcommand === "del" || subcommand === "rm") {
    const num = parseInt(rest);
    if (!num || num < 1) {
      return ctx.reply("Usage: `/todo delete 1` (task number)", { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id });
    }
    
    const tasks = getFilteredTasks(u.id, getTodoFilters(u.id));
    if (num > tasks.length) {
      return ctx.reply(`❌ Task #${num} not found. You have ${tasks.length} tasks.`, { reply_to_message_id: ctx.message?.message_id });
    }
    
    const task = tasks[num - 1];
    deleteTaskById(u.id, task.id);
    
    await ctx.reply(`🗑️ Task #${num} deleted!`, {
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo clear - Clear all completed tasks
  if (subcommand === "clear") {
    const userTodos = getUserTodos(u.id);
    const beforeCount = userTodos.tasks.length;
    userTodos.tasks = userTodos.tasks.filter(t => !t.completed);
    const removed = beforeCount - userTodos.tasks.length;
    saveTodos();
    
    await ctx.reply(`🗑️ Cleared ${removed} completed task${removed !== 1 ? 's' : ''}!`, {
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo stats - Show statistics
  if (subcommand === "stats") {
    await ctx.reply(buildTodoStatsMessage(u.id), {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // /todo help
  if (subcommand === "help") {
    const helpMsg = [
      "📋 *Todo Commands*",
      "",
      "`/todo` - View your task list",
      "`/todo add <task>` - Add a new task",
      "`/todo done <#>` - Toggle task completion",
      "`/todo delete <#>` - Delete a task",
      "`/todo clear` - Clear completed tasks",
      "`/todo stats` - View statistics",
      "",
      "*Quick Add Options:*",
      "• `#category` - work, personal, shopping, etc.",
      "• `!priority` - high, med, low",
      "• `@date` - today, tomorrow, nextweek, or YYYY-MM-DD",
      "",
      "*Example:*",
      "`/todo add Buy milk #shopping !low @tomorrow`",
    ].join("\n");
    
    await ctx.reply(helpMsg, {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    });
    return;
  }
  
  // Unknown subcommand - treat as quick add
  const parsed = parseTaskText(args);
  if (parsed.text) {
    const task = createTask(u.id, parsed);
    const userTodos = getUserTodos(u.id);
    
    await ctx.reply(`✅ *Task added!*\n\n${formatTaskDisplay(task, userTodos, false)}`, {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("📋 View Tasks", "todo_list"),
      reply_to_message_id: ctx.message?.message_id,
    });
  } else {
    await ctx.reply("Use `/todo help` to see available commands.", {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    });
  }
});

// /collab - Collaborative todo lists command
bot.command("collab", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  ensureUser(u.id, u);
  const args = ctx.message.text.replace(/^\/collab\s*/i, "").trim();
  const parts = args.split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const rest = parts.slice(1).join(" ").trim();
  
  // No subcommand - show collab lists
  if (!subcommand) {
    const userLists = getCollabListsForUser(u.id);
    
    if (userLists.length === 0) {
      await ctx.reply(
        "👥 *Starz Check - Collaborative*\n\n" +
        "_No shared lists yet!_\n\n" +
        "*Create a new list:*\n" +
        "`/collab new Party Planning`\n\n" +
        "*Or join with a code:*\n" +
        "`/collab join ABC123`",
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("➕ Create List", "collab_create")
            .text("🔗 Join List", "collab_join")
            .row()
            .text("📋 Personal Tasks", "todo_list"),
          reply_to_message_id: ctx.message?.message_id
        }
      );
      return;
    }
    
    let message = [
      "👥 *Starz Check - Collaborative*",
      "",
      `You have ${userLists.length} shared list${userLists.length !== 1 ? 's' : ''}:`,
      "",
    ];
    
    const kb = new InlineKeyboard();
    
    userLists.slice(0, 8).forEach((list, i) => {
      const pendingCount = list.tasks.filter(t => !t.completed).length;
      const isOwner = list.ownerId === String(u.id);
      const ownerBadge = isOwner ? " 👑" : "";
      message.push(`${i + 1}. *${list.name}*${ownerBadge} (${pendingCount} pending)`);
      
      kb.text(`${i + 1}. ${list.name.slice(0, 15)}`, `collab_open:${list.id}`);
      if ((i + 1) % 2 === 0) kb.row();
    });
    
    if (userLists.length % 2 !== 0) kb.row();
    
    kb.text("➕ Create", "collab_create")
      .text("🔗 Join", "collab_join")
      .row()
      .text("📋 Personal Tasks", "todo_list");
    
    await ctx.reply(message.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: kb,
      reply_to_message_id: ctx.message?.message_id
    });
    return;
  }
  
  // /collab new <name>
  if (subcommand === "new" || subcommand === "create") {
    if (!rest) {
      return ctx.reply(
        "➕ *Create Collaborative List*\n\n" +
        "Usage: `/collab new Party Planning`",
        { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id }
      );
    }
    
    const listName = rest.slice(0, 50);
    const newList = createCollabList(u.id, listName);
    
    await ctx.reply(
      `✅ *List Created!*\n\n👥 *${listName}*\n\n🔑 Share this code with others:\n\`${newList.joinCode}\`\n\nThey can join with:\n\`/collab join ${newList.joinCode}\``,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("📋 View List", `collab_open:${newList.id}`)
          .text("👥 All Lists", "collab_list"),
        reply_to_message_id: ctx.message?.message_id
      }
    );
    return;
  }
  
  // /collab join <code>
  if (subcommand === "join") {
    if (!rest) {
      return ctx.reply(
        "🔗 *Join Collaborative List*\n\n" +
        "Usage: `/collab join ABC123`",
        { parse_mode: "Markdown", reply_to_message_id: ctx.message?.message_id }
      );
    }
    
    const joinCode = rest.toUpperCase();
    const result = joinCollabList(u.id, joinCode, ctx.from?.username);
    
    if (result.success) {
      const list = result.list;
      await ctx.reply(
        `✅ *Joined Successfully!*\n\n👥 *${list.name}*\n\n👤 ${list.members.length} members\n📋 ${list.tasks.length} tasks`,
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("📋 View List", `collab_open:${list.id}`)
            .text("👥 All Lists", "collab_list"),
          reply_to_message_id: ctx.message?.message_id
        }
      );
    } else {
      await ctx.reply(
        `⚠️ *${result.error || "Could not join list"}*\n\nCheck the code and try again.`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id
        }
      );
    }
    return;
  }
  
  // /collab help
  if (subcommand === "help") {
    const helpMsg = [
      "👥 *Collaborative Lists Commands*",
      "",
      "`/collab` - View your shared lists",
      "`/collab new <name>` - Create a new list",
      "`/collab join <code>` - Join with a code",
      "",
      "*Inside a list:*",
      "• Tap task numbers to toggle",
      "• Tap again for options",
      "• Share the code with friends",
      "• Everyone can add & check tasks",
    ].join("\n");
    
    await ctx.reply(helpMsg, {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id
    });
    return;
  }
  
  // Unknown - show help
  await ctx.reply("Use `/collab help` to see available commands.", {
    parse_mode: "Markdown",
    reply_to_message_id: ctx.message?.message_id
  });
});

// Todo callback handlers
bot.callbackQuery("todo_list", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {
    // Message unchanged, ignore
  }
});

// Track last tap for double-tap detection in DM
const dmTodoLastTap = new Map();

bot.callbackQuery(/^todo_toggle:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const now = Date.now();
  const lastTap = dmTodoLastTap.get(userId);
  
  // Check for double-tap (same task within 3 seconds)
  if (lastTap && lastTap.taskId === taskId && (now - lastTap.timestamp) < 3000) {
    // Double-tap detected - show action menu
    dmTodoLastTap.delete(userId);
    await ctx.answerCallbackQuery({ text: "⚙️ Opening options..." });
    
    const task = getTaskById(userId, taskId);
    if (!task) {
      return ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    }
    
    const checkbox = task.completed ? "✅" : "⬜";
    const categoryEmoji = getCategoryEmoji(task.category);
    const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "medium" ? "🟡 Medium" : "🟢 Low";
    const dueText = task.dueDate ? `\n📅 Due: ${task.dueDate}` : "";
    
    const menuText = [
      `⚙️ *Task Options*`,
      ``,
      `${checkbox} ${task.text}`,
      ``,
      `${categoryEmoji} ${task.category || "personal"} \u2022 ${priorityText}${dueText}`,
      ``,
      `_Choose an action:_`,
    ].join("\n");
    
    const keyboard = new InlineKeyboard()
      .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `todo_toggle:${taskId}`)
      .text("🗑️ Delete", `todo_delete_task:${taskId}`)
      .row()
      .text("✏️ Edit Text", `todo_edit_task:${taskId}`)
      .row()
      .text("🔴 High", `todo_priority:${taskId}:high`)
      .text("🟡 Med", `todo_priority:${taskId}:medium`)
      .text("🟢 Low", `todo_priority:${taskId}:low`)
      .row()
      .text("📅 Today", `todo_due:${taskId}:today`)
      .text("📅 Tomorrow", `todo_due:${taskId}:tomorrow`)
      .row()
      .text("← Back to List", "todo_list");
    
    try {
      await ctx.editMessageText(menuText, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } catch (e) {}
    return;
  }
  
  // First tap - toggle the task
  dmTodoLastTap.set(userId, { taskId, timestamp: now });
  
  // Auto-clear after 3 seconds
  setTimeout(() => {
    const current = dmTodoLastTap.get(userId);
    if (current && current.taskId === taskId && current.timestamp === now) {
      dmTodoLastTap.delete(userId);
    }
  }, 3000);
  
  const task = toggleTaskCompletion(userId, taskId);
  
  if (task) {
    const status = task.completed ? "✅ Done! Tap again for options" : "⬜ Unchecked! Tap again for options";
    await ctx.answerCallbackQuery({ text: status });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery(/^todo_page:(\d+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const page = parseInt(ctx.match[1]);
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, page, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, page, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_add", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  pendingTodoInput.set(String(userId), { action: "add", timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      "📋 *Add New Task*\n\n" +
      "Type your task below:\n\n" +
      "*Quick options:*\n" +
      "• `#work` - Set category\n" +
      "• `!high` - Set priority\n" +
      "• `@today` - Set due date\n\n" +
      "_Example: Buy groceries #shopping !low @tomorrow_",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Cancel", "todo_list")
      }
    );
  } catch (e) {}
});

bot.callbackQuery("todo_clear_done", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userTodos = getUserTodos(userId);
  const beforeCount = userTodos.tasks.length;
  userTodos.tasks = userTodos.tasks.filter(t => !t.completed);
  const removed = beforeCount - userTodos.tasks.length;
  saveTodos();
  
  await ctx.answerCallbackQuery({ text: `🗑️ Cleared ${removed} completed task${removed !== 1 ? 's' : ''}!` });
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_filter", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    await ctx.editMessageText(
      "🔍 *Filter Tasks*\n\n" +
      "Select a filter to apply:",
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoFilterKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery(/^todo_filter_due:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const dueFilter = ctx.match[1];
  const filters = { ...getTodoFilters(userId), dueFilter };
  setTodoFilters(userId, filters);
  
  await ctx.answerCallbackQuery({ text: `Filter: ${dueFilter}` });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery(/^todo_filter_priority:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const priority = ctx.match[1];
  const filters = { ...getTodoFilters(userId), priority };
  setTodoFilters(userId, filters);
  
  await ctx.answerCallbackQuery({ text: `Filter: ${priority} priority` });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery(/^todo_filter_category:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const category = ctx.match[1];
  const filters = { ...getTodoFilters(userId), category };
  setTodoFilters(userId, filters);
  
  await ctx.answerCallbackQuery({ text: `Filter: ${category}` });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_toggle_completed", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userTodos = getUserTodos(userId);
  userTodos.settings.showCompleted = !userTodos.settings.showCompleted;
  saveTodos();
  
  const status = userTodos.settings.showCompleted ? "Showing" : "Hiding";
  await ctx.answerCallbackQuery({ text: `${status} completed tasks` });
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

bot.callbackQuery("todo_clear_filters", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  clearTodoFilters(userId);
  
  await ctx.answerCallbackQuery({ text: "Filters cleared" });
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, {}), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, {})
    });
  } catch (e) {}
});

bot.callbackQuery("todo_settings", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userTodos = getUserTodos(userId);
  const sortLabels = { created: 'Created', priority: 'Priority', dueDate: 'Due Date', category: 'Category' };
  
  try {
    await ctx.editMessageText(
      "⚙️ *Task Settings*\n\n" +
      `📊 *Sort by:* ${sortLabels[userTodos.settings.sortBy]}\n` +
      `${PRIORITY_EMOJI[userTodos.settings.defaultPriority]} *Default Priority:* ${PRIORITY_LABELS[userTodos.settings.defaultPriority]}\n` +
      `👁️ *Show Completed:* ${userTodos.settings.showCompleted ? 'Yes' : 'No'}`,
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoSettingsKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery(/^todo_sort:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const sortBy = ctx.match[1];
  const userTodos = getUserTodos(userId);
  userTodos.settings.sortBy = sortBy;
  saveTodos();
  
  const sortLabels = { created: 'Created', priority: 'Priority', dueDate: 'Due Date', category: 'Category' };
  await ctx.answerCallbackQuery({ text: `Sort by: ${sortLabels[sortBy]}` });
  
  try {
    await ctx.editMessageText(
      "⚙️ *Task Settings*\n\n" +
      `📊 *Sort by:* ${sortLabels[userTodos.settings.sortBy]}\n` +
      `${PRIORITY_EMOJI[userTodos.settings.defaultPriority]} *Default Priority:* ${PRIORITY_LABELS[userTodos.settings.defaultPriority]}\n` +
      `👁️ *Show Completed:* ${userTodos.settings.showCompleted ? 'Yes' : 'No'}`,
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoSettingsKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery(/^todo_default_priority:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const priority = ctx.match[1];
  const userTodos = getUserTodos(userId);
  userTodos.settings.defaultPriority = priority;
  saveTodos();
  
  await ctx.answerCallbackQuery({ text: `Default priority: ${PRIORITY_LABELS[priority]}` });
  
  const sortLabels = { created: 'Created', priority: 'Priority', dueDate: 'Due Date', category: 'Category' };
  
  try {
    await ctx.editMessageText(
      "⚙️ *Task Settings*\n\n" +
      `📊 *Sort by:* ${sortLabels[userTodos.settings.sortBy]}\n` +
      `${PRIORITY_EMOJI[userTodos.settings.defaultPriority]} *Default Priority:* ${PRIORITY_LABELS[userTodos.settings.defaultPriority]}\n` +
      `👁️ *Show Completed:* ${userTodos.settings.showCompleted ? 'Yes' : 'No'}`,
      {
        parse_mode: "Markdown",
        reply_markup: buildTodoSettingsKeyboard(userId)
      }
    );
  } catch (e) {}
});

bot.callbackQuery("todo_stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    await ctx.editMessageText(buildTodoStatsMessage(userId), {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("« Back to Tasks", "todo_list")
    });
  } catch (e) {}
});

bot.callbackQuery("todo_noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// DM todo delete task handler
bot.callbackQuery(/^todo_delete_task:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const deleted = deleteTaskById(userId, taskId);
  
  if (deleted) {
    await ctx.answerCallbackQuery({ text: "🗑️ Task deleted!" });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

// DM todo edit task handler
bot.callbackQuery(/^todo_edit_task:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const task = getTaskById(userId, taskId);
  
  if (!task) {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery();
  
  // Store pending edit
  pendingTodoInput.set(String(userId), { action: "edit", taskId, timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      `✏️ *Edit Task*\n\n` +
      `Current: ${task.text}\n\n` +
      `_Reply with the new text for this task:_`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("← Cancel", "todo_list")
      }
    );
  } catch (e) {}
});

// DM todo priority handler
bot.callbackQuery(/^todo_priority:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const priority = ctx.match[2];
  
  const task = updateTask(userId, taskId, { priority });
  
  if (task) {
    const emoji = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
    await ctx.answerCallbackQuery({ text: `${emoji} Priority set to ${priority}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

// DM todo due date handler
bot.callbackQuery(/^todo_due:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const dueOption = ctx.match[2];
  
  let dueDate;
  const today = new Date();
  
  if (dueOption === "today") {
    dueDate = today.toISOString().slice(0, 10);
  } else if (dueOption === "tomorrow") {
    today.setDate(today.getDate() + 1);
    dueDate = today.toISOString().slice(0, 10);
  }
  
  const task = updateTask(userId, taskId, { dueDate });
  
  if (task) {
    await ctx.answerCallbackQuery({ text: `📅 Due date set to ${dueOption}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  const filters = getTodoFilters(userId);
  
  try {
    await ctx.editMessageText(buildTodoListMessage(userId, 0, filters), {
      parse_mode: "Markdown",
      reply_markup: buildTodoKeyboard(userId, 0, filters)
    });
  } catch (e) {}
});

// Collab list callback from personal todo
bot.callbackQuery("collab_list", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userLists = getCollabListsForUser(userId);
  
  if (userLists.length === 0) {
    try {
      await ctx.editMessageText(
        "👥 *Starz Check - Collaborative*\n\n" +
        "_No shared lists yet!_\n\n" +
        "*Create a new list:*\n" +
        "`/collab new Party Planning`\n\n" +
        "*Or join with a code:*\n" +
        "`/collab join ABC123`",
        {
          parse_mode: "Markdown",
          reply_markup: new InlineKeyboard()
            .text("➕ Create List", "collab_create")
            .text("🔗 Join List", "collab_join")
            .row()
            .text("« Back to Personal", "todo_list")
        }
      );
    } catch (e) {}
    return;
  }
  
  // Show list of collaborative lists
  let message = [
    "👥 *Starz Check - Collaborative*",
    "",
    `You have ${userLists.length} shared list${userLists.length !== 1 ? 's' : ''}:`,
    "",
  ];
  
  const kb = new InlineKeyboard();
  
  userLists.slice(0, 8).forEach((list, i) => {
    const pendingCount = list.tasks.filter(t => !t.completed).length;
    const isOwner = list.ownerId === String(userId);

