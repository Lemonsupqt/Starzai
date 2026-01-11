/**
 * handlers/callbacks/todo.js
 * Auto-extracted from index.js
 */

// =====================
// INLINE TODO CALLBACK HANDLERS
// Lines 8906-9833 from original index.js
// =====================

    const ownerBadge = isOwner ? " 👑" : "";
    message.push(`${i + 1}. *${list.name}*${ownerBadge} (${pendingCount} pending)`);
    
    kb.text(`${i + 1}. ${list.name.slice(0, 15)}`, `collab_open:${list.id}`);
    if ((i + 1) % 2 === 0) kb.row();
  });
  
  if (userLists.length % 2 !== 0) kb.row();
  
  kb.text("➕ Create", "collab_create")
    .text("🔗 Join", "collab_join")
    .row()
    .text("« Back to Personal", "todo_list");
  
  try {
    await ctx.editMessageText(message.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: kb
    });
  } catch (e) {}
});

bot.callbackQuery(/^collab_open:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  
  if (!list) {
    try {
      await ctx.editMessageText("⚠️ List not found.", {
        reply_markup: new InlineKeyboard().text("« Back", "collab_list")
      });
    } catch (e) {}
    return;
  }
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  // Replace the inline switch button with a DM-friendly back button
  // We need to rebuild the keyboard for DM context
  const dmKeyboard = new InlineKeyboard();
  
  const pageSize = 8;
  const pageTasks = list.tasks.slice(0, pageSize);
  
  for (let i = 0; i < pageTasks.length; i += 2) {
    const task1 = pageTasks[i];
    const icon1 = task1.completed ? "✅" : "⬜";
    dmKeyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
    
    if (pageTasks[i + 1]) {
      const task2 = pageTasks[i + 1];
      const icon2 = task2.completed ? "✅" : "⬜";
      dmKeyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
    }
    dmKeyboard.row();
  }
  
  dmKeyboard
    .text("➕ Add", `ct_add:${list.id}`)
    .text("🗑️ Clear", `ct_clear:${list.id}`)
    .row()
    .text("👥 Members", `ct_members:${list.id}`)
    .text("🔗 Share", `ct_share:${list.id}`)
    .row()
    .text("« My Lists", "collab_list");
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: dmKeyboard
    });
  } catch (e) {}
});

bot.callbackQuery("collab_create", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  pendingTodoInput.set(String(userId), { action: "collab_create", timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      "➕ *Create Collaborative List*\n\n" +
      "Type a name for your shared list:\n\n" +
      "_Example: Party Planning_",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Cancel", "collab_list")
      }
    );
  } catch (e) {}
});

bot.callbackQuery("collab_join", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  pendingTodoInput.set(String(userId), { action: "collab_join", timestamp: Date.now() });
  
  try {
    await ctx.editMessageText(
      "🔗 *Join Collaborative List*\n\n" +
      "Enter the join code:\n\n" +
      "_Example: ABC123_",
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("❌ Cancel", "collab_list")
      }
    );
  } catch (e) {}
});

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

