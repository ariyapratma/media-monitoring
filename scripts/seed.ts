import http from 'http';
import fs from 'fs';
import path from 'path';

const SEED_FILE = path.join(process.cwd(), 'seed_mentions.json');

function seed() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`seed_mentions.json not found at ${SEED_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SEED_FILE, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    console.error('seed_mentions.json must contain an array of mentions');
    process.exit(1);
  }

  const postData = JSON.stringify(data);

  const options: http.RequestOptions = {
    hostname: 'localhost',
    port: 3005,
    path: '/internal/mentions/bulk',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(body);
    });
  });

  req.on('error', (e) => {
    console.error(`Error seeding data: ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

seed();
