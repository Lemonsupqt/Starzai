/**
 * handlers/callbacks/todo.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE TODO CALLBACK HANDLERS
// Lines 8906-9833 from original index.js
// =====================

// =====================
// INLINE TODO CALLBACK HANDLERS
// Double-tap pattern: first tap toggles, second tap within 3s opens action menu
// =====================

// Track last tap for double-tap detection
const inlineTodoLastTap = new Map(); // oduserId -> { taskId, timestamp }

bot.callbackQuery(/^itodo_tap:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const now = Date.now();
  const lastTap = inlineTodoLastTap.get(userId);
  
  // Check for double-tap (same task within 3 seconds)
  if (lastTap && lastTap.taskId === taskId && (now - lastTap.timestamp) < 3000) {
    // Double-tap detected - show action menu
    inlineTodoLastTap.delete(userId);
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
      `⚙️ <b>Task Options</b>`,
      ``,
      `${checkbox} ${escapeHTML(task.text)}`,
      ``,
      `${categoryEmoji} ${escapeHTML(task.category || "personal")} • ${priorityText}${dueText}`,
      ``,
      `<i>Choose an action:</i>`,
    ].join("\n");
    
    const keyboard = new InlineKeyboard()
      .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
      .text("🗑️ Delete", `itodo_delete:${taskId}`)
      .row()
      .text("✏️ Edit Text", `itodo_edit:${taskId}`)
      .row()
      .text("🔴 High", `itodo_priority:${taskId}:high`)
      .text("🟡 Med", `itodo_priority:${taskId}:medium`)
      .text("🟢 Low", `itodo_priority:${taskId}:low`)
      .row()
      .text("📅 Today", `itodo_due:${taskId}:today`)
      .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
      .row()
      .text("← Back to List", "itodo_back");
    
    try {
      await ctx.editMessageText(menuText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (e) {}
    return;
  }
  
  // First tap - toggle the task
  inlineTodoLastTap.set(userId, { taskId, timestamp: now });
  
  // Auto-clear after 3 seconds
  setTimeout(() => {
    const current = inlineTodoLastTap.get(userId);
    if (current && current.taskId === taskId && current.timestamp === now) {
      inlineTodoLastTap.delete(userId);
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
  
  // Refresh the task list
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
// Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_toggle:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const task = toggleTaskCompletion(userId, taskId);
  
  if (task) {
    await ctx.answerCallbackQuery({ text: task.completed ? "✅ Completed!" : "⬜ Unchecked!" });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Go back to list
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_delete:(.+)$/, async (ctx) => {
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
  
  // Go back to list
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  if (taskCount === 0) {
    try {
      await ctx.editMessageText("📋 <b>My Tasks</b>\n\n<i>No tasks yet!</i>\n\n<i>via StarzAI • Tasks</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("➕ Add Task", "itodo_add")
          .row()
          .switchInlineCurrent("← Back", ""),
      });
    } catch (e) {}
    return;
  }
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_priority:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const priority = ctx.match[2];
  
  const task = updateTask(userId, taskId, { priority });
  
  if (task) {
    const emoji = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
    await ctx.answerCallbackQuery({ text: `${emoji} Priority set to ${priority}!` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Refresh the action menu
  const updatedTask = getTaskById(userId, taskId);
  if (!updatedTask) return;
  
  const checkbox = updatedTask.completed ? "✅" : "⬜";
  const categoryEmoji = getCategoryEmoji(updatedTask.category);
  const priorityText = updatedTask.priority === "high" ? "🔴 High" : updatedTask.priority === "medium" ? "🟡 Medium" : "🟢 Low";
  const dueText = updatedTask.dueDate ? `\n📅 Due: ${updatedTask.dueDate}` : "";
  
  const menuText = [
    `⚙️ <b>Task Options</b>`,
    ``,
    `${checkbox} ${escapeHTML(updatedTask.text)}`,
    ``,
    `${categoryEmoji} ${escapeHTML(updatedTask.category || "personal")} • ${priorityText}${dueText}`,
    ``,
    `<i>Choose an action:</i>`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text(updatedTask.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
    .text("🗑️ Delete", `itodo_delete:${taskId}`)
    .row()
    .text("✏️ Edit Text", `itodo_edit:${taskId}`)
    .row()
    .text("🔴 High", `itodo_priority:${taskId}:high`)
    .text("🟡 Med", `itodo_priority:${taskId}:medium`)
    .text("🟢 Low", `itodo_priority:${taskId}:low`)
    .row()
    .text("📅 Today", `itodo_due:${taskId}:today`)
    .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(menuText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_due:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const dueOption = ctx.match[2];
  
  let dueDate;
  const today = new Date();
  if (dueOption === "today") {
    dueDate = today.toISOString().split("T")[0];
  } else if (dueOption === "tomorrow") {
    today.setDate(today.getDate() + 1);
    dueDate = today.toISOString().split("T")[0];
  } else {
    dueDate = dueOption;
  }
  
  const task = updateTask(userId, taskId, { dueDate });
  
  if (task) {
    await ctx.answerCallbackQuery({ text: `📅 Due date set to ${dueDate}!` });
  } else {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  // Refresh the action menu
  const updatedTask = getTaskById(userId, taskId);
  if (!updatedTask) return;
  
  const checkbox = updatedTask.completed ? "✅" : "⬜";
  const categoryEmoji = getCategoryEmoji(updatedTask.category);
  const priorityText = updatedTask.priority === "high" ? "🔴 High" : updatedTask.priority === "medium" ? "🟡 Medium" : "🟢 Low";
  const dueText = updatedTask.dueDate ? `\n📅 Due: ${updatedTask.dueDate}` : "";
  
  const menuText = [
    `⚙️ <b>Task Options</b>`,
    ``,
    `${checkbox} ${escapeHTML(updatedTask.text)}`,
    ``,
    `${categoryEmoji} ${escapeHTML(updatedTask.category || "personal")} • ${priorityText}${dueText}`,
    ``,
    `<i>Choose an action:</i>`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text(updatedTask.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
    .text("🗑️ Delete", `itodo_delete:${taskId}`)
    .row()
    .text("✏️ Edit Text", `itodo_edit:${taskId}`)
    .row()
    .text("🔴 High", `itodo_priority:${taskId}:high`)
    .text("🟡 Med", `itodo_priority:${taskId}:medium`)
    .text("🟢 Low", `itodo_priority:${taskId}:low`)
    .row()
    .text("📅 Today", `itodo_due:${taskId}:today`)
    .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(menuText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_edit:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const taskId = ctx.match[1];
  const task = getTaskById(userId, taskId);
  
  if (!task) {
    await ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    return;
  }
  
  await ctx.answerCallbackQuery({ text: "✏️ Tap button to edit" });
  
  // Show edit with switchInlineCurrent to pre-fill
  const editText = [
    `✏️ <b>Edit Task</b>`,
    ``,
    `Current: ${escapeHTML(task.text)}`,
    ``,
    `Tap the button below to edit:`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(editText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("✏️ Edit Now", `sc:edit ${taskId} `)
        .row()
        .text("← Back to Task", `itodo_view:${taskId}`)
        .text("← Back to List", "itodo_back"),
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_view:(.+)$/, async (ctx) => {
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
  
  const checkbox = task.completed ? "✅" : "⬜";
  const categoryEmoji = getCategoryEmoji(task.category);
  const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "medium" ? "🟡 Medium" : "🟢 Low";
  const dueText = task.dueDate ? `\n📅 Due: ${task.dueDate}` : "";
  
  const menuText = [
    `⚙️ <b>Task Options</b>`,
    ``,
    `${checkbox} ${escapeHTML(task.text)}`,
    ``,
    `${categoryEmoji} ${escapeHTML(task.category || "personal")} • ${priorityText}${dueText}`,
    ``,
    `<i>Choose an action:</i>`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `itodo_toggle:${taskId}`)
    .text("🗑️ Delete", `itodo_delete:${taskId}`)
    .row()
    .text("✏️ Edit Text", `itodo_edit:${taskId}`)
    .row()
    .text("🔴 High", `itodo_priority:${taskId}:high`)
    .text("🟡 Med", `itodo_priority:${taskId}:medium`)
    .text("🟢 Low", `itodo_priority:${taskId}:low`)
    .row()
    .text("📅 Today", `itodo_due:${taskId}:today`)
    .text("📅 Tomorrow", `itodo_due:${taskId}:tomorrow`)
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(menuText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_back", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const todos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = todos.tasks || [];
  const taskCount = tasks.length;
  const doneCount = tasks.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  if (taskCount === 0) {
    try {
      await ctx.editMessageText("📋 <b>Starz Check - Personal</b>\n\n<i>No tasks yet!</i>\n\n<i>via StarzAI • Starz Check</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("➕ Add Task", "itodo_add")
          .row()
          .switchInlineCurrent("← Back", ""),
      });
    } catch (e) {}
    return;
  }
  
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_add", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  // Just switch to inline mode directly - no instruction text needed
  try {
    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("➕ Type task here...", "t:add ")
        .row()
        .text("← Back", "itodo_back"),
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_filter", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const filters = getTodoFilters(userId);
  
  const filterText = [
    `🔍 <b>Filter Tasks</b>`,
    ``,
    `Current filters:`,
    `• Priority: ${filters.priority || "All"}`,
    `• Category: ${filters.category || "All"}`,
    `• Sort by: ${filters.sortBy || "created"}`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text("🔴 High", "itodo_fpri:high")
    .text("🟡 Med", "itodo_fpri:medium")
    .text("🟢 Low", "itodo_fpri:low")
    .row()
    .text("💼 Work", "itodo_fcat:work")
    .text("👤 Personal", "itodo_fcat:personal")
    .text("🛒 Shop", "itodo_fcat:shopping")
    .row()
    .text("📅 By Date", "itodo_sort:dueDate")
    .text("🔴 By Priority", "itodo_sort:priority")
    .row()
    .text("❌ Clear Filters", "itodo_fclear")
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(filterText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_fpri:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const priority = ctx.match[1];
  setTodoFilter(userId, "priority", priority);
  await ctx.answerCallbackQuery({ text: `🔍 Filtering by ${priority} priority` });
  
  // Go back to list with filter applied
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  const taskCount = filteredTodos.length;
  const doneCount = filteredTodos.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  // Compact title with filter indicator
  let taskListText = `✅ <b>Starz Check</b> 🔍${priority}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .text("➕ Add", "itodo_add")
    .text("🔍 Filter", "itodo_filter")
    .text("❌ Clear", "itodo_fclear")
    .row()
    .switchInlineCurrent("🔄 Refresh", "t: ")
    .switchInlineCurrent("← Back", "");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_fcat:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const category = ctx.match[1];
  setTodoFilter(userId, "category", category);
  await ctx.answerCallbackQuery({ text: `🔍 Filtering by ${category}` });
  
  // Go back to list with filter applied
  const userTodos = getUserTodos(userId);
  const filters = getTodoFilters(userId);
  const tasks = userTodos.tasks || [];
  const filteredTodos = filterTodos(tasks, filters);
  const sortedTodos = sortTodos(filteredTodos, filters.sortBy || "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  const taskCount = filteredTodos.length;
  const doneCount = filteredTodos.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  // Compact title with filter indicator
  let taskListText = `✅ <b>Starz Check</b> 🔍${category}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .text("➕ Add", "itodo_add")
    .text("🔍 Filter", "itodo_filter")
    .text("❌ Clear", "itodo_fclear")
    .row()
    .switchInlineCurrent("🔄 Refresh", "t: ")
    .switchInlineCurrent("← Back", "");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^itodo_sort:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const sortBy = ctx.match[1];
  setTodoFilter(userId, "sortBy", sortBy);
  await ctx.answerCallbackQuery({ text: `📊 Sorting by ${sortBy}` });
  
  // Go back to filter menu
  const filters = getTodoFilters(userId);
  
  const filterText = [
    `🔍 <b>Filter Tasks</b>`,
    ``,
    `Current filters:`,
    `• Priority: ${filters.priority || "All"}`,
    `• Category: ${filters.category || "All"}`,
    `• Sort by: ${filters.sortBy || "created"}`,
  ].join("\n");
  
  const keyboard = new InlineKeyboard()
    .text("🔴 High", "itodo_fpri:high")
    .text("🟡 Med", "itodo_fpri:medium")
    .text("🟢 Low", "itodo_fpri:low")
    .row()
    .text("💼 Work", "itodo_fcat:work")
    .text("👤 Personal", "itodo_fcat:personal")
    .text("🛒 Shop", "itodo_fcat:shopping")
    .row()
    .text("📅 By Date", "itodo_sort:dueDate")
    .text("🔴 By Priority", "itodo_sort:priority")
    .row()
    .text("❌ Clear Filters", "itodo_fclear")
    .row()
    .text("← Back to List", "itodo_back");
  
  try {
    await ctx.editMessageText(filterText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_fclear", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  clearTodoFilters(userId);
  await ctx.answerCallbackQuery({ text: "❌ Filters cleared" });
  
  // Go back to list
  const todos = getUserTodos(userId);
  const taskCount = todos.length;
  const doneCount = todos.filter(t => t.completed).length;
  const pendingCount = taskCount - doneCount;
  
  const sortedTodos = sortTodos(todos, "created");
  const displayTodos = sortedTodos.slice(0, 8);
  
  // Compact title only - tasks are buttons
  const streak = getCompletionStreak(userId);
  let taskListText = `✅ <b>Starz Check</b>`;
  if (streak > 0) taskListText += ` 🔥${streak}`;
  
  const keyboard = new InlineKeyboard();
  
  // Each task is its own button row - like tic-tac-toe!
  displayTodos.forEach((task) => {
    if (!task || !task.text) return; // Skip invalid tasks
    const icon = task.completed ? "✅" : "⬜";
    const text = task.text.slice(0, 28) + (task.text.length > 28 ? "..." : "");
    const catEmoji = getCategoryEmoji(task.category);
    const priInd = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "";
    const dueInd = task.dueDate && isOverdue(task.dueDate) && !task.completed ? "⚠️" : "";
    keyboard.text(`${icon} ${text} ${catEmoji}${priInd}${dueInd}`, `itodo_tap:${task.id}`);
    keyboard.row();
  });
  
  keyboard
    .switchInlineCurrent("➕", "t:add ")
    .text("🔍", "itodo_filter")
    .text("👥", "itodo_collab")
    .row()
    .text("← Back", "inline_main_menu");
  
  try {
    await ctx.editMessageText(taskListText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_stats", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const stats = getTodoStats(userId);
  
  const statsText = [
    `📊 <b>Task Statistics</b>`,
    ``,
    `📋 Total tasks: ${stats.total}`,
    `✅ Completed: ${stats.completed}`,
    `⬜ Pending: ${stats.pending}`,
    `📈 Completion rate: ${stats.completionRate}%`,
    ``,
    `🔥 Current streak: ${stats.streak} days`,
    `🏆 Best streak: ${stats.bestStreak} days`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(statsText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🗑️ Clear Completed", "itodo_clear_done")
        .row()
        .text("← Back to List", "itodo_back"),
    });
  } catch (e) {}
});

bot.callbackQuery("itodo_clear_done", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const cleared = clearCompletedTasks(userId);
  await ctx.answerCallbackQuery({ text: `🗑️ Cleared ${cleared} completed tasks!` });
  
  // Go back to stats
  const stats = getTodoStats(userId);
  
  const statsText = [
    `📊 <b>Task Statistics</b>`,
    ``,
    `📋 Total tasks: ${stats.total}`,
    `✅ Completed: ${stats.completed}`,
    `⬜ Pending: ${stats.pending}`,
    `📈 Completion rate: ${stats.completionRate}%`,
    ``,
    `🔥 Current streak: ${stats.streak} days`,
    `🏆 Best streak: ${stats.bestStreak} days`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(statsText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🗑️ Clear Completed", "itodo_clear_done")
        .row()
        .text("← Back to List", "itodo_back"),
    });  } catch (e) {}
});

bot.callbackQuery("itodo_collab", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const userLists = getCollabListsForUser(userId);
  
  let collabText = `👥 <b>Collab Lists</b>`;
  
  const keyboard = new InlineKeyboard();
  
  if (userLists.length === 0) {
    keyboard.text("📋 No lists yet", "ct_create").row();
  } else {
    userLists.slice(0, 5).forEach((list) => {
      const doneCount = list.tasks.filter(t => t.completed).length;
      const totalCount = list.tasks.length;
      keyboard.text(`📋 ${list.name} (${doneCount}/${totalCount})`, `ct_open:${list.id}`).row();
    });
  }
  
  keyboard
    .text("➕ Create", "ct_create")
    .text("🔗 Join", "ct_join")
    .row()
    .text("← Back", "itodo_back");
  
  try {
    await ctx.editMessageText(collabText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});


