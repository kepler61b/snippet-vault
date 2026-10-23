import { Agent, ProxyAgent, Dispatcher } from "undici";
import { SocksClient } from "socks";
import type { SocksClientOptions } from "socks";
import tls from "tls";

/**
 * Returns an Undici Dispatcher for the given proxy URL, or undefined if no proxy is configured.
 *
 * Supported formats:
 * - HTTP / HTTPS:  "http://127.0.0.1:8080", "http://user:pass@proxy.example.com:3128", "https://..."
 * - SOCKS4 / 5:    "socks5://127.0.0.1:10808", "socks5h://user:pass@192.168.1.50:1080", "socks4://..."
 */
export function getProxyDispatcher(proxyUrl?: string): Dispatcher | undefined {
  const raw = (
    proxyUrl ||
    process.env.AI_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.all_proxy ||
    process.env.ALL_PROXY ||
    ""
  ).trim();

  if (!raw) return undefined;

  try {
    const formatted = raw.includes("://") ? raw : `http://${raw}`;
    const parsed = new URL(formatted);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol.startsWith("socks")) {
      return createSocksDispatcher(parsed);
    }

    // Default to Undici ProxyAgent for HTTP / HTTPS proxies
    return new ProxyAgent({
      uri: parsed.toString(),
      requestTls: {
        rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
      },
    });
  } catch (err) {
    console.warn("[SnippetVault] Failed to initialize proxy dispatcher for:", raw, err);
    return undefined;
  }
}

function createSocksDispatcher(parsed: URL): Agent {
  const isSocks4 = parsed.protocol.startsWith("socks4");
  const proxyType = isSocks4 ? 4 : 5;
  const proxyPort = parseInt(parsed.port || "1080", 10);
  const proxyHost = parsed.hostname;
  const userId = parsed.username ? decodeURIComponent(parsed.username) : undefined;
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

  return new Agent({
    connect: (opts: any, cb: (err: Error | null, socket: any) => void) => {
      const destHost = opts.hostname || opts.host;
      const destPort = Number(opts.port);
      const isHttps = opts.protocol === "https:";

      const clientOptions: SocksClientOptions = {
        proxy: {
          host: proxyHost,
          port: proxyPort,
          type: proxyType,
          userId,
          password,
        },
        command: "connect",
        destination: {
          host: destHost,
          port: destPort,
        },
        timeout: 15000,
      };

      SocksClient.createConnection(clientOptions, (err, info) => {
        if (err) {
          return cb(err, null);
        }
        if (!info || !info.socket) {
          return cb(new Error("SOCKS proxy did not return a valid socket"), null);
        }

        if (isHttps) {
          let hasCallbackFired = false;
          const tlsSocket = tls.connect({
            socket: info.socket,
            servername: opts.servername || destHost,
            rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
          });

          tlsSocket.once("secureConnect", () => {
            if (!hasCallbackFired) {
              hasCallbackFired = true;
              cb(null, tlsSocket);
            }
          });

          tlsSocket.once("error", (tlsErr) => {
            if (!hasCallbackFired) {
              hasCallbackFired = true;
              cb(tlsErr, null);
            }
          });
        } else {
          cb(null, info.socket);
        }
      });
    },
  });
}
