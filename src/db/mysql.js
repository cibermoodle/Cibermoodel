const mysql = require('mysql2/promise');
const pool = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "ceti",
    database: "plataforma_educativa",
    timezone: 'local',
})

module.exports = pool;