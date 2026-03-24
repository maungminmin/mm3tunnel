import { connect } from 'cloudflare:sockets';

export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      const userID = env.UUID || '56b1cbec-9519-4ead-9643-05f240a92107';
      const hostName = request.headers.get('Host');
      const vlessLink = `vless://${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>System Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
              body { margin: 0; background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              .card { background: #1e293b; padding: 2rem; border-radius: 1.5rem; text-align: center; max-width: 400px; width: 90%; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
              .splash-img { width: 100%; border-radius: 1rem; margin-bottom: 1.5rem; border: 2px solid #38bdf8; }
              .qr-code { background: white; padding: 10px; border-radius: 10px; margin-top: 1rem; width: 200px; height: 200px; }
              .config-box { background: #0f172a; padding: 10px; border-radius: 8px; font-size: 0.75rem; word-break: break-all; margin-top: 1rem; color: #38bdf8; border: 1px dashed #334155; }
              h1 { font-size: 1.4rem; margin: 0.5rem 0; color: #38bdf8; }
          </style>
      </head>
      <body>
          <div class="card">
              <img src="https://raw.githubusercontent.com/cmliu/edgetunnel/main/assets/img.png" class="splash-img">
              <h1>Node Active</h1>
              <p>Scan QR or copy link below</p>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vlessLink)}" class="qr-code">
              <div class="config-box">${vlessLink}</div>
          </div>
      </body>
      </html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    return await handleVLESS(request, env);
  }
};

async function handleVLESS(request, env) {
  const userID = env.UUID || '56b1cbec-9519-4ead-9643-05f240a92107';
  const proxyIP = env.PROXYIP || '147.185.161.34'; 

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();

  let remoteSocketWraper = { value: null };
  client.addEventListener('message', async (event) => {
    const message = event.data;
    if (remoteSocketWraper.value) {
      const writer = remoteSocketWraper.value.writable.getWriter();
      await writer.write(message);
      writer.releaseLock();
      return;
    }

    // VLESS Protocol Header Parsing
    const chunk = new Uint8Array(message);
    const addressType = chunk[17]; 
    const addressLength = chunk[18];
    const address = new TextDecoder().decode(chunk.slice(19, 19 + addressLength));
    const port = (chunk[19 + addressLength] << 8) | chunk[19 + addressLength + 1];

    try {
      const socket = connect({ hostname: address, port: port });
      remoteSocketWraper.value = socket;
      socket.readable.pipeTo(new WritableStream({
        write(chunk) { client.send(chunk); }
      }));
    } catch (e) {
      console.log("Socket connection failed: " + e.message);
    }
  });

  return new Response(null, { status: 101, webSocket: client });
}
