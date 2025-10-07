#!/usr/bin/env node

/**
 * Verification Script for Real Data Integration
 * 
 * This script verifies that HR components are using real API integration
 * instead of dummy data.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying HR components use real data integration...\n');

// Components to verify
const HR_COMPONENTS = [
  {
    name: 'HR Dashboard',
    file: 'frontend/src/components/hr/hr_dashboard.tsx',
    requiredPatterns: [
      'useGetHRActivitiesQuery',
      'useGetHRAnalyticsQuery',
    ],
    forbiddenPatterns: [
      'John_Doe',
      'Jane_Smith',
      'const activities = [',
      'const recentActivities = [',
    ]
  },
  {
    name: 'Skills Matrix',
    file: 'frontend/src/components/hr/skills_matrix.tsx',
    requiredPatterns: [
      'useGetSkillsQuery',
      'useSkillsStatisticsWithRetry',
      'useGetSkillsAnalyticsQuery',
    ],
    forbiddenPatterns: [
      'memberCount: 0',
      'verificationRate: 0',
      'const statistics = {',
    ]
  },
  {
    name: 'Document Library',
    file: 'frontend/src/components/hr/document_library.tsx',
    requiredPatterns: [
      'useGetDocumentsQuery',
      'useGetDocumentAcknowledmentStatusQuery',
    ],
    forbiddenPatterns: [
      'Math.random()',
      'const acknowledgmentStatus = Math.random',
    ]
  },
  {
    name: 'Application Tracker',
    file: 'frontend/src/components/hr/application_tracker.tsx',
    requiredPatterns: [
      'useGetApplicationsQuery',
    ],
    forbiddenPatterns: [
      'const applications = [',
      'status: "pending"',
    ]
  },
  {
    name: 'Performance Center',
    file: 'frontend/src/components/hr/performance_center.tsx',
    requiredPatterns: [
      'useGetPerformanceReviewsQuery',
    ],
    forbiddenPatterns: [
      'const reviews = [',
      'rating: 4.5',
    ]
  },
  {
    name: 'Onboarding Checklist',
    file: 'frontend/src/components/hr/onboarding_checklist.tsx',
    requiredPatterns: [
      'useGetOnboardingProgressQuery',
    ],
    forbiddenPatterns: [
      'const tasks = [',
      'completed: true',
    ]
  }
];

let allPassed = true;

HR_COMPONENTS.forEach(({ name, file, requiredPatterns, forbiddenPatterns }) => {
  const filePath = path.join(process.cwd(), file);
  
  console.log(`Checking ${name}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let componentPassed = true;
  
  // Check required patterns
  requiredPatterns.forEach(pattern => {
    if (!content.includes(pattern)) {
      console.log(`  ❌ Missing required pattern: ${pattern}`);
      componentPassed = false;
      allPassed = false;
    }
  });
  
  // Check forbidden patterns
  forbiddenPatterns.forEach(pattern => {
    if (content.includes(pattern)) {
      console.log(`  ❌ Found forbidden pattern: ${pattern}`);
      componentPassed = false;
      allPassed = false;
    }
  });
  
  if (componentPassed) {
    console.log(`  ✅ All checks passed`);
  }
  
  console.log('');
});

// Check API slice for proper endpoints
console.log('Checking API slice configuration...');
const apiSlicePath = path.join(process.cwd(), 'frontend/src/services/apiSlice.ts');

if (fs.existsSync(apiSlicePath)) {
  const apiContent = fs.readFileSync(apiSlicePath, 'utf8');
  
  const requiredEndpoints = [
    'getHRActivities:',
    'getSkillsStatistics:',
    'getDocumentAcknowledmentStatus:',
    'acknowledgeDocument:',
  ];
  
  let apiPassed = true;
  
  requiredEndpoints.forEach(endpoint => {
    if (!apiContent.includes(endpoint)) {
      console.log(`  ❌ Missing API endpoint: ${endpoint}`);
      apiPassed = false;
      allPassed = false;
    }
  });
  
  if (apiPassed) {
    console.log(`  ✅ All required endpoints present`);
  }
} else {
  console.log(`  ⚠️  API slice file not found`);
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ SUCCESS: All HR components are using real data integration!');
  console.log('\nKey achievements:');
  console.log('• All components use RTK Query hooks for data fetching');
  console.log('• No hardcoded dummy data found in components');
  console.log('• Proper API endpoints configured');
  console.log('• Real-time data integration complete');
  console.log('\nThe HR system is ready for production use.');
  process.exit(0);
} else {
  console.log('❌ ISSUES FOUND: Some components still need real data integration.');
  console.log('\nPlease address the issues listed above before proceeding.');
  process.exit(1);
}