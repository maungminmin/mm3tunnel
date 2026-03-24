
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      const userID = env.UUID || '85244195-2365-4222-9257-23456789abcd';
      const hostName = request.headers.get('Host');
      const vlessLink = `vless://${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>System Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
              body { margin: 0; background: #0f172a; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              .card { background: #1e293b; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; max-width: 400px; width: 90%; border: 1px solid #334155; }
              .splash-img { width: 100%; border-radius: 1rem; margin-bottom: 1.5rem; border: 2px solid #38bdf8; }
              .qr-code { background: white; padding: 10px; border-radius: 10px; margin-top: 1rem; width: 200px; height: 200px; }
              .config-box { background: #0f172a; padding: 10px; border-radius: 8px; font-size: 0.8rem; word-break: break-all; margin-top: 1rem; color: #38bdf8; border: 1px dashed #334155; }
              h1 { font-size: 1.5rem; margin: 0.5rem 0; color: #38bdf8; }
              p { color: #94a3b8; font-size: 0.9rem; }
          </style>
      </head>
      <body>
          <div class="card">
              <img src="https://raw.githubusercontent.com/cmliu/edgetunnel/main/assets/img.png" class="splash-img" alt="Nodes">
              <h1>Node Configuration</h1>
              <p>Scan the QR code to import settings</p>
              
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(vlessLink)}" class="qr-code" alt="VLESS QR">
              
              <div class="config-box">
                  ${vlessLink}
              </div>
              <p style="margin-top: 1rem; font-size: 0.7rem;">Status: <span style="color: #22c55e;">● Running</span></p>
          </div>
      </body>
      </html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    return await handleVLESS(request, env);
  }
};