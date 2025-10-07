#!/usr/bin/env node

/**
 * Cleanup Script for Dummy Data References
 * 
 * This script scans the codebase for any remaining dummy data references
 * and reports them for manual cleanup.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to search for (excluding legitimate uses)
const DUMMY_DATA_PATTERNS = [
  // Only search in source files, not tests or scripts
  { pattern: 'John_Doe', excludeExtra: ['*.test.*', '*.spec.*', 'scripts/**'] },
  { pattern: 'Jane_Smith', excludeExtra: ['*.test.*', '*.spec.*', 'scripts/**'] },
  // Only Math.random in HR components (exclude utility functions)
  { pattern: 'Math\\.random\\(\\).*acknowledgment|acknowledgment.*Math\\.random\\(\\)', excludeExtra: [] },
  // Hardcoded data patterns in HR components only
  { pattern: 'const.*activities.*=.*\\[.*John_Doe|Jane_Smith', excludeExtra: ['*.test.*'] },
  { pattern: 'const.*statistics.*=.*\\{.*0.*\\}', excludeExtra: ['*.test.*'] },
];

// Base directories to exclude
const BASE_EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.git/**',
  'docs/**',
];

// File extensions to include
const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

console.log('🔍 Scanning for dummy data references...\n');

let foundIssues = false;

// Function to scan files using ripgrep if available, otherwise use grep
function scanForPattern(patternObj) {
  try {
    const { pattern, excludeExtra = [] } = patternObj;
    const allExcludes = [...BASE_EXCLUDE_PATTERNS, ...excludeExtra];
    const excludeArgs = allExcludes.map(p => `--glob '!${p}'`).join(' ');
    const includeArgs = INCLUDE_EXTENSIONS.map(ext => `--glob '*${ext}'`).join(' ');
    
    let command;
    try {
      // Try ripgrep first (faster and better)
      command = `rg "${pattern}" ${excludeArgs} ${includeArgs} --line-number --no-heading --color never`;
      execSync('which rg', { stdio: 'ignore' });
    } catch {
      // Fall back to grep
      const excludeDirs = allExcludes.filter(p => p.includes('**')).map(p => p.replace('/**', '')).map(d => `--exclude-dir=${d}`).join(' ');
      command = `grep -r "${pattern}" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" ${excludeDirs} --line-number`;
    }
    
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return result.trim();
  } catch (error) {
    // No matches found or command failed
    return '';
  }
}

// Scan for each pattern
DUMMY_DATA_PATTERNS.forEach(patternObj => {
  const { pattern } = patternObj;
  console.log(`Searching for pattern: ${pattern}`);
  const results = scanForPattern(patternObj);
  
  if (results) {
    foundIssues = true;
    console.log(`❌ Found matches for "${pattern}":`);
    console.log(results);
    console.log('');
  } else {
    console.log(`✅ No matches found for "${pattern}"`);
  }
});

// Additional checks for specific files
const SPECIFIC_CHECKS = [
  {
    file: 'frontend/src/components/hr/hr_dashboard.tsx',
    check: (content) => {
      if (content.includes('John_Doe') || content.includes('Jane_Smith')) {
        return 'Contains hardcoded user names';
      }
      if (!content.includes('useGetHRActivitiesQuery')) {
        return 'Missing real API integration for activities';
      }
      return null;
    }
  },
  {
    file: 'frontend/src/components/hr/skills_matrix.tsx',
    check: (content) => {
      if (content.includes('memberCount={0}') && !content.includes('statistics')) {
        return 'Contains hardcoded zero member counts';
      }
      if (!content.includes('useGetSkillsStatisticsQuery') && !content.includes('useSkillsStatisticsWithRetry')) {
        return 'Missing real API integration for statistics';
      }
      return null;
    }
  },
  {
    file: 'frontend/src/components/hr/document_library.tsx',
    check: (content) => {
      if (content.includes('Math.random()')) {
        return 'Contains Math.random() simulation';
      }
      if (!content.includes('useGetDocumentAcknowledmentStatusQuery')) {
        return 'Missing real API integration for acknowledgments';
      }
      return null;
    }
  }
];

console.log('\n🔍 Running specific file checks...\n');

SPECIFIC_CHECKS.forEach(({ file, check }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const issue = check(content);
    
    if (issue) {
      foundIssues = true;
      console.log(`❌ ${file}: ${issue}`);
    } else {
      console.log(`✅ ${file}: Looks good`);
    }
  } else {
    console.log(`⚠️  ${file}: File not found`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));

if (foundIssues) {
  console.log('❌ CLEANUP NEEDED: Found dummy data references that need to be addressed.');
  console.log('\nNext steps:');
  console.log('1. Review the issues listed above');
  console.log('2. Replace dummy data with real API calls');
  console.log('3. Ensure proper error handling and loading states');
  console.log('4. Run tests to verify functionality');
  console.log('5. Re-run this script to verify cleanup');
  process.exit(1);
} else {
  console.log('✅ SUCCESS: No dummy data references found!');
  console.log('\nAll HR components are using real data integration.');
  console.log('The codebase is clean and ready for production.');
  process.exit(0);
}