const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// SSL certificate paths
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

// Check if certificates exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('SSL certificates not found! Please run:');
  console.error('openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
  process.exit(1);
}

app.prepare().then(() => {
  const httpsServer = createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }
  );

  httpsServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://${hostname}:${port}`);
    console.log('> Camera access should now work!');
  });
}); 