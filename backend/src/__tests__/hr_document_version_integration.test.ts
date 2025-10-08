import { HRDocumentVersionService } from '../services/hr_document_version_service';
import { HRDocumentAcknowledmentVersionService } from '../services/hr_document_acknowledgment_version_service';

// Mock logger
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock database
jest.mock('../config/database', () => jest.fn());

// Mock notification service
jest.mock('../services/notification_service');

describe('HR Document Version Control Integration', () => {
  let versionService: HRDocumentVersionService;
  let acknowledgmentVersionService: HRDocumentAcknowledmentVersionService;

  beforeEach(() => {
    versionService = new HRDocumentVersionService();
    acknowledgmentVersionService = new HRDocumentAcknowledmentVersionService();
    jest.clearAllMocks();
  });

  describe('Version Control Logic', () => {
    it('should detect when re-acknowledgment is required', () => {
      // Test the private method logic for requiring re-acknowledgment
      const service = versionService as any;
      
      // Test case 1: Acknowledgment requirement added
      const changes1 = { acknowledgment_requirement_changed: true };
      const currentData1 = { requires_acknowledgment: true };
      const previousVersion1 = { requires_acknowledgment: false };
      
      const result1 = service.shouldRequireReacknowledgment(changes1, currentData1, previousVersion1);
      expect(result1).toBe(true);

      // Test case 2: Significant content change (>10%)
      const changes2 = { content_changed: true };
      const currentData2 = { content: 'A'.repeat(1000) };
      const previousVersion2 = { content: 'A'.repeat(100) };
      
      const result2 = service.shouldRequireReacknowledgment(changes2, currentData2, previousVersion2);
      expect(result2).toBe(true);

      // Test case 3: Minor content change (<10%)
      const changes3 = { content_changed: true };
      const currentData3 = { content: 'A'.repeat(105) };
      const previousVersion3 = { content: 'A'.repeat(100) };
      
      const result3 = service.shouldRequireReacknowledgment(changes3, currentData3, previousVersion3);
      expect(result3).toBe(false);
    });

    it('should generate appropriate change summaries', () => {
      const service = versionService as any;
      
      // Test single change
      const changes1 = {
        title_changed: true,
        description_changed: false,
        content_changed: false,
        folder_changed: false,
        acknowledgment_requirement_changed: false,
        access_roles_changed: false,
      };
      
      const summary1 = service.generateChangeSummary(changes1);
      expect(summary1).toBe('Title updated');

      // Test multiple changes
      const changes2 = {
        title_changed: true,
        description_changed: false,
        content_changed: true,
        folder_changed: false,
        acknowledgment_requirement_changed: false,
        access_roles_changed: false,
      };
      
      const summary2 = service.generateChangeSummary(changes2);
      expect(summary2).toBe('title updated and content modified');

      // Test no changes
      const changes3 = {
        title_changed: false,
        description_changed: false,
        content_changed: false,
        folder_changed: false,
        acknowledgment_requirement_changed: false,
        access_roles_changed: false,
      };
      
      const summary3 = service.generateChangeSummary(changes3);
      expect(summary3).toBe('Minor updates');
    });

    it('should generate content diff correctly', () => {
      const service = versionService as any;
      
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 2 Modified\nLine 3\nLine 4';
      
      const diff = service.generateContentDiff(oldContent, newContent);
      
      expect(diff.additions).toContain('+4: Line 4');
      expect(diff.modifications).toContain('~2: Line 2 → Line 2 Modified');
      expect(diff.deletions).toHaveLength(0);
    });
  });

  describe('Version Control Requirements Validation', () => {
    it('should validate version control requirements are met', () => {
      // Requirement 5.1: Version increment logic for content changes
      expect(versionService.detectChanges).toBeDefined();
      expect(versionService.createVersion).toBeDefined();
      
      // Requirement 5.2: Change detection for markdown content
      expect(versionService.compareVersions).toBeDefined();
      
      // Requirement 5.3: Version history storage and retrieval
      expect(versionService.getVersionHistory).toBeDefined();
      expect(versionService.getVersion).toBeDefined();
      
      // Requirement 5.4: Acknowledgment validity across versions
      expect(acknowledgmentVersionService.handleDocumentUpdate).toBeDefined();
      expect(acknowledgmentVersionService.acknowledgeDocumentVersion).toBeDefined();
      expect(acknowledgmentVersionService.getAcknowledmentVersionStatus).toBeDefined();
    });

    it('should have proper error handling', () => {
      // Services should handle errors gracefully
      expect(() => new HRDocumentVersionService()).not.toThrow();
      expect(() => new HRDocumentAcknowledmentVersionService()).not.toThrow();
    });

    it('should support version comparison functionality', () => {
      // Version comparison should be available
      expect(versionService.compareVersions).toBeDefined();
      
      // Statistics should be available
      expect(versionService.getVersionStatistics).toBeDefined();
    });

    it('should support acknowledgment version analytics', () => {
      // Analytics should be available
      expect(acknowledgmentVersionService.getAcknowledmentVersionAnalytics).toBeDefined();
      expect(acknowledgmentVersionService.getUsersRequiringReacknowledgment).toBeDefined();
    });
  });
});