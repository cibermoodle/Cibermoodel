const fs = require('fs');
const crypto = require('crypto');
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

  const hashActual = crypto.createHash('md5').update(sql).digest('hex');

  const hashFile = './src/db/.sql_hash';
  let hashGuardado = null;

  if (fs.existsSync(hashFile)) {
    hashGuardado = fs.readFileSync(hashFile, 'utf8').trim();
  }

  if (hashActual === hashGuardado) {
    console.log('✅ Sin cambios en script.sql, base de datos intacta');
    await connection.end();
    return;
  }

  console.log('🔄 Cambios detectados, actualizando base de datos...');
  await connection.query(sql);
  console.log('✅ Base de datos actualizada correctamente');

  fs.writeFileSync(hashFile, hashActual);

  await connection.end();
}

run().catch(err => {
  console.warn('⚠️  No se pudo conectar a MySQL en el prestart:', err.message);
  console.warn('   El servidor arrancará igualmente. Asegúrate de que MySQL esté activo.');
});