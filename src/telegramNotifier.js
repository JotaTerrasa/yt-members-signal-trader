const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const MESSAGE_LIMIT = 4096;

export class TelegramNotifier {
  constructor({ configStore, onLog }) {
    this.configStore = configStore;
    this.onLog = onLog;
    this.warnedMissingConfig = false;
  }

  async notifyPosts(posts, { phase }) {
    if (!posts.length) {
      return { sent: 0, skipped: 0 };
    }

    const config = this.configStore.getTelegram({ includeToken: true });
    if (!config.enabled) {
      return { sent: 0, skipped: posts.length };
    }

    if (phase === 'backfill' && !config.notifyBackfill) {
      return { sent: 0, skipped: posts.length };
    }

    if (!config.botToken || !config.chatId) {
      if (!this.warnedMissingConfig) {
        this.log('Telegram esta activado, pero falta bot token o chat ID.', 'warn');
        this.warnedMissingConfig = true;
      }
      return { sent: 0, skipped: posts.length };
    }

    let sent = 0;
    for (const post of posts) {
      await this.sendMessage(config, formatPostMessage(post));
      sent += 1;
      await wait(350);
    }

    this.warnedMissingConfig = false;
    return { sent, skipped: posts.length - sent };
  }

  async sendTest() {
    const config = this.configStore.getTelegram({ includeToken: true });
    ensureConfigured(config);
    await this.sendMessage(config, '<b>Prueba Telegram</b>\nLas alertas del scraper llegan correctamente.');
  }

  async sendAlert(title, message) {
    const config = this.configStore.getTelegram({ includeToken: true });
    if (!config.enabled || config.notifyHealth === false) {
      return { sent: false, skipped: true };
    }
    ensureConfigured(config);
    await this.sendMessage(config, `<b>${escapeHtml(title)}</b>\n${escapeHtml(message)}`);
    return { sent: true, skipped: false };
  }

  async detectChats() {
    const config = this.configStore.getTelegram({ includeToken: true });
    if (!config.botToken) {
      throw new Error('Falta el bot token de Telegram.');
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${config.botToken}/getUpdates`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) {
      throw new Error(body.description || `Telegram devolvio HTTP ${response.status}`);
    }

    const chats = extractChats(body.result || []);
    if (!chats.length) {
      throw new Error('No hay chats recientes. Abre tu bot en Telegram, envia /start y vuelve a detectar.');
    }

    return chats;
  }

  async sendMessage(config, text) {
    ensureConfigured(config);
    const response = await fetch(`${TELEGRAM_API_BASE}${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: truncate(text, MESSAGE_LIMIT),
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) {
      throw new Error(body.description || `Telegram devolvio HTTP ${response.status}`);
    }
  }

  log(message, level = 'info') {
    this.onLog?.({
      level,
      message,
      at: new Date().toISOString()
    });
  }
}

function ensureConfigured(config) {
  if (!config.botToken) {
    throw new Error('Falta el bot token de Telegram.');
  }
  if (!config.chatId) {
    throw new Error('Falta el chat ID de Telegram.');
  }
}

function formatPostMessage(post) {
  const parts = [
    '<b>Nuevo post de YouTube</b>',
    post.author || post.channelName ? escapeHtml(post.author || post.channelName) : '',
    post.publishedText ? escapeHtml(post.publishedText) : '',
    post.isMembersOnly ? '<b>Solo miembros</b>' : '',
    '',
    escapeHtml(compactText(post.text || '(post sin texto)', 2600)),
    '',
    post.url ? `<a href="${escapeAttribute(post.url)}">Abrir post</a>` : ''
  ];

  return parts.filter((part, index) => part || index === 4 || index === 6).join('\n').trim();
}

function compactText(value, maxLength) {
  const text = String(value || '').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", '&#039;');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractChats(updates) {
  const byId = new Map();

  for (const update of updates) {
    const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    const chat = message?.chat || update.my_chat_member?.chat || update.chat_member?.chat;
    if (!chat?.id) {
      continue;
    }

    byId.set(String(chat.id), {
      id: String(chat.id),
      type: chat.type || 'unknown',
      title: chat.title || fullName(chat) || chat.username || String(chat.id),
      username: chat.username || '',
      lastMessageAt: message?.date ? new Date(message.date * 1000).toISOString() : null,
      updateId: update.update_id || 0
    });
  }

  return [...byId.values()].sort((a, b) => b.updateId - a.updateId);
}

function fullName(chat) {
  return [chat.first_name, chat.last_name].filter(Boolean).join(' ').trim();
}
