/*
 Simple helper to switch Prisma datasource provider between postgresql and mysql/mariadb
 based on DATABASE_TYPE before generating the Prisma Client.
*/
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run() {
  const repoRoot = process.cwd();
  const prismaSchemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
  if (!fs.existsSync(prismaSchemaPath)) {
    return;
  }

  const dbType = (process.env.DATABASE_TYPE || 'postgresql').toLowerCase();
  const desired = dbType === 'mysql' || dbType === 'mariadb' ? 'mysql' : 'postgresql';

  let schema = fs.readFileSync(prismaSchemaPath, 'utf8');
  const providerRegex = /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")[a-z]+("[\s\S]*?\})/m;
  const match = schema.match(providerRegex);
  if (!match) {
    return;
  }

  const current = match[0].includes('provider = "mysql"') ? 'mysql' : 'postgresql';
  if (current === desired) {
    return; // nothing to do
  }

  schema = schema.replace(/(provider\s*=\s*")[a-z]+("\s*)/m, `$1${desired}$2`);
  fs.writeFileSync(prismaSchemaPath, schema, 'utf8');
  console.log(`[switch-prisma-provider] Switched Prisma provider to ${desired}`);

  // Re-generate Prisma client to match provider
  try {
    const res = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', env: process.env });
    if (res.status !== 0) {
      console.warn('[switch-prisma-provider] prisma generate failed; continuing');
    }
  } catch (e) {
    console.warn('[switch-prisma-provider] Failed to run prisma generate:', e.message);
  }
}

run();
