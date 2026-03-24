import { connect } from 'cloudflare:sockets';

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      const url = new URL(request.url);
      const userID = env.UUID || '56b1cbec-9519-4ead-9643-05f240a92107';
      const hostName = request.headers.get('Host');
      const vlessLink = `vless://${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Node Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
              body { margin: 0; background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              .card { background: #1e293b; padding: 2rem; border-radius: 1.5rem; text-align: center; max-width: 400px; width: 90%; border: 1px solid #334155; }
              .qr-code { background: white; padding: 10px; border-radius: 10px; margin: 1rem 0; width: 200px; height: 200px; }
              .config-box { background: #0f172a; padding: 10px; border-radius: 8px; font-size: 0.75rem; word-break: break-all; color: #38bdf8; border: 1px dashed #334155; }
              h1 { font-size: 1.4rem; color: #38bdf8; }
          </style>
      </head>
      <body>
          <div class="card">
              <h1>Node Active</h1>
              <p>Scan QR for mm3.kktmm.qzz.io</p>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vlessLink)}" class="qr-code">
              <div class="config-box">${vlessLink}</div>
          </div>
      </body>
      </html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    return await vlessOverWSHandler(request, env);
  }
};

async function vlessOverWSHandler(request, env) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);
  server.accept();

  let remoteSocketWraper = { value: null };

  server.addEventListener('message', async ({ data }) => {
    if (remoteSocketWraper.value) {
      const writer = remoteSocketWraper.value.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return;
    }

    const reader = new Uint8Array(data);
    if (reader[0] !== 0) return;

    const addressLength = reader[18];
    const address = new TextDecoder().decode(reader.slice(19, 19 + addressLength));
    const port = (reader[19 + addressLength] << 8) | reader[19 + addressLength + 1];

    try {
      const socket = connect({ hostname: address, port: port });
      remoteSocketWraper.value = socket;
      socket.readable.pipeTo(new WritableStream({
        write(chunk) { server.send(chunk); }
      }));
    } catch (e) { console.error(e); }
  });

  return new Response(null, { status: 101, webSocket: client });
      }
