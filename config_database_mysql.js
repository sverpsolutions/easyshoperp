// config/database.js  — MySQL replacement for SQL Server
// Requires: npm install mysql2
// .env keys:  DB_HOST  DB_PORT  DB_NAME  DB_USER  DB_PASSWORD

'use strict';

const mysql = require('mysql2/promise');

// ── Connection pool ──────────────────────────────────────
const pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT || '3306'),
    database:           process.env.DB_NAME     || 'BarcodeMES',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    charset:            'utf8mb4',          // supports Hindi / emoji in names
    timezone:           '+05:30',           // IST — adjust to your server timezone
    dateStrings:        false,              // return JS Date objects
});

// ── Parameter substitution ───────────────────────────────
// SQL Server used named params: WHERE Username = @u  { u: value }
// MySQL uses positional params: WHERE Username = ?   [value]
//
// convertQuery() converts @name → ? and builds the values array
// in the order the placeholders appear in the SQL string.

function convertQuery(sql, params) {
    if (!params || typeof params !== 'object') {
        return { sql, values: [] };
    }

    const values = [];
    // Replace every @word with ? and capture the corresponding value
    const converted = sql.replace(/@(\w+)/g, (_, name) => {
        if (!(name in params)) {
            throw new Error(`MySQL query: missing parameter "@${name}"`);
        }
        values.push(params[name]);
        return '?';
    });
    return { sql: converted, values };
}

// ── query() ───────────────────────────────────────────────
// Drop-in replacement for the mssql query() helper.
// Returns an object shaped like { recordset: [...rows] }
// so existing routes need NO changes for simple SELECTs.

async function query(sql, params) {
    const { sql: convertedSql, values } = convertQuery(sql, params);
    const [rows] = await pool.query(convertedSql, values);
    return { recordset: rows };
}

// ── execute() ─────────────────────────────────────────────
// For INSERT / UPDATE / DELETE — returns affectedRows, insertId, etc.
// Also shaped as { recordset: [], rowsAffected: [n] } for compatibility.

async function execute(sql, params) {
    const { sql: convertedSql, values } = convertQuery(sql, params);
    const [result] = await pool.query(convertedSql, values);
    return {
        recordset:   [],
        rowsAffected: [result.affectedRows],
        insertId:     result.insertId,
    };
}

// ── callProcedure() ───────────────────────────────────────
// Calls a stored procedure and returns its first result-set.
// Usage: callProcedure('sp_StartJob', [jobId, machineId, operatorId])

async function callProcedure(name, args = []) {
    const placeholders = args.map(() => '?').join(', ');
    const [rows] = await pool.query(`CALL ${name}(${placeholders})`, args);
    // MySQL CALL returns [[resultSet], okPacket] — rows[0] is the first result set
    return { recordset: Array.isArray(rows[0]) ? rows[0] : rows };
}

// ── transaction() ─────────────────────────────────────────
// Helper for manual transactions when you need fine-grained control.
// Usage:
//   const t = await transaction();
//   try { await t.query(...); await t.commit(); }
//   catch(e) { await t.rollback(); throw e; }

async function transaction() {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    return {
        query: async (sql, params) => {
            const { sql: s, values } = convertQuery(sql, params);
            const [rows] = await conn.query(s, values);
            return { recordset: rows };
        },
        execute: async (sql, params) => {
            const { sql: s, values } = convertQuery(sql, params);
            const [result] = await conn.query(s, values);
            return { recordset: [], rowsAffected: [result.affectedRows], insertId: result.insertId };
        },
        commit:   async () => { await conn.commit();   conn.release(); },
        rollback: async () => { await conn.rollback(); conn.release(); },
    };
}

// ── testConnection() ──────────────────────────────────────
async function testConnection() {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        console.log('✅  MySQL connected —', process.env.DB_NAME);
    } catch (err) {
        console.error('❌  MySQL connection failed:', err.message);
        throw err;
    }
}

module.exports = { query, execute, callProcedure, transaction, testConnection, pool };
