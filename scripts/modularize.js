/**
 * Modularize Script
 * Automatically splits index.js into organized modules while preserving all functionality
 */

import fs from 'fs';
import path from 'path';

const INDEX_PATH = './index.js';
const SRC_DIR = './src';

// Read the entire index.js
const content = fs.readFileSync(INDEX_PATH, 'utf-8');
const lines = content.split('\n');

// Find all section markers
const sections = [];
let currentSection = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect section headers (// ===================== followed by // SECTION NAME)
  if (line.trim() === '// =====================') {
    // Look at next line for section name
    const nextLine = lines[i + 1];
    if (nextLine && nextLine.startsWith('// ') && !nextLine.includes('===')) {
      const sectionName = nextLine.replace(/^\/\/\s*/, '').trim();
      
      if (currentSection) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }
      
      currentSection = {
        name: sectionName,
        startLine: i,
        endLine: null
      };
    }
  }
}

// Close the last section
if (currentSection) {
  currentSection.endLine = lines.length - 1;
  sections.push(currentSection);
}

// Print section analysis
console.log('=== SECTION ANALYSIS ===\n');
console.log(`Total lines: ${lines.length}`);
console.log(`Total sections: ${sections.length}\n`);

// Group sections by category
const categories = {
  'config': [],
  'database': [],
  'state': [],
  'middleware': [],
  'features': [],
  'llm': [],
  'utils': [],
  'commands': [],
  'handlers': [],
  'other': []
};

const categoryKeywords = {
  'config': ['ENV', 'Model access', 'DeAPI'],
  'database': ['STORAGE', 'SUPABASE', 'TELEGRAM CHANNEL'],
  'state': ['IN-MEMORY', 'STATE'],
  'middleware': ['RATE LIMIT', 'ANTI-SPAM', 'MIDDLEWARE', 'GROUP ACTIVATION'],
  'features': ['USER', 'PARTNER', 'CHARACTER', 'TODO', 'WEBSEARCH', 'WEB SEARCH', 'IMAGE', 'INLINE SESSION', 'FEEDBACK'],
  'llm': ['LLM', 'PROVIDER', 'BOT + LLM'],
  'utils': ['HELPER', 'MARKDOWN', 'UI', 'CONVERTER', 'EXTRACT'],
  'commands': ['COMMAND'],
  'handlers': ['HANDLER', 'CALLBACK', 'INLINE MODE', 'MESSAGE HANDLER', 'WEBHOOK']
};

for (const section of sections) {
  let categorized = false;
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => section.name.toUpperCase().includes(kw.toUpperCase()))) {
      categories[cat].push(section);
      categorized = true;
      break;
    }
  }
  if (!categorized) {
    categories['other'].push(section);
  }
}

// Print categorized sections
for (const [cat, sects] of Object.entries(categories)) {
  if (sects.length > 0) {
    console.log(`\n=== ${cat.toUpperCase()} (${sects.length} sections) ===`);
    for (const s of sects) {
      const lineCount = s.endLine - s.startLine + 1;
      console.log(`  ${s.startLine + 1}-${s.endLine + 1}: ${s.name} (${lineCount} lines)`);
    }
  }
}

// Calculate total lines per category
console.log('\n=== LINES PER CATEGORY ===');
for (const [cat, sects] of Object.entries(categories)) {
  const totalLines = sects.reduce((sum, s) => sum + (s.endLine - s.startLine + 1), 0);
  if (totalLines > 0) {
    console.log(`${cat}: ${totalLines} lines`);
  }
}
