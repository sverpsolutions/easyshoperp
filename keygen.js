#!/usr/bin/env node
// ============================================================
//  Barcode MES — License Key Generator
//  VENDOR USE ONLY — DO NOT SHARE THIS FILE
//
//  Usage:
//    node scripts/keygen.js <MachineID> <Days>
//
//  Examples:
//    node scripts/keygen.js E711C6528C88 365     ← 1 year
//    node scripts/keygen.js E711C6528C88 180     ← 6 months
//    node scripts/keygen.js E711C6528C88 30      ← 30 day trial
// ============================================================

const { generateKey, validateKey } = require('../utils/license');

const machineId = (process.argv[2] || '').trim().toUpperCase();
const days      = parseInt(process.argv[3]) || 365;

// ── Validation ───────────────────────────────────────────────
if (!machineId || machineId.length < 8) {
    console.log('\n  ❌  ERROR: Please provide a valid Machine ID');
    console.log('\n  Usage:   node scripts/keygen.js <MachineID> <Days>');
    console.log('  Example: node scripts/keygen.js E711C6528C88 365\n');
    process.exit(1);
}

if (days < 1 || days > 3650) {
    console.log('\n  ❌  ERROR: Days must be between 1 and 3650\n');
    process.exit(1);
}

// ── Generate ─────────────────────────────────────────────────
const key = generateKey(machineId, days);
const val = validateKey(key, machineId);

const expiry   = val.expiryDate ? val.expiryDate.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '?';
const today    = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
const daysLeft = val.daysLeft || days;

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║       BARCODE MES — LICENSE KEY GENERATOR           ║');
console.log('╠══════════════════════════════════════════════════════╣');
console.log(`║  Machine ID  : ${machineId.padEnd(36)}║`);
console.log(`║  Duration    : ${String(days + ' days').padEnd(36)}║`);
console.log(`║  Valid From  : ${today.padEnd(36)}║`);
console.log(`║  Valid Until : ${expiry.padEnd(36)}║`);
console.log('╠══════════════════════════════════════════════════════╣');
console.log('║                                                      ║');
console.log(`║  KEY:  ${key.padEnd(46)}║`);
console.log('║                                                      ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('\n  ✅  Send this key to the customer.');
console.log('  ⚠️   This key ONLY works on machine: ' + machineId);
console.log('  ⚠️   Do NOT share keygen.js with anyone.\n');
