/**
 * handlers/callbacks/collab-todo.js
 * Auto-extracted from index.js
 */

// =====================
// COLLABORATIVE TODO CALLBACKS
// Lines 9834-11091 from original index.js
// =====================

// =====================
// COLLABORATIVE TODO CALLBACKS HANDLERS
// =====================

// Track last tap for collab double-tap detection
const collabTodoLastTap = new Map();

bot.callbackQuery(/^ct_tap:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  const now = Date.now();
  const lastTap = collabTodoLastTap.get(userId);
  
  // Check for double-tap (same task within 3 seconds)
  if (lastTap && lastTap.taskId === taskId && lastTap.listId === listId && (now - lastTap.timestamp) < 3000) {
    // Double-tap detected - show action menu
    collabTodoLastTap.delete(userId);
    await ctx.answerCallbackQuery({ text: "⚙️ Opening options..." });
    
    const list = getCollabList(listId);
    const task = list?.tasks.find(t => t.id === taskId);
    if (!task || !list) {
      return ctx.answerCallbackQuery({ text: "Task not found", show_alert: true });
    }
    
    const checkbox = task.completed ? "✅" : "⬜";
    const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "medium" ? "🟡 Medium" : "🟢 Low";
    
    let completedByText = "";
    if (task.completed && task.completedBy) {
      const completer = task.completedBy.username || `User ${task.completedBy.userId.slice(-4)}`;
      completedByText = `\n✅ Completed by: ${escapeHTML(completer)}`;
    }
    
    const menuText = [
      `⚙️ <b>Task Options</b>`,
      ``,
      `${checkbox} ${escapeHTML(task.text)}`,
      ``,
      `👥 List: <b>${escapeHTML(list.name)}</b>`,
      `🎯 Priority: ${priorityText}${completedByText}`,
      ``,
      `<i>Choose an action:</i>`,
    ].join("\n");
    
    const keyboard = new InlineKeyboard()
      .text(task.completed ? "⬜ Uncomplete" : "✅ Complete", `ct_toggle:${listId}:${taskId}`)
      .text("🗑️ Delete", `ct_delete:${listId}:${taskId}`)
      .row()
      .text("🔴 High", `ct_pri:${listId}:${taskId}:high`)
      .text("🟡 Med", `ct_pri:${listId}:${taskId}:medium`)
      .text("🟢 Low", `ct_pri:${listId}:${taskId}:low`)
      .row()
      .text("← Back to List", `ct_back:${listId}`);
    
    try {
      await ctx.editMessageText(menuText, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (e) {}
    return;
  }
  
  // First tap - toggle task
  collabTodoLastTap.set(userId, { listId, taskId, timestamp: now });
  setTimeout(() => {
    const tap = collabTodoLastTap.get(userId);
    if (tap && tap.taskId === taskId && tap.listId === listId) {
      collabTodoLastTap.delete(userId);
    }
  }, 3000);
  
  const task = toggleCollabTask(userId, listId, taskId, ctx.from?.username);
  
  if (task) {
    const status = task.completed ? "✅ Completed!" : "⬜ Unchecked";
    await ctx.answerCallbackQuery({ text: status });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not toggle task", show_alert: true });
    return;
  }
  
  // Refresh the list view
  const list = getCollabList(listId);
  if (!list) return;
  
  const pendingCount = list.tasks.filter(t => !t.completed).length;
  const doneCount = list.tasks.filter(t => t.completed).length;
  const isOwner = list.ownerId === String(userId);
  
  let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
  listText += `📊 ${pendingCount} pending • ${doneCount} done • ${list.members.length} members\n`;
  listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
  
  if (list.tasks.length === 0) {
    listText += `<i>No tasks yet!</i>\n`;
  } else {
    const displayTasks = list.tasks.slice(0, 8);
    displayTasks.forEach((t, i) => {
      const checkbox = t.completed ? "✅" : "⬜";
      const text = t.completed ? `<s>${escapeHTML(t.text)}</s>` : escapeHTML(t.text);
      const priorityIndicator = t.priority === "high" ? " 🔴" : t.priority === "medium" ? " 🟡" : "";
      
      let completedByText = "";
      if (t.completed && t.completedBy && list.settings.showCompletedBy) {
        const completer = t.completedBy.username || `User ${t.completedBy.userId.slice(-4)}`;
        completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
      }
      
      listText += `${checkbox} ${i + 1}. ${text}${priorityIndicator}${completedByText}\n`;
    });
    
    if (list.tasks.length > 8) {
      listText += `\n<i>+${list.tasks.length - 8} more tasks...</i>\n`;
    }
  }
  
  listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
  
  const keyboard = new InlineKeyboard();
  
  const displayTasks = list.tasks.slice(0, 6);
  for (let i = 0; i < displayTasks.length; i += 2) {
    const task1 = displayTasks[i];
    const icon1 = task1.completed ? "✅" : "⬜";
    keyboard.text(`${icon1} ${i + 1}`, `ct_tap:${list.id}:${task1.id}`);
    
    if (displayTasks[i + 1]) {
      const task2 = displayTasks[i + 1];
      const icon2 = task2.completed ? "✅" : "⬜";
      keyboard.text(`${icon2} ${i + 2}`, `ct_tap:${list.id}:${task2.id}`);
    }
    keyboard.row();
  }
  
  keyboard
    .text("➕ Add", `ct_add:${list.id}`)
    .text("🗑️ Clear", `ct_clear:${list.id}`)
    .row()
    .text("👥 Members", `ct_members:${list.id}`)
    .text("🔗 Share", `ct_share:${list.id}`)
    .row()
    .switchInlineCurrent("← My Lists", "ct: ");
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_toggle:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  
  const task = toggleCollabTask(userId, listId, taskId, ctx.from?.username);
  
  if (task) {
    const status = task.completed ? "✅ Completed!" : "⬜ Unchecked";
    await ctx.answerCallbackQuery({ text: status });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not toggle task", show_alert: true });
    return;
  }
  
  // Go back to list
  const list = getCollabList(listId);
  if (!list) return;
  
  const pendingCount = list.tasks.filter(t => !t.completed).length;
  const doneCount = list.tasks.filter(t => t.completed).length;
  const isOwner = list.ownerId === String(userId);
  
  let listText = `👥 <b>${escapeHTML(list.name)}</b>${isOwner ? " 👑" : ""}\n\n`;
  listText += `📊 ${pendingCount} pending • ${doneCount} done • ${list.members.length} members\n`;
  listText += `🔑 Join code: <code>${list.joinCode}</code>\n\n`;
  
  const displayTasks = list.tasks.slice(0, 8);
  displayTasks.forEach((t, i) => {
    const checkbox = t.completed ? "✅" : "⬜";
    const text = t.completed ? `<s>${escapeHTML(t.text)}</s>` : escapeHTML(t.text);
    const priorityIndicator = t.priority === "high" ? " 🔴" : t.priority === "medium" ? " 🟡" : "";
    
    let completedByText = "";
    if (t.completed && t.completedBy && list.settings.showCompletedBy) {
      const completer = t.completedBy.username || `User ${t.completedBy.userId.slice(-4)}`;
      completedByText = ` <i>by ${escapeHTML(completer)}</i>`;
    }
    
    listText += `${checkbox} ${i + 1}. ${text}${priorityIndicator}${completedByText}\n`;
  });
  
  listText += `\n<i>Tap task to toggle • Tap again for options</i>`;
  
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_delete:(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  
  const deleted = deleteCollabTask(userId, listId, taskId);
  
  if (deleted) {
    await ctx.answerCallbackQuery({ text: "🗑️ Task deleted!" });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not delete task", show_alert: true });
    return;
  }
  
  // Go back to list
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_pri:(.+):(.+):(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const taskId = ctx.match[2];
  const priority = ctx.match[3];
  
  const task = updateCollabTask(userId, listId, taskId, { priority });
  
  if (task) {
    const emoji = priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "🟢";
    await ctx.answerCallbackQuery({ text: `${emoji} Priority set to ${priority}!` });
  } else {
    await ctx.answerCallbackQuery({ text: "Could not update task", show_alert: true });
    return;
  }
  
  // Go back to list
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_back:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_add:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery({ text: "➕ Use inline to add task" });
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const addText = [
    `➕ <b>Add Task to ${escapeHTML(list.name)}</b>`,
    ``,
    `Type in inline mode:`,
    `<code>ct:add:${listId} Your task here</code>`,
    ``,
    `<i>Quick options:</i>`,
    `• <code>#work</code> - Set category`,
    `• <code>!high</code> - Set priority`,
    `• <code>@today</code> - Set due date`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(addText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .switchInlineCurrent("➕ Add Task", `ct:add:${listId} `)
        .row()
        .text("← Back to List", `ct_back:${listId}`),
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_clear:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const cleared = clearCollabCompletedTasks(userId, listId);
  
  await ctx.answerCallbackQuery({ text: `🗑️ Cleared ${cleared} completed tasks!` });
  
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, 0);
  const keyboard = buildCollabListKeyboard(list, 0);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_members:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const isOwner = list.ownerId === String(userId);
  
  let membersText = [
    `👥 <b>Members of ${escapeHTML(list.name)}</b>`,
    ``,
  ];
  
  list.members.forEach((m, i) => {
    const roleEmoji = m.role === "owner" ? " 👑" : "";
    const name = m.username ? `@${m.username}` : `User ${m.userId.slice(-4)}`;
    membersText.push(`${i + 1}. ${escapeHTML(name)}${roleEmoji}`);
  });
  
  membersText.push(``);
  membersText.push(`🔑 Share code: <code>${list.joinCode}</code>`);
  
  const keyboard = new InlineKeyboard()
    .text("🔗 Share Code", `ct_share:${listId}`)
    .row();
  
  if (isOwner) {
    keyboard.text("🗑️ Delete List", `ct_delete_list:${listId}`).row();
  } else {
    keyboard.text("🚪 Leave List", `ct_leave:${listId}`).row();
  }
  
  keyboard.text("← Back to List", `ct_back:${listId}`);
  
  try {
    await ctx.editMessageText(membersText.join("\n"), {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_share:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  const shareText = [
    `🔗 <b>Share ${escapeHTML(list.name)}</b>`,
    ``,
    `Share this code with others:`,
    `<code>${list.joinCode}</code>`,
    ``,
    `They can join by typing:`,
    `<code>ct:join ${list.joinCode}</code>`,
    ``,
    `Or share this message directly!`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(shareText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("← Back to List", `ct_back:${listId}`),
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_leave:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const result = leaveCollabList(userId, listId);
  
  if (result.success) {
    await ctx.answerCallbackQuery({ text: "🚪 Left the list!" });
    
    try {
      await ctx.editMessageText("🚪 <b>You left the list.</b>\n\n<i>via StarzAI • Starz Check</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("👥 My Lists", "ct: "),
      });
    } catch (e) {}
  } else {
    await ctx.answerCallbackQuery({ text: result.error || "Could not leave list", show_alert: true });
  }
});

bot.callbackQuery(/^ct_delete_list:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const list = getCollabList(listId);
  if (!list) return;
  
  // Show confirmation
  const confirmText = [
    `⚠️ <b>Delete ${escapeHTML(list.name)}?</b>`,
    ``,
    `This will permanently delete the list and all ${list.tasks.length} tasks.`,
    ``,
    `All ${list.members.length} members will lose access.`,
    ``,
    `<b>This cannot be undone!</b>`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(confirmText, {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🗑️ Yes, Delete", `ct_confirm_delete:${listId}`)
        .text("❌ Cancel", `ct_back:${listId}`),
    });
  } catch (e) {}
});

bot.callbackQuery(/^ct_confirm_delete:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const result = deleteCollabList(userId, listId);
  
  if (result.success) {
    await ctx.answerCallbackQuery({ text: "🗑️ List deleted!" });
    
    try {
      await ctx.editMessageText("🗑️ <b>List deleted.</b>\n\n<i>via StarzAI • Starz Check</i>", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .switchInlineCurrent("👥 My Lists", "ct: "),
      });
    } catch (e) {}
  } else {
    await ctx.answerCallbackQuery({ text: result.error || "Could not delete list", show_alert: true });
  }
});

bot.callbackQuery(/^ct_page:(.+):(\d+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  await ctx.answerCallbackQuery();
  
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const listId = ctx.match[1];
  const page = parseInt(ctx.match[2]);
  const list = getCollabList(listId);
  if (!list) return;
  
  const listText = buildCollabListMessage(list, page);
  const keyboard = buildCollabListKeyboard(list, page);
  
  try {
    await ctx.editMessageText(listText, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } catch (e) {}
});

bot.callbackQuery("ct_noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

// /persona - Set custom AI personality
bot.command("persona", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const user = ensureUser(u.id, u);
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  
  if (!args) {
    // Show current persona and help
    const currentPersona = user.persona || "Default (helpful AI assistant)";
    return ctx.reply(
      `🎭 *Custom Persona*\n\nCurrent: _${currentPersona}_\n\n*Usage:*\n\`/persona friendly teacher\`\n\`/persona sarcastic comedian\`\n\`/persona wise philosopher\`\n\`/persona reset\` - Back to default\n\n_Your persona affects all AI responses!_`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  }
  
  if (args.toLowerCase() === "reset") {
    delete user.persona;
    saveUsers();
    return ctx.reply("✅ Persona reset to default helpful AI assistant!", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  // Set new persona
  user.persona = args.slice(0, 100); // Limit to 100 chars
  saveUsers();
  
  await ctx.reply(
    `✅ *Persona set!*\n\nAI will now respond as: _${user.persona}_\n\n_Use \`/persona reset\` to go back to default._`,
    {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /history - DISABLED: History feature removed to prevent database bloat
bot.command("history", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  return ctx.reply(
    "⚠️ *History feature has been disabled*\\n\\nThis feature has been removed to optimize database performance and reduce storage costs.\\n\\n_You can still use inline mode by typing @starztechbot in any chat!_",
    {
      parse_mode: "Markdown",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// /partner - Manage your AI partner
bot.command("partner", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  if (!u?.id) return;
  
  const args = ctx.message.text.split(" ").slice(1);
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ").trim();
  
  const partner = getPartner(u.id);
  
  // No subcommand - show partner setup with checklist buttons
  if (!subcommand) {
    return ctx.reply(buildPartnerSetupMessage(partner), {
      parse_mode: "Markdown",
      reply_markup: buildPartnerKeyboard(partner),
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  // Subcommands
  switch (subcommand) {
    case "name":
      if (!value)
        return ctx.reply("❌ Please provide a name: `/partner name Luna`", {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        });
      setPartner(u.id, { name: value.slice(0, 50) });
      return ctx.reply(`✅ Partner name set to: *${value.slice(0, 50)}*`, {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message?.message_id,
      });
      
    case "personality":
      if (!value)
        return ctx.reply(
          "❌ Please provide personality traits: `/partner personality cheerful, witty, caring`",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      setPartner(u.id, { personality: value.slice(0, 200) });
      return ctx.reply(
        `✅ Partner personality set to: _${value.slice(0, 200)}_`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "background":
      if (!value)
        return ctx.reply(
          "❌ Please provide a background: `/partner background A mysterious traveler from another dimension`",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      setPartner(u.id, { background: value.slice(0, 300) });
      return ctx.reply(
        `✅ Partner background set to: _${value.slice(0, 300)}_`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "style":
      if (!value)
        return ctx.reply(
          "❌ Please provide a speaking style: `/partner style speaks softly with poetic phrases`",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      setPartner(u.id, { style: value.slice(0, 200) });
      return ctx.reply(
        `✅ Partner speaking style set to: _${value.slice(0, 200)}_`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "chat":
      if (!partner?.name) {
        return ctx.reply(
          "❌ Please set up your partner first! Use `/partner name [name]` to start.",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      }
      setPartner(u.id, { active: true });
      return ctx.reply(
        `🤝🏻 *Partner mode activated!*\\n\\n${partner.name} is now ready to chat. Just send messages and they'll respond in character.\\n\\n_Use \`/partner stop\` to end the conversation._`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      
    case "stop":
      if (partner) {
        setPartner(u.id, { active: false });
      }
      return ctx.reply("⏹ Partner mode deactivated. Normal AI responses resumed.", {
        reply_to_message_id: ctx.message?.message_id,
      });
      
    case "clearchat":
      clearPartnerChat(u.id);
      return ctx.reply("🗑 Partner chat history cleared. Starting fresh!", {
        reply_to_message_id: ctx.message?.message_id,
      });
      
    case "clear":
    case "delete":
      clearPartner(u.id);
      return ctx.reply("❌ Partner deleted. Use `/partner` to create a new one.", {
        parse_mode: "Markdown",
        reply_to_message_id: ctx.message?.message_id,
      });
      
    default:
      return ctx.reply(
        `❓ Unknown subcommand: \`${subcommand}\`\\n\\n*Available:* name, personality, background, style, chat, stop, clearchat, clear`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
  }
});

// /char - Quick character mode for DM/GC
bot.command("char", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  const chat = ctx.chat;
  if (!u?.id) return;
  
  const args = ctx.message.text.split(" ").slice(1);
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(" ").trim();
  
  const activeChar = getActiveCharacter(u.id, chat.id);
  const savedChars = getSavedCharacters(u.id);
  
  // No subcommand - show character status and help with button list
  if (!subcommand) {
    const statusText = activeChar 
      ? `🎭 <b>Active Character:</b> ${escapeHTML(activeChar.name)}\\n\\n`
      : "🎭 <b>No active character</b>\\n\\n";
    
    const savedList = savedChars.length > 0
      ? `💾 <b>Saved Characters:</b>\\n${savedChars.map((c, i) => `${i + 1}. ${escapeHTML(c)}`).join("\\n")}\\n\\n`
      : "";
    
    const helpText = [
      statusText,
      savedList,
      "<b>Commands:</b>",
      "• /char yoda - Start as Yoda",
      "• /char save yoda - Save character",
      "• /char list - Show saved",
      "• /char remove yoda - Remove saved",
      "• /char stop or /default - Stop character mode",
      "",
      "<i>Tap a character button below to start!</i>",
    ].join("\\n");
    
    return ctx.reply(helpText, { 
      parse_mode: "HTML",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar),
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  // Subcommands
  switch (subcommand) {
    case "save": {
      if (!value)
        return ctx.reply("❌ Please provide a character name: `/char save yoda`", {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        });
      const result = saveCharacter(u.id, value);
      const emoji = result.success ? "✅" : "❌";
      return ctx.reply(`${emoji} ${result.message}`, {
        reply_to_message_id: ctx.message?.message_id,
      });
    }
    
    case "list": {
      if (savedChars.length === 0) {
        return ctx.reply(
          "💾 *No saved characters yet!*\\\\n\\\\nUse `/char save [name]` to save one.",
          {
            parse_mode: "Markdown",
            reply_to_message_id: ctx.message?.message_id,
          }
        );
      }
      const listText = [
        "💾 *Your Saved Characters:*",
        "",
        ...savedChars.map((c, i) => `${i + 1}. 🎭 ${c}`),
        "",
        "_Tap a button to start chatting!_",
      ].join("\n");
      return ctx.reply(listText, { 
        parse_mode: "Markdown",
        reply_markup: buildCharacterKeyboard(savedChars, activeChar)
      });
    }
    
    case "remove":
    case "delete": {
      if (!value) return ctx.reply("❌ Please provide a character name: `/char remove yoda`", { parse_mode: "Markdown" });
      const result = removeCharacter(u.id, value);
      const emoji = result.success ? "✅" : "❌";
      return ctx.reply(`${emoji} ${result.message}`);
    }
    
    case "stop": {
      if (!activeChar) {
        return ctx.reply("❌ No active character in this chat.");
      }
      clearActiveCharacter(u.id, chat.id);
      return ctx.reply(
        `⏹ Character mode stopped. ${activeChar.name} has left the chat.\n\n_Normal AI responses resumed._`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
    }
    
    default: {
      // Assume it's a character name to activate
      const characterName = args.join(" ").trim();
      if (!characterName) {
        return ctx.reply("❌ Please provide a character name: `/char yoda`", {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        });
      }
      
      setActiveCharacter(u.id, chat.id, characterName);
      
      const chatType = chat.type === "private" ? "DM" : "group";
      return ctx.reply(
        `🎭 *${characterName}* is now active in this ${chatType}!\n\nJust send messages and they'll respond in character.\n\n_Use \`/char stop\` to end._`,
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message?.message_id,
        }
      );
    }
  }
});

// /default - Stop character mode and return to normal AI
bot.command("default", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  if (!(await enforceCommandCooldown(ctx))) return;
  const u = ctx.from;
  const chat = ctx.chat;
  if (!u?.id) return;
  
  const activeChar = getActiveCharacter(u.id, chat.id);
  
  if (!activeChar) {
    return ctx.reply("✅ Already in default mode. No active character.", {
      reply_to_message_id: ctx.message?.message_id,
    });
  }
  
  clearActiveCharacter(u.id, chat.id);
  return ctx.reply(
    `⏹ <b>${escapeHTML(activeChar.name)}</b> has left the chat.\n\n<i>Normal AI responses resumed.</i>`,
    {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
    }
  );
});

// Build character selection keyboard
function buildCharacterKeyboard(savedChars, activeChar) {
  const keyboard = new InlineKeyboard();
  
  // Add saved character buttons (1 per row for full width)
  for (const char of savedChars) {
    const isActive = activeChar?.name?.toLowerCase() === char.toLowerCase();
    keyboard.text(`${isActive ? "✅" : "🎭"} ${char}`, `char_activate:${char}`);
    keyboard.row();
  }
  
  // Add stop button if character is active
  if (activeChar) {
    keyboard.text("⏹ Stop Character", "char_stop");
    keyboard.row();
  }
  
  // Add back to main menu button
  keyboard.text("« Back to Menu", "menu_back");
  
  return keyboard;
}

// Character callback handlers
bot.callbackQuery(/^char_activate:(.+)$/, async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const characterName = ctx.callbackQuery.data.split(":")[1];
  setActiveCharacter(userId, chatId, characterName);
  
  await ctx.answerCallbackQuery({ text: `🎭 ${characterName} activated!` });
  
  const savedChars = getSavedCharacters(userId);
  const activeChar = getActiveCharacter(userId, chatId);
  
  try {
    await ctx.editMessageText(
      `🎭 *${characterName}* is now active!\n\nJust send messages and they'll respond in character.\n\n_Use \`/char stop\` to end._`,
      { parse_mode: "Markdown", reply_markup: buildCharacterKeyboard(savedChars, activeChar) }
    );
  } catch (e) {
    // Message might be the same
  }
});

bot.callbackQuery("char_stop", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  const activeChar = getActiveCharacter(userId, chatId);
  if (!activeChar) {
    return ctx.answerCallbackQuery({ text: "No active character!", show_alert: true });
  }
  
  clearActiveCharacter(userId, chatId);
  
  await ctx.answerCallbackQuery({ text: "Character stopped!" });
  
  const savedChars = getSavedCharacters(userId);
  
  try {
    await ctx.editMessageText(
      `⏹ *${activeChar.name}* has left the chat.\n\n_Normal AI responses resumed._`,
      { parse_mode: "Markdown", reply_markup: buildCharacterKeyboard(savedChars, null) }
    );
  } catch (e) {
    // Message might be the same
  }
});

bot.callbackQuery("open_char", async (ctx) => {
  if (!(await enforceRateLimit(ctx))) return;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId) return ctx.answerCallbackQuery({ text: "Error", show_alert: true });
  
  await ctx.answerCallbackQuery();
  
  const activeChar = getActiveCharacter(userId, chatId);
  const savedChars = getSavedCharacters(userId);
  
  const statusText = activeChar 
    ? `🎭 *Active Character:* ${activeChar.name}\n\n`
    : "🎭 *No active character*\n\n";
  
  const savedList = savedChars.length > 0
    ? `💾 *Saved Characters:*\n${savedChars.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n`
    : "";
  
  const helpText = [
    statusText,
    savedList,
    "*Commands:*",
    "• `/char yoda` - Start as Yoda",
    "• `/char save yoda` - Save character",
    "• `/char list` - Show saved",
    "• `/char stop` or `/default` - Stop",
    "",
    "_Tap a character button to start!_",
  ].join("\n");
  
  try {
    await ctx.editMessageText(helpText, { 
      parse_mode: "Markdown",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar)
    });
  } catch (e) {
    // If edit fails, send as reply
    await ctx.reply(helpText, { 
      parse_mode: "Markdown",
      reply_markup: buildCharacterKeyboard(savedChars, activeChar)
    });
  }
});

// Partner callback handlers - Setup field buttons
const pendingPartnerInput = new Map(); // userId -&gt; { field, messageId }
// pendingFeedback: userId -&gt; { createdAt, source }
const pendingFeedback = new Map();

async function handleFeedbackIfActive(ctx, options = {}) {
  const u = ctx.from;
  const chat = ctx.chat;
  const msg = ctx.message;

  if (!u?.id || !chat || !msg) return false;

  const pendingFb = pendingFeedback.get(String(u.id));
  if (!pendingFb || chat.type !== "private") {
    return false;
  }

  pendingFeedback.delete(String(u.id));

  // 2 minute timeout
  if (Date.now() - pendingFb.createdAt > 2 * 60 * 1000) {
    await ctx.reply("⌛ Feedback mode expired. Tap the Feedback button again to retry.");
    return true;
  }

  if (!FEEDBACK_CHAT_ID) {
    await ctx.reply("⚠️ Feedback is not configured at the moment. Please try again later.");
    return true;
  }

  const rec = getUserRecord(u.id) || {};
  const feedbackId = `FB-${u.id}-${makeId(4)}`;
  const tier = (rec.tier || "free").toUpperCase();
  const banned = rec.banned ? "YES" : "no";
  const warningsCount = Array.isArray(rec.warnings) ? rec.warnings.length : 0;

  let muteInfo = "none";
  if (rec.mute) {
    const m = rec.mute;
    const scope = m.scope || "all";
    const untilStr = m.until ? new Date(m.until).toLocaleString() : "unknown";
    muteInfo = `scope=${scope}, until=${untilStr}`;
  }

  const sourceTag = pendingFb.source || "general";
  const sourceMap = {
    general: "General (menu)",
    command: "/feedback command",
    ban: "After ban notice",
    mute: "After mute notice",
    softban: "After softban notice",
    warn: "After warning notice",
    group_unauthed: "Unauthorized group",
  };
  const sourceLabel = sourceMap[sourceTag] || sourceTag;

  const username = rec.username || u.username || "";
  const name = rec.firstName || rec.first_name || u.first_name || u.firstName || "";

  const rawCaption =
    options.caption != null ? options.caption : (msg.caption || "");
  const captionText = (rawCaption || "").trim();

  const metaLines = [
    `📬 *New Feedback*`,
    ``,
    `🆔 *Feedback ID:* \`${feedbackId}\``,
    `👤 *User ID:* \`${u.id}\``,
    `🧾 *Context:* ${escapeMarkdown(sourceLabel)}`,
    `🎫 *Tier:* ${escapeMarkdown(tier)}`,
    `🚫 *Banned:* ${banned}`,
    `🔇 *Mute:* ${escapeMarkdown(muteInfo)}`,
    `⚠️ *Warnings:* ${warningsCount}`,
    `📛 *Username:* ${username ? escapeMarkdown("@" + username) : "_none_"}`,
    `👋 *Name:* ${name ? escapeMarkdown(name) : "_none_"}`,
  ];

  if (pendingFb.groupId) {
    metaLines.push(`👥 *Group ID:* \`${pendingFb.groupId}\``);
  }

  if (captionText) {
    metaLines.push(
      `📝 *Caption:* ${escapeMarkdown(captionText.slice(0, 500))}`
    );
  }

  const metaText = metaLines.join("\n");

  try {
    await bot.api.forwardMessage(FEEDBACK_CHAT_ID, chat.id, msg.message_id);
    await bot.api.sendMessage(FEEDBACK_CHAT_ID, metaText, {
      parse_mode: "Markdown",
    });
    await ctx.reply(
      "✅ *Feedback sent!* Thank you for helping improve StarzAI.\n\n" +
        `Your feedback ID is \`${feedbackId}\`. The team may reply to you using this ID.`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    console.error("Feedback forward error:", e.message);
    await ctx.reply("❌ Failed to send feedback. Please try again later.");
  }

  return true;
}

bot.callbackQuery("partner_set_name", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "name", timestamp: Date.now() });
  await ctx.reply("📝 *Enter partner name:*\n\n_Example: Luna, Alex, Shadow_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_personality", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "personality", timestamp: Date.now() });
  await ctx.reply("🎭 *Enter personality traits:*\n\n_Example: cheerful, witty, caring, playful_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_background", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "background", timestamp: Date.now() });
  await ctx.reply("📖 *Enter background/backstory:*\n\n_Example: A mysterious traveler from another dimension who loves stargazing_", { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_set_style", async (ctx) => {
  await ctx.answerCallbackQuery();
  pendingPartnerInput.set(String(ctx.from.id), { field: "style", timestamp: Date.now() });
  await ctx.reply("💬 *Enter speaking style:*\n\n_Example: speaks softly with poetic phrases, uses lots of emojis_", { parse_mode: "Markdown" });
});

bot.callbackQuery("open_partner", async (ctx) => {
  await ctx.answerCallbackQuery();
  const partner = getPartner(ctx.from.id);
  try {
    await ctx.editMessageText(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  } catch (e) {
    await ctx.reply(
      buildPartnerSetupMessage(partner),
      { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
    );
  }
});

bot.callbackQuery("do_stats", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  const userRecord = getUserRecord(u.id);
  
  if (!userRecord) {
    return ctx.answerCallbackQuery({ text: "❌ Not registered yet!", show_alert: true });
  }
  
  const model = ensureChosenModelValid(u.id);
  const memberSince = userRecord.createdAt ? new Date(userRecord.createdAt).toLocaleDateString() : "Unknown";
  const messages = userRecord.messageCount || 0;
  const queries = userRecord.inlineQueryCount || 0;
  
  const stats = [
    `📊 *Your Stats*`,
    ``,
    `👤 *User ID:* \`${u.id}\``,
    `🌟 *Tier:* ${userRecord.tier?.toUpperCase() || "FREE"}`,
    `🤖 *Model:* ${model.split("/").pop()}`,
    ``,
    `💬 *Messages:* ${messages}`,
    `⌨️ *Inline queries:* ${queries}`,
    `📅 *Member since:* ${memberSince}`,
  ].join("\n");
  
  try {
    await ctx.editMessageText(stats, { parse_mode: "Markdown", reply_markup: backToMainKeyboard() });
  } catch (e) {
    await ctx.reply(stats, { parse_mode: "Markdown", reply_markup: backToMainKeyboard() });
  }
});

bot.callbackQuery("partner_chat", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  const partner = getPartner(u.id);
  
  if (!partner?.name) {
    return ctx.reply("❌ Please set a name first!", { parse_mode: "Markdown" });
  }
  
  setPartner(u.id, { active: true });
  const updatedPartner = getPartner(u.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(updatedPartner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(updatedPartner) }
  );
  await ctx.reply(`🤝🏻 *${partner.name} is ready!*\n\nJust send messages and they'll respond in character.`, { parse_mode: "Markdown" });
});

bot.callbackQuery("partner_stop", async (ctx) => {
  await ctx.answerCallbackQuery();
  const u = ctx.from;
  setPartner(u.id, { active: false });
  const partner = getPartner(u.id);
  
  await ctx.editMessageText(
    buildPartnerSetupMessage(partner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
  );
});

bot.callbackQuery("partner_clearchat", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Chat history cleared!" });
  clearPartnerChat(ctx.from.id);
  const partner = getPartner(ctx.from.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(partner),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(partner) }
  );
});

bot.callbackQuery("partner_delete", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Partner deleted" });
  clearPartner(ctx.from.id);
  await ctx.editMessageText(
    buildPartnerSetupMessage(null),
    { parse_mode: "Markdown", reply_markup: buildPartnerKeyboard(null) }
  );
});

// Helper for time ago
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}


