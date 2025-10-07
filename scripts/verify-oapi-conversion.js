#!/usr/bin/env node

/**
 * Script to verify that all verbose OpenAPI comments have been converted to oapi.path definitions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying OpenAPI comment conversion...\n');

// Find all HR controllers
const hrControllers = [
  'backend/src/controllers/hr_activity_controller.ts',
  'backend/src/controllers/hr_analytics_controller.ts', 
  'backend/src/controllers/hr_application_controller.ts',
  'backend/src/controllers/hr_document_controller.ts',
  'backend/src/controllers/hr_onboarding_controller.ts',
  'backend/src/controllers/hr_performance_controller.ts',
  'backend/src/controllers/hr_skill_controller.ts',
  'backend/src/controllers/hr_skill_statistics_controller.ts'
];

let totalVerboseComments = 0;
let totalOapiPaths = 0;
let issuesFound = false;

hrControllers.forEach(controllerPath => {
  if (!fs.existsSync(controllerPath)) {
    console.log(`⚠️  File not found: ${controllerPath}`);
    return;
  }

  const content = fs.readFileSync(controllerPath, 'utf8');
  const fileName = path.basename(controllerPath);
  
  // Count verbose comments (JSDoc with API paths)
  const verboseComments = (content.match(/\/\*\*[\s\S]*?GET \/|\/\*\*[\s\S]*?POST \/|\/\*\*[\s\S]*?PUT \/|\/\*\*[\s\S]*?DELETE \/|\/\*\*[\s\S]*?PATCH \//g) || []).length;
  
  // Count oapi.path definitions
  const oapiPaths = (content.match(/\/\/ oapi\.path\./g) || []).length;
  
  // Count async methods (potential endpoints)
  const asyncMethods = (content.match(/async.*\(req.*Response\).*Promise.*void/g) || []).length;
  
  totalVerboseComments += verboseComments;
  totalOapiPaths += oapiPaths;
  
  console.log(`📄 ${fileName}:`);
  console.log(`   Verbose comments: ${verboseComments}`);
  console.log(`   oapi.path definitions: ${oapiPaths}`);
  console.log(`   Async methods: ${asyncMethods}`);
  
  if (verboseComments > 0) {
    console.log(`   ❌ Still has ${verboseComments} verbose comment(s)`);
    issuesFound = true;
  } else {
    console.log(`   ✅ All comments converted`);
  }
  
  console.log('');
});

console.log('='.repeat(50));
console.log(`📊 Summary:`);
console.log(`   Total verbose comments remaining: ${totalVerboseComments}`);
console.log(`   Total oapi.path definitions: ${totalOapiPaths}`);

if (totalVerboseComments === 0) {
  console.log('\n🎉 SUCCESS: All verbose OpenAPI comments have been converted to oapi.path definitions!');
  console.log('\nBenefits achieved:');
  console.log('• Dramatically reduced code verbosity');
  console.log('• Improved code readability');
  console.log('• Consistent documentation format');
  console.log('• Easy maintenance and updates');
  process.exit(0);
} else {
  console.log(`\n⚠️  REMAINING WORK: ${totalVerboseComments} verbose comment(s) still need conversion`);
  console.log('\nNext steps:');
  console.log('1. Review the files listed above');
  console.log('2. Convert remaining verbose comments to oapi.path format');
  console.log('3. Re-run this script to verify completion');
  process.exit(1);
}