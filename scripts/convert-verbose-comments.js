#!/usr/bin/env node

/**
 * Script to convert remaining verbose JSDoc comments to oapi.path definitions
 */

const fs = require('fs');
const path = require('path');

// Mapping of verbose comments to oapi.path definitions
const conversions = [
  // HR Analytics Controller
  {
    file: 'backend/src/controllers/hr_analytics_controller.ts',
    replacements: [
      {
        old: `  /**
   * GET /api/organizations/:id/hr-analytics/reports
   * Get detailed HR analytics reports with filtering options
   */`,
        new: `  // oapi.path.get('/organizations/{organizationId}/hr-analytics/reports')`
      },
      {
        old: `  /**
   * GET /api/organizations/:id/hr-analytics/trends
   * Get trend analysis for specific metrics
   */`,
        new: `  // oapi.path.get('/organizations/{organizationId}/hr-analytics/trends')`
      },
      {
        old: `  /**
   * GET /api/organizations/:id/hr-analytics/alerts
   * Get current alerts based on metric thresholds
   */`,
        new: `  // oapi.path.get('/organizations/{organizationId}/hr-analytics/alerts')`
      },
      {
        old: `  /**
   * POST /api/organizations/:id/hr-analytics/export
   * Export analytics data in various formats
   */`,
        new: `  // oapi.path.post('/organizations/{organizationId}/hr-analytics/export')`
      },
      {
        old: `  /**
   * GET /api/organizations/:id/hr-analytics/summary
   * Get high-level summary metrics for quick overview
   */`,
        new: `  // oapi.path.get('/organizations/{organizationId}/hr-analytics/summary')`
      },
      {
        old: `  /**
   * POST /api/organizations/:id/hr-analytics/refresh-cache
   * Manually refresh analytics cache
   */`,
        new: `  // oapi.path.post('/organizations/{organizationId}/hr-analytics/refresh-cache')`
      }
    ]
  },
  // HR Application Controller
  {
    file: 'backend/src/controllers/hr_application_controller.ts',
    replacements: [
      {
        old: `  /**
   * GET /api/organizations/:rsi_org_id/applications/stats
   * Get application statistics for an organization
   */`,
        new: `  // oapi.path.get('/organizations/{organizationId}/applications/stats')`
      },
      {
        old: `  /**
   * GET /api/organizations/:rsi_org_id/applications/:applicationId/history
   * Get status history for a specific application
   */`,
        new: `  // oapi.path.get('/organizations/{organizationId}/applications/{applicationId}/history')`
      },
      {
        old: `  /**
   * POST /api/organizations/:rsi_org_id/applications/:applicationId/invite-code
   * Generate invite code for approved application
   */`,
        new: `  // oapi.path.post('/organizations/{organizationId}/applications/{applicationId}/invite-code')`
      },
      {
        old: `  /**
   * GET /api/organizations/:rsi_org_id/applications/analytics
   * Get application analytics
   */`,
        new: `  // oapi.path.get('/organizations/{organizationId}/applications/analytics')`
      }
    ]
  }
];

// Process each file
conversions.forEach(({ file, replacements }) => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  replacements.forEach(({ old, new: newText }) => {
    if (content.includes(old)) {
      content = content.replace(old, newText);
      modified = true;
      console.log(`✅ Converted comment in ${file}`);
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`📝 Updated ${file}`);
  }
});

console.log('\n🎉 Conversion complete!');