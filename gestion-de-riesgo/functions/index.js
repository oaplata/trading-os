const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Inicializar Firebase Admin
admin.initializeApp();

// Definir secrets
const telegramBotToken = defineSecret("TELEGRAM_BOT_TOKEN");
const telegramChatId = defineSecret("TELEGRAM_CHAT_ID");
const webhookSecret = defineSecret("WEBHOOK_SECRET");

// Referencia a Realtime Database
const db = admin.database();
const QUEUE_BASE = "/telegramQueue";
const QUEUE_PENDING = `${QUEUE_BASE}/pending`;
const QUEUE_SENT = `${QUEUE_BASE}/sent`;
const QUEUE_FAILED = `${QUEUE_BASE}/failed`;

/**
 * Helper para validar y lanzar errores
 */
function assert(condition, message, statusCode = 400) {
  if (!condition) {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  }
}

/**
 * Genera SHA1 hash para deduplicación
 */
function sha1(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

/**
 * Genera eventId determinístico para deduplicación
 */
function generateEventId(body, createdAt) {
  const {ticker, timeframe} = body;
  
  // Si TradingView envía barTime o time, usarlo para dedupe perfecto
  if (body.barTime || body.time) {
    const timeValue = body.barTime || body.time;
    return sha1(`${ticker}|${timeframe}|${timeValue}`);
  }
  
  // Si no hay barTime, usar createdAt redondeado a 5 segundos para dedupe parcial
  const roundedTime = Math.floor(createdAt / 5000) * 5000;
  return sha1(`${ticker}|${timeframe}|${roundedTime}`);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Valida el body del request (compatible con TradingView webhooks)
 */
function validateBody(body) {
  assert(body, "Body is required", 400);
  assert(typeof body === "object", "Body must be a JSON object", 400);

  // Validar secret (requerido para autenticación)
  assert(body.secret !== undefined, "Field 'secret' is required", 400);
  assert(typeof body.secret === "string", "Field 'secret' must be a string", 400);
  assert(body.secret.trim().length > 0, "Field 'secret' cannot be empty", 400);

  // Validar ticker (requerido)
  assert(body.ticker !== undefined, "Field 'ticker' is required", 400);
  assert(typeof body.ticker === "string", "Field 'ticker' must be a string", 400);
  const trimmedTicker = body.ticker.trim();
  assert(trimmedTicker.length > 0, "Field 'ticker' cannot be empty", 400);

  // Validar timeframe (opcional, default "1D")
  let timeframe = "1D";
  if (body.timeframe !== undefined) {
    assert(typeof body.timeframe === "string", "Field 'timeframe' must be a string", 400);
    timeframe = body.timeframe.trim() || "1D";
  }

  return {
    secret: body.secret.trim(),
    ticker: trimmedTicker,
    timeframe: timeframe,
    barTime: body.barTime || body.time || null,
  };
}

/**
 * Construye el mensaje para Telegram (formato simple de 2 líneas)
 */
function buildMessage(ticker, timeframe) {
  return `🚨 Señal activa\n📈 ${ticker} (${timeframe})`;
}

/**
 * Verifica si un eventId ya existe en cualquier cola (deduplicación)
 */
async function eventExists(eventId) {
  const pendingRef = db.ref(`${QUEUE_PENDING}/${eventId}`);
  const sentRef = db.ref(`${QUEUE_SENT}/${eventId}`);
  const failedRef = db.ref(`${QUEUE_FAILED}/${eventId}`);

  const [pendingSnap, sentSnap, failedSnap] = await Promise.all([
    pendingRef.once("value"),
    sentRef.once("value"),
    failedRef.once("value"),
  ]);

  return pendingSnap.exists() || sentSnap.exists() || failedSnap.exists();
}

/**
 * Encola un evento en Realtime Database
 */
async function enqueueEvent(eventId, ticker, timeframe, message, createdAt) {
  const eventData = {
    eventId,
    createdAt,
    ticker,
    timeframe,
    message,
    attempts: 0,
    lastError: null,
    nextRetryAt: null,
    lockedAt: null, // Lock inicial: no lockeado
  };

  await db.ref(`${QUEUE_PENDING}/${eventId}`).set(eventData);
  return eventData;
}

/**
 * Intenta lockear un evento en pending usando transacción atómica en lockedAt
 * Retorna true si el lock fue exitoso, false si ya estaba lockeado o no existe
 */
async function lockPendingEvent(eventId) {
  const lockedAtRef = db.ref(`${QUEUE_PENDING}/${eventId}/lockedAt`);
  const now = Date.now();
  const LOCK_TTL = 5 * 60 * 1000; // 5 minutos

  // Transacción atómica en lockedAt
  const result = await lockedAtRef.transaction((currentLockedAt) => {
    // Si currentLockedAt es null o undefined, el nodo no existe o no está lockeado
    if (currentLockedAt === null || currentLockedAt === undefined) {
      // Permitir lock
      return now;
    }

    // Si está lockeado, verificar si es stale (más de 5 minutos)
    const lockAge = now - currentLockedAt;
    if (lockAge > LOCK_TTL) {
      // Lock stale, permitir re-lock
      return now;
    }

    // Ya está lockeado y no es stale, abortar transacción
    return; // No cambiar el valor
  });

  return result.committed === true;
}

/**
 * Lee el payload completo de un evento en pending (debe estar lockeado)
 */
async function readPendingEvent(eventId) {
  const pendingRef = db.ref(`${QUEUE_PENDING}/${eventId}`);
  const snap = await pendingRef.once("value");
  if (!snap.exists()) {
    return null;
  }
  return snap.val();
}

/**
 * Libera el lock de un evento en pending
 */
async function unlockPendingEvent(eventId) {
  const lockedAtRef = db.ref(`${QUEUE_PENDING}/${eventId}/lockedAt`);
  await lockedAtRef.set(null);
}

/**
 * Mueve un evento de pending a sent (éxito)
 */
async function moveToSent(eventId, eventData) {
  const pendingRef = db.ref(`${QUEUE_PENDING}/${eventId}`);
  const sentRef = db.ref(`${QUEUE_SENT}/${eventId}`);

  // Preparar datos para sent (sin lockedAt)
  const {lockedAt, ...baseData} = eventData;
  const sentData = {
    ...baseData,
    sentAt: Date.now(),
  };

  await sentRef.set(sentData);
  await pendingRef.remove();
}

/**
 * Mueve un evento de pending a failed (máximo de intentos alcanzado)
 */
async function moveToFailed(eventId, eventData, error) {
  const pendingRef = db.ref(`${QUEUE_PENDING}/${eventId}`);
  const failedRef = db.ref(`${QUEUE_FAILED}/${eventId}`);

  // Preparar datos para failed (sin lockedAt)
  const {lockedAt, ...baseData} = eventData;
  const failedData = {
    ...baseData,
    failedAt: Date.now(),
    lastError: error,
  };

  await failedRef.set(failedData);
  await pendingRef.remove();
}

/**
 * Reintenta un evento: actualiza attempts y nextRetryAt en pending, libera lock
 */
async function retryEvent(eventId, eventData, error, retryAfter = null) {
  const pendingRef = db.ref(`${QUEUE_PENDING}/${eventId}`);

  const attempts = (eventData.attempts || 0) + 1;
  const now = Date.now();

  let nextRetryAt;
  if (retryAfter !== null) {
    // Rate limit: usar retry_after de Telegram
    nextRetryAt = now + (retryAfter * 1000) + 1000; // +1 segundo extra
  } else {
    // Backoff exponencial
    const backoffs = [10000, 30000, 120000, 300000]; // 10s, 30s, 2m, 5m
    const backoff = backoffs[Math.min(attempts - 1, backoffs.length - 1)];
    nextRetryAt = now + backoff;
  }

  // Actualizar attempts, lastError, nextRetryAt y liberar lock
  await pendingRef.update({
    attempts,
    lastError: error,
    nextRetryAt,
    lockedAt: null, // Liberar lock
  });
}

/**
 * Envía mensaje a Telegram con manejo de rate limiting
 */
async function sendTelegramMessage(token, chatId, message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    const errorCode = data.error_code;
    const errorMsg = data.description || "Unknown Telegram API error";
    const retryAfter = data.parameters?.retry_after || null;

    // Si es rate limit (429), retornar retry_after
    if (response.status === 429 || errorCode === 429) {
      return {
        success: false,
        rateLimited: true,
        retryAfter: retryAfter || 60, // Default 60s si no viene
        error: errorMsg,
      };
    }

    return {
      success: false,
      rateLimited: false,
      retryAfter: null,
      error: errorMsg,
    };
  }

  return {
    success: true,
    rateLimited: false,
    retryAfter: null,
    error: null,
  };
}

/**
 * Cloud Function: notifyTelegram (INGESTA)
 * 
 * Solo valida y encola eventos en Realtime Database.
 * NO envía mensajes a Telegram directamente.
 * 
 * Body JSON requerido:
 * {
 *   "secret": "WEBHOOK_SECRET_VALUE" (requerido),
 *   "ticker": "SPY" (requerido),
 *   "timeframe": "1H" (opcional, default "1D"),
 *   "barTime" o "time" (opcional, para deduplicación)
 * }
 */
exports.notifyTelegram = onRequest(
  {
    secrets: [webhookSecret],
    cors: true,
  },
  async (req, res) => {
    try {
      // Validar método
      assert(req.method === "POST", "Only POST method is allowed", 405);

      // Validar Content-Type
      const contentType = req.headers["content-type"];
      assert(
        contentType && contentType.includes("application/json"),
        "Content-Type must be application/json",
        400
      );

      // Validar y procesar body
      const validated = validateBody(req.body);

      // Validar secret (autenticación)
      assert(
        validated.secret === webhookSecret.value(),
        "Unauthorized",
        401
      );

      // Generar eventId para deduplicación
      const createdAt = Date.now();
      const eventId = generateEventId(validated, createdAt);

      // Verificar si ya existe (deduplicación)
      const exists = await eventExists(eventId);
      if (exists) {
        console.log("Event deduplicated", {eventId, ticker: validated.ticker});
        return res.status(200).json({ok: true, deduped: true});
      }

      // Construir mensaje
      const message = buildMessage(validated.ticker, validated.timeframe);

      // Encolar evento
      await enqueueEvent(
        eventId,
        validated.ticker,
        validated.timeframe,
        message,
        createdAt
      );

      console.log("Event enqueued", {
        eventId,
        ticker: validated.ticker,
        timeframe: validated.timeframe,
      });

      // Respuesta exitosa
      res.status(200).json({ok: true, enqueued: true});
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const errorMessage = error.message || "Internal server error";

      const finalErrorMessage = statusCode === 401
        ? "Unauthorized"
        : errorMessage;

      console.error("Error in notifyTelegram:", {
        statusCode,
        message: finalErrorMessage,
      });

      res.status(statusCode).json({
        ok: false,
        error: finalErrorMessage,
      });
    }
  }
);

/**
 * Cloud Function: processTelegramQueue (WORKER)
 * 
 * Scheduled function que procesa la cola de mensajes pendientes.
 * - Corre cada 1 minuto
 * - Toma hasta 60 items pendientes
 * - Envía 1 mensaje por segundo
 * - Maneja rate limiting (429) con retry_after
 * - Implementa backoff exponencial para otros errores
 */
exports.processTelegramQueue = onSchedule(
  {
    schedule: "every 1 minutes",
    secrets: [telegramBotToken, telegramChatId],
    timeZone: "UTC",
  },
  async (event) => {
    const startTime = Date.now();
    const maxProcessingTime = 50000; // 50 segundos máximo
    const maxItems = 60;
    const rateLimitDelay = 1000; // 1 segundo entre mensajes

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let retries = 0;
    let rateLimited = 0;

    try {
      // Obtener items pendientes (ordenados por createdAt, limit maxItems)
      const pendingRef = db.ref(QUEUE_PENDING);
      console.log(`Reading from ${QUEUE_PENDING}`);
      
      const pendingSnap = await pendingRef
        .orderByChild("createdAt")
        .limitToFirst(maxItems)
        .once("value");

      if (!pendingSnap.exists()) {
        console.log("No pending items in queue");
        return;
      }

      const now = Date.now();
      const pendingItems = [];
      
      // Recopilar candidatos (solo los que pueden ser procesados)
      pendingSnap.forEach((child) => {
        const item = child.val();
        const eventId = child.key;

        // Validar: solo procesar si no tiene nextRetryAt o ya pasó el tiempo
        if (item.nextRetryAt && item.nextRetryAt > now) {
          return; // Skip, aún no es tiempo de retry
        }

        // Validar: skip si está lockeado y no es stale (menos de 5 min)
        if (item.lockedAt) {
          const lockAge = now - item.lockedAt;
          const LOCK_TTL = 5 * 60 * 1000; // 5 minutos
          if (lockAge <= LOCK_TTL) {
            return; // Skip, está lockeado y no es stale
          }
          // Si es stale, permitir re-lock
        }

        pendingItems.push({
          eventId,
          ...item,
        });
      });

      console.log(`Processing ${pendingItems.length} items from queue`);

      // Procesar cada item
      for (const item of pendingItems) {
        // Verificar tiempo máximo
        if (Date.now() - startTime > maxProcessingTime) {
          console.log("Max processing time reached, stopping");
          break;
        }

        const {eventId} = item;

        try {
          // LOCK ATÓMICO: Intentar lockear el evento
          console.log(`Locking ${eventId}...`);
          const locked = await lockPendingEvent(eventId);

          if (!locked) {
            // No se pudo lockear (ya está lockeado por otro worker)
            console.log(`Skip locked ${eventId} (already locked by another worker)`);
            continue;
          }

          console.log(`Locked ${eventId}`);
          processed++;

          // Leer el payload completo (ya lockeado)
          const eventData = await readPendingEvent(eventId);
          if (!eventData) {
            // El nodo desapareció después del lock (raro pero posible)
            console.warn(`Event ${eventId} disappeared after lock, unlocking`);
            await unlockPendingEvent(eventId);
            continue;
          }

          // Enviar a Telegram
          const result = await sendTelegramMessage(
            telegramBotToken.value(),
            telegramChatId.value(),
            eventData.message
          );

          if (result.success) {
            // Éxito: mover a sent y borrar pending
            await moveToSent(eventId, eventData);
            sent++;
            console.log(`Sent ${eventId}`, {
              ticker: eventData.ticker,
            });
          } else if (result.rateLimited) {
            // Rate limit: reintentar con retry_after
            rateLimited++;
            const attempts = (eventData.attempts || 0) + 1;
            const retryAfter = result.retryAfter || 60;

            if (attempts >= 5) {
              // Máximo de intentos: mover a failed
              await moveToFailed(eventId, eventData, result.error);
              failed++;
              console.log(`Failed ${eventId} (max attempts, rate limited)`);
            } else {
              // Reintentar con retry_after (libera lock)
              await retryEvent(eventId, eventData, result.error, retryAfter);
              retries++;
              console.log(`Retry ${eventId} (rate limited, retry after ${retryAfter}s)`, {
                attempts,
              });
            }

            // Esperar antes de continuar
            await sleep(retryAfter * 1000 + 1000);
            continue; // No esperar el delay normal
          } else {
            // Otro error: reintentar con backoff
            const attempts = (eventData.attempts || 0) + 1;
            if (attempts >= 5) {
              // Máximo de intentos: mover a failed
              await moveToFailed(eventId, eventData, result.error);
              failed++;
              console.log(`Failed ${eventId} (max attempts)`, {
                attempts,
              });
            } else {
              // Reintentar con backoff (libera lock)
              await retryEvent(eventId, eventData, result.error);
              retries++;
              console.log(`Retry ${eventId}...`, {
                attempts,
                error: result.error,
              });
            }
          }

          // Rate limiting: esperar 1 segundo entre mensajes (solo si no fue rate limited)
          if (result.success || !result.rateLimited) {
            await sleep(rateLimitDelay);
          }
        } catch (error) {
          console.error(`Error processing item ${eventId}:`, error.message);
          // En caso de error inesperado, intentar liberar lock y reintentar
          try {
            const eventData = await readPendingEvent(eventId);
            if (eventData) {
              const attempts = (eventData.attempts || 0) + 1;
              if (attempts >= 5) {
                await moveToFailed(eventId, eventData, error.message);
                failed++;
              } else {
                await retryEvent(eventId, eventData, error.message);
                retries++;
              }
            } else {
              // Si no existe, solo liberar lock por si acaso
              await unlockPendingEvent(eventId);
            }
          } catch (recoveryError) {
            console.error(`Error recovering ${eventId}:`, recoveryError.message);
            // Último recurso: intentar liberar lock
            try {
              await unlockPendingEvent(eventId);
            } catch (unlockError) {
              console.error(`Error unlocking ${eventId}:`, unlockError.message);
            }
          }
        }
      }

      // Log resumen
      console.log("Queue processing completed", {
        processed,
        sent,
        failed,
        retries,
        rateLimited,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.error("Error in processTelegramQueue:", error);
      throw error;
    }
  }
);
