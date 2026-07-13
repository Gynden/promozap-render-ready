import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";

const AUTH_DIR = process.env.WA_AUTH_DIR || path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.data/wa-auth",
);

type ConnectionStatus = "disconnected" | "connecting" | "waiting_qr" | "connected";

interface WhatsAppState {
  sock: WASocket | null;
  status: ConnectionStatus;
  qrDataUrl: string | null;
  meNumber: string | null;
  groups: { id: string; name: string }[];
  connecting: boolean;
  logger: ReturnType<typeof pino>;
}

// Guard against Vite HMR / ssrLoadModule re-instantiating the module and
// opening duplicate WhatsApp connections.
const globalKey = "__promozap_wa_state__";
const g = globalThis as unknown as Record<string, WhatsAppState | undefined>;

if (!g[globalKey]) {
  g[globalKey] = {
    sock: null,
    status: "disconnected",
    qrDataUrl: null,
    meNumber: null,
    groups: [],
    connecting: false,
    logger: pino({ level: "silent" }),
  };
}

const state = g[globalKey] as WhatsAppState;

export function getStatus() {
  return {
    status: state.status,
    qrDataUrl: state.status === "waiting_qr" ? state.qrDataUrl : null,
    meNumber: state.meNumber,
  };
}

export async function startConnection() {
  if (state.connecting || state.status === "connected") return getStatus();
  state.connecting = true;
  state.status = "connecting";

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: authState,
      logger: state.logger,
      printQRInTerminal: false,
    });

    state.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.qrDataUrl = await QRCode.toDataURL(qr);
        state.status = "waiting_qr";
      }

      if (connection === "open") {
        state.status = "connected";
        state.qrDataUrl = null;
        state.meNumber = sock.user?.id?.split(":")[0] ?? null;
        state.connecting = false;
        refreshGroups().catch(() => {});
      }

      if (connection === "close") {
        state.connecting = false;
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
          ?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          state.status = "disconnected";
          state.sock = null;
          state.meNumber = null;
          state.groups = [];
        } else {
          // Reconnect automatically on any other disconnect reason.
          state.status = "connecting";
          startConnection().catch(() => {});
        }
      }
    });

    return getStatus();
  } catch (err) {
    state.connecting = false;
    state.status = "disconnected";
    throw err;
  }
}

export async function logout() {
  if (state.sock) {
    try {
      await state.sock.logout();
    } catch {
      // ignore
    }
  }
  state.sock = null;
  state.status = "disconnected";
  state.qrDataUrl = null;
  state.meNumber = null;
  state.groups = [];
}

export async function refreshGroups() {
  if (!state.sock || state.status !== "connected") return state.groups;
  const map = await state.sock.groupFetchAllParticipating();
  state.groups = Object.values(map).map((g) => ({
    id: g.id,
    name: g.subject || g.id,
  }));
  return state.groups;
}

export function getCachedGroups() {
  return state.groups;
}

export async function sendTextMessage(jid: string, text: string) {
  if (!state.sock || state.status !== "connected") {
    throw new Error("WhatsApp não está conectado.");
  }
  await state.sock.sendMessage(jid, { text });
}

export async function sendImageMessage(
  jid: string,
  imageBuffer: Buffer,
  caption?: string,
) {
  if (!state.sock || state.status !== "connected") {
    throw new Error("WhatsApp não está conectado.");
  }
  await state.sock.sendMessage(jid, { image: imageBuffer, caption });
}
