import { connect } from 'cloudflare:sockets';

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      return await vlessOverWS(request, env);
    }
    
    // Dashboard UI
    const host = request.headers.get('Host');
    const uuid = env.UUID || '56b1cbec-9519-4ead-9643-05f240a92107';
    const link = `vless://${uuid}@${host}:443?encryption=none&security=tls&sni=${host}&fp=randomized&type=ws&host=${host}&path=%2F%3Fed%3D2048#Myanmar-Bypass`;
    
    return new Response(`
      <html>
        <body style="background:#111; color:#0f0; font-family:monospace; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh;">
          <h2 style="color:#fff;">NODE STATUS: ONLINE</h2>
          <div style="background:#fff; padding:10px; border-radius:5px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}">
          </div>
          <p style="word-break:break-all; width:80%; margin-top:20px; color:#aaa;">${link}</p>
        </body>
      </html>`, { headers: { 'Content-Type': 'text/html' } });
  }
};

async function vlessOverWS(request, env) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);
  server.accept();

  let remoteSocket = null;
  const proxyIP = env.PROXYIP || 'cdn-all.xn--b6gac.eu.org';

  server.addEventListener('message', async ({ data }) => {
    if (remoteSocket) {
      const writer = remoteSocket.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return;
    }

    // Parse VLESS Header
    const buffer = new Uint8Array(data);
    if (buffer[0] !== 0) return; // Version check

    const port = (buffer[19 + buffer[18]] << 8) | buffer[19 + buffer[18] + 1];
    
    try {
      remoteSocket = connect({ hostname: proxyIP, port: port });
      remoteSocket.readable.pipeTo(new WritableStream({
        write(chunk) { server.send(chunk); },
        close() { server.close(); },
        abort() { server.close(); }
      })).catch(() => server.close());
    } catch (err) {
      server.close();
    }
  });

  return new Response(null, { status: 101, webSocket: client });
    }
