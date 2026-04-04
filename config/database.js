// config/database.js
const sql = require('mssql');

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'BarcodeMES',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourPassword@123',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

async function getPool() {
    if (!pool) {
        pool = await sql.connect(config);
        console.log('✅ SQL Server connected');
    }
    return pool;
}

async function query(queryStr, params = {}) {
    const p = await getPool();
    const request = p.request();
    for (const [key, val] of Object.entries(params)) {
        request.input(key, val);
    }
    return request.query(queryStr);
}

async function execute(spName, params = {}) {
    const p = await getPool();
    const request = p.request();
    for (const [key, val] of Object.entries(params)) {
        request.input(key, val);
    }
    return request.execute(spName);
}

module.exports = { sql, getPool, query, execute };
