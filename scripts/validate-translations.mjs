#!/usr/bin/env node
/**
 * Translation Validation Script
 * 
 * Compares all locale files against the bundled English source (src/i18n/locales/en.json)
 * and reports any missing or extra keys.
 * 
 * Usage: node scripts/validate-translations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Paths
const BUNDLED_EN_PATH = path.join(projectRoot, 'src/i18n/locales/en.json');
const PUBLIC_LOCALES_DIR = path.join(projectRoot, 'public/locales');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Recursively extract all keys from an object with dot notation
 */
function extractKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Load and parse a JSON file
 */
function loadJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}Error loading ${filePath}: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Compare two sets of keys and return differences
 */
function compareKeys(sourceKeys, targetKeys) {
  const sourceSet = new Set(sourceKeys);
  const targetSet = new Set(targetKeys);
  
  const missing = sourceKeys.filter(key => !targetSet.has(key));
  const extra = targetKeys.filter(key => !sourceSet.has(key));
  
  return { missing, extra };
}

/**
 * Main validation function
 */
function validateTranslations() {
  console.log(`\n${colors.cyan}🌍 Translation Validation Script${colors.reset}\n`);
  console.log(`${colors.dim}Comparing all locales against bundled English source...${colors.reset}\n`);
  
  // Load bundled English (source of truth)
  const bundledEn = loadJson(BUNDLED_EN_PATH);
  if (!bundledEn) {
    console.error(`${colors.red}Failed to load bundled English file. Aborting.${colors.reset}`);
    process.exit(1);
  }
  
  const sourceKeys = extractKeys(bundledEn).sort();
  console.log(`${colors.blue}📋 Source (bundled English): ${sourceKeys.length} keys${colors.reset}\n`);
  
  // Get all locale files
  const localeFiles = fs.readdirSync(PUBLIC_LOCALES_DIR)
    .filter(file => file.endsWith('.json'))
    .sort();
  
  let totalIssues = 0;
  const results = [];
  
  for (const file of localeFiles) {
    const localePath = path.join(PUBLIC_LOCALES_DIR, file);
    const locale = loadJson(localePath);
    const langCode = file.replace('.json', '');
    
    if (!locale) {
      results.push({ file, status: 'error', missing: [], extra: [] });
      totalIssues++;
      continue;
    }
    
    const localeKeys = extractKeys(locale).sort();
    const { missing, extra } = compareKeys(sourceKeys, localeKeys);
    
    const hasIssues = missing.length > 0 || extra.length > 0;
    if (hasIssues) totalIssues++;
    
    results.push({
      file,
      langCode,
      status: hasIssues ? 'issues' : 'ok',
      keyCount: localeKeys.length,
      missing,
      extra,
    });
  }
  
  // Print results
  console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);
  
  for (const result of results) {
    if (result.status === 'error') {
      console.log(`${colors.red}❌ ${result.file}: Failed to load${colors.reset}`);
      continue;
    }
    
    const icon = result.status === 'ok' ? '✅' : '⚠️';
    const color = result.status === 'ok' ? colors.green : colors.yellow;
    
    console.log(`\n${color}${icon} ${result.file}${colors.reset} (${result.keyCount} keys)`);
    
    if (result.missing.length > 0) {
      console.log(`   ${colors.red}Missing ${result.missing.length} keys:${colors.reset}`);
      result.missing.slice(0, 10).forEach(key => {
        console.log(`      ${colors.dim}- ${key}${colors.reset}`);
      });
      if (result.missing.length > 10) {
        console.log(`      ${colors.dim}... and ${result.missing.length - 10} more${colors.reset}`);
      }
    }
    
    if (result.extra.length > 0) {
      console.log(`   ${colors.yellow}Extra ${result.extra.length} keys (not in source):${colors.reset}`);
      result.extra.slice(0, 5).forEach(key => {
        console.log(`      ${colors.dim}+ ${key}${colors.reset}`);
      });
      if (result.extra.length > 5) {
        console.log(`      ${colors.dim}... and ${result.extra.length - 5} more${colors.reset}`);
      }
    }
  }
  
  // Summary
  console.log(`\n${colors.dim}${'─'.repeat(60)}${colors.reset}`);
  console.log(`\n${colors.cyan}📊 Summary${colors.reset}`);
  console.log(`   Total locales: ${localeFiles.length}`);
  console.log(`   Source keys: ${sourceKeys.length}`);
  
  if (totalIssues === 0) {
    console.log(`   ${colors.green}✅ All locales are in sync!${colors.reset}\n`);
  } else {
    console.log(`   ${colors.yellow}⚠️  ${totalIssues} locale(s) have discrepancies${colors.reset}\n`);
  }
  
  // Also check if public/locales/en.json matches bundled
  const publicEn = loadJson(path.join(PUBLIC_LOCALES_DIR, 'en.json'));
  if (publicEn) {
    const publicEnKeys = extractKeys(publicEn).sort();
    const { missing, extra } = compareKeys(sourceKeys, publicEnKeys);
    
    if (missing.length > 0 || extra.length > 0) {
      console.log(`${colors.yellow}⚠️  Note: public/locales/en.json differs from bundled English${colors.reset}`);
      console.log(`${colors.dim}   Consider syncing them or removing public/locales/en.json${colors.reset}\n`);
    }
  }
  
  return totalIssues === 0 ? 0 : 1;
}

// Run validation
const exitCode = validateTranslations();
process.exit(exitCode);
