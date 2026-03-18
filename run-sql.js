const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "ceti",
    multipleStatements: true,
  });

  let sql = fs.readFileSync('./src/db/script.sql', 'utf8');

  sql = sql.replace(/^\uFEFF/, '');

  sql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
    .join('\n');

  await connection.query(sql);
  console.log('✅ Base de datos creada correctamente');
  await connection.end();
}

run().catch(err => {
  console.error('❌ Error ejecutando SQL:', err.message);
  process.exit(1);
});