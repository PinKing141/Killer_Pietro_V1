import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function getContentType(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function resolveRequestPath(urlPathname) {
  if (urlPathname === '/' || urlPathname === '') {
    return path.join(__dirname, 'assassin-sim.html');
  }

  const cleanPath = urlPathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(__dirname, cleanPath);

  if (!resolvedPath.startsWith(__dirname)) {
    return null;
  }

  return resolvedPath;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${HOST}:${PORT}`);
    const filePath = resolveRequestPath(requestUrl.pathname);

    if (!filePath) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': getContentType(filePath) });
    response.end(body);
  } catch (error) {
    const statusCode = error.code === 'ENOENT' ? 404 : 500;
    const message = statusCode === 404 ? 'Not found' : 'Internal server error';
    response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`GLORIA is running at http://${HOST}:${PORT}`);
  console.log('Press Ctrl+C to stop the server.');
});
