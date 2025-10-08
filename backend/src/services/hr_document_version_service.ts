import db from '../config/database';
import { HRDocument } from '../models/hr_document_model';
import logger from '../config/logger';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  title: string;
  description?: string;
  word_count: number;
  estimated_reading_time: number;
  folder_path: string;
  requires_acknowledgment: boolean;
  access_roles: string[];
  change_summary?: string;
  change_metadata: any;
  created_by: string;
  created_at: Date;
}

export interface CreateVersionData {
  document_id: string;
  version_number: number;
  content: string;
  title: string;
  description?: string;
  word_count: number;
  estimated_reading_time: number;
  folder_path: string;
  requires_acknowledgment: boolean;
  access_roles: string[];
  change_summary?: string;
  change_metadata?: any;
  created_by: string;
}

export interface VersionComparison {
  from_version: number;
  to_version: number;
  changes: {
    title_changed: boolean;
    description_changed: boolean;
    content_changed: boolean;
    folder_changed: boolean;
    acknowledgment_requirement_changed: boolean;
    access_roles_changed: boolean;
    word_count_delta: number;
    reading_time_delta: number;
  };
  content_diff?: {
    additions: string[];
    deletions: string[];
    modifications: string[];
  };
}

export interface ChangeDetectionResult {
  has_significant_changes: boolean;
  has_content_changes: boolean;
  has_metadata_changes: boolean;
  change_summary: string;
  change_metadata: any;
  requires_reacknowledgment: boolean;
}

export class HRDocumentVersionService {
  /**
   * Creates a new version of a document
   */
  async createVersion(versionData: CreateVersionData): Promise<DocumentVersion> {
    try {
      const [version] = await db('hr_document_versions')
        .insert({
          ...versionData,
          change_metadata: versionData.change_metadata || {},
          created_at: new Date(),
        })
        .returning('*');

      logger.info('Document version created', {
        documentId: versionData.document_id,
        versionNumber: versionData.version_number,
        createdBy: versionData.created_by,
        changeSummary: versionData.change_summary,
      });

      return version;
    } catch (error) {
      logger.error('Failed to create document version', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: versionData.document_id,
        versionNumber: versionData.version_number,
      });
      throw error;
    }
  }

  /**
   * Gets the version history for a document
   */
  async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
    try {
      const versions = await db('hr_document_versions')
        .where({ document_id: documentId })
        .orderBy('version_number', 'desc');

      return versions;
    } catch (error) {
      logger.error('Failed to get version history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
      throw error;
    }
  }

  /**
   * Gets a specific version of a document
   */
  async getVersion(documentId: string, versionNumber: number): Promise<DocumentVersion | null> {
    try {
      const version = await db('hr_document_versions')
        .where({ document_id: documentId, version_number: versionNumber })
        .first();

      return version || null;
    } catch (error) {
      logger.error('Failed to get document version', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        versionNumber,
      });
      throw error;
    }
  }

  /**
   * Gets the latest version number for a document
   */
  async getLatestVersionNumber(documentId: string): Promise<number> {
    try {
      const result = await db('hr_document_versions')
        .where({ document_id: documentId })
        .max('version_number as max_version')
        .first();

      return result?.max_version || 0;
    } catch (error) {
      logger.error('Failed to get latest version number', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
      return 0;
    }
  }

  /**
   * Detects changes between current document state and previous version
   */
  async detectChanges(
    documentId: string,
    currentData: {
      title: string;
      description?: string;
      content: string;
      folder_path: string;
      requires_acknowledgment: boolean;
      access_roles: string[];
      word_count: number;
      estimated_reading_time: number;
    }
  ): Promise<ChangeDetectionResult> {
    try {
      // Get the latest version to compare against
      const latestVersion = await db('hr_document_versions')
        .where({ document_id: documentId })
        .orderBy('version_number', 'desc')
        .first();

      if (!latestVersion) {
        // This is the first version
        return {
          has_significant_changes: true,
          has_content_changes: true,
          has_metadata_changes: true,
          change_summary: 'Initial version',
          change_metadata: { is_initial_version: true },
          requires_reacknowledgment: false,
        };
      }

      // Compare current data with latest version
      const changes = {
        title_changed: currentData.title !== latestVersion.title,
        description_changed: (currentData.description || '') !== (latestVersion.description || ''),
        content_changed: currentData.content !== latestVersion.content,
        folder_changed: currentData.folder_path !== latestVersion.folder_path,
        acknowledgment_requirement_changed: currentData.requires_acknowledgment !== latestVersion.requires_acknowledgment,
        access_roles_changed: JSON.stringify(currentData.access_roles.sort()) !== JSON.stringify(latestVersion.access_roles.sort()),
        word_count_delta: currentData.word_count - latestVersion.word_count,
        reading_time_delta: currentData.estimated_reading_time - latestVersion.estimated_reading_time,
      };

      const hasContentChanges = changes.content_changed;
      const hasMetadataChanges = changes.title_changed || changes.description_changed || 
                                changes.folder_changed || changes.acknowledgment_requirement_changed || 
                                changes.access_roles_changed;

      const hasSignificantChanges = hasContentChanges || hasMetadataChanges;

      // Determine if re-acknowledgment is required
      const requiresReacknowledgment = this.shouldRequireReacknowledgment(changes, currentData, latestVersion);

      // Generate change summary
      const changeSummary = this.generateChangeSummary(changes);

      return {
        has_significant_changes: hasSignificantChanges,
        has_content_changes: hasContentChanges,
        has_metadata_changes: hasMetadataChanges,
        change_summary: changeSummary,
        change_metadata: {
          changes,
          previous_version: latestVersion.version_number,
          content_length_change: currentData.content.length - latestVersion.content.length,
        },
        requires_reacknowledgment: requiresReacknowledgment,
      };
    } catch (error) {
      logger.error('Failed to detect changes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
      throw error;
    }
  }

  /**
   * Compares two versions of a document
   */
  async compareVersions(
    documentId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionComparison> {
    try {
      const [fromVersionData, toVersionData] = await Promise.all([
        this.getVersion(documentId, fromVersion),
        this.getVersion(documentId, toVersion),
      ]);

      if (!fromVersionData || !toVersionData) {
        throw new Error('One or both versions not found');
      }

      const changes = {
        title_changed: fromVersionData.title !== toVersionData.title,
        description_changed: (fromVersionData.description || '') !== (toVersionData.description || ''),
        content_changed: fromVersionData.content !== toVersionData.content,
        folder_changed: fromVersionData.folder_path !== toVersionData.folder_path,
        acknowledgment_requirement_changed: fromVersionData.requires_acknowledgment !== toVersionData.requires_acknowledgment,
        access_roles_changed: JSON.stringify(fromVersionData.access_roles.sort()) !== JSON.stringify(toVersionData.access_roles.sort()),
        word_count_delta: toVersionData.word_count - fromVersionData.word_count,
        reading_time_delta: toVersionData.estimated_reading_time - fromVersionData.estimated_reading_time,
      };

      // Generate content diff if content changed
      let contentDiff;
      if (changes.content_changed) {
        contentDiff = this.generateContentDiff(fromVersionData.content, toVersionData.content);
      }

      return {
        from_version: fromVersion,
        to_version: toVersion,
        changes,
        content_diff: contentDiff,
      };
    } catch (error) {
      logger.error('Failed to compare versions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        fromVersion,
        toVersion,
      });
      throw error;
    }
  }

  /**
   * Creates a version when a document is updated
   */
  async createVersionOnUpdate(
    document: HRDocument,
    updatedBy: string,
    changeDetection: ChangeDetectionResult
  ): Promise<DocumentVersion | null> {
    try {
      // Only create a version if there are significant changes
      if (!changeDetection.has_significant_changes) {
        return null;
      }

      const nextVersionNumber = document.version + 1;

      const versionData: CreateVersionData = {
        document_id: document.id,
        version_number: nextVersionNumber,
        content: document.content,
        title: document.title,
        description: document.description,
        word_count: document.word_count,
        estimated_reading_time: document.estimated_reading_time,
        folder_path: document.folder_path,
        requires_acknowledgment: document.requires_acknowledgment,
        access_roles: document.access_roles,
        change_summary: changeDetection.change_summary,
        change_metadata: changeDetection.change_metadata,
        created_by: updatedBy,
      };

      return await this.createVersion(versionData);
    } catch (error) {
      logger.error('Failed to create version on update', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
        updatedBy,
      });
      throw error;
    }
  }

  /**
   * Gets version statistics for a document
   */
  async getVersionStatistics(documentId: string): Promise<{
    total_versions: number;
    first_version_date: Date | null;
    last_version_date: Date | null;
    total_contributors: number;
    version_frequency: number; // versions per day
  }> {
    try {
      const stats = await db('hr_document_versions')
        .where({ document_id: documentId })
        .select(
          db.raw('COUNT(*) as total_versions'),
          db.raw('MIN(created_at) as first_version_date'),
          db.raw('MAX(created_at) as last_version_date'),
          db.raw('COUNT(DISTINCT created_by) as total_contributors')
        )
        .first();

      const totalVersions = parseInt(stats?.total_versions as string) || 0;
      const firstVersionDate = stats?.first_version_date || null;
      const lastVersionDate = stats?.last_version_date || null;
      const totalContributors = parseInt(stats?.total_contributors as string) || 0;

      let versionFrequency = 0;
      if (firstVersionDate && lastVersionDate && totalVersions > 1) {
        const daysDiff = Math.max(1, Math.ceil((new Date(lastVersionDate).getTime() - new Date(firstVersionDate).getTime()) / (1000 * 60 * 60 * 24)));
        versionFrequency = totalVersions / daysDiff;
      }

      return {
        total_versions: totalVersions,
        first_version_date: firstVersionDate,
        last_version_date: lastVersionDate,
        total_contributors: totalContributors,
        version_frequency: versionFrequency,
      };
    } catch (error) {
      logger.error('Failed to get version statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
      throw error;
    }
  }

  // Private helper methods

  private shouldRequireReacknowledgment(
    changes: any,
    currentData: any,
    previousVersion: any
  ): boolean {
    // Re-acknowledgment is required if:
    // 1. Content has changed significantly (more than 10% change in length)
    // 2. Acknowledgment requirement was added
    // 3. Access roles were restricted (made more restrictive)

    if (changes.acknowledgment_requirement_changed && currentData.requires_acknowledgment) {
      return true; // Acknowledgment requirement was added
    }

    if (changes.content_changed) {
      const contentLengthChange = Math.abs(currentData.content.length - previousVersion.content.length);
      const changePercentage = contentLengthChange / Math.max(1, previousVersion.content.length);
      
      if (changePercentage > 0.1) { // More than 10% change
        return true;
      }
    }

    if (changes.access_roles_changed) {
      // Check if access became more restrictive
      const previousRoles = new Set(previousVersion.access_roles);
      const currentRoles = new Set(currentData.access_roles);
      
      // If current roles is not empty and previous was empty, it became more restrictive
      if (previousRoles.size === 0 && currentRoles.size > 0) {
        return true;
      }
      
      // If current roles is a subset of previous roles, it became more restrictive
      if (currentRoles.size > 0 && currentRoles.size < previousRoles.size) {
        const isSubset = Array.from(currentRoles).every(role => previousRoles.has(role));
        if (isSubset) {
          return true;
        }
      }
    }

    return false;
  }

  private generateChangeSummary(changes: any): string {
    const changeParts: string[] = [];

    if (changes.title_changed) changeParts.push('title updated');
    if (changes.description_changed) changeParts.push('description updated');
    if (changes.content_changed) changeParts.push('content modified');
    if (changes.folder_changed) changeParts.push('moved to different folder');
    if (changes.acknowledgment_requirement_changed) changeParts.push('acknowledgment requirement changed');
    if (changes.access_roles_changed) changeParts.push('access permissions updated');

    if (changeParts.length === 0) {
      return 'Minor updates';
    }

    if (changeParts.length === 1) {
      return changeParts[0].charAt(0).toUpperCase() + changeParts[0].slice(1);
    }

    const lastChange = changeParts.pop();
    return changeParts.join(', ') + ' and ' + lastChange;
  }

  private generateContentDiff(oldContent: string, newContent: string): {
    additions: string[];
    deletions: string[];
    modifications: string[];
  } {
    // Simple line-based diff implementation
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const additions: string[] = [];
    const deletions: string[] = [];
    const modifications: string[] = [];

    // This is a simplified diff - in a production system, you might want to use
    // a more sophisticated diff algorithm like Myers' algorithm
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined && newLine !== undefined) {
        additions.push(`+${i + 1}: ${newLine}`);
      } else if (oldLine !== undefined && newLine === undefined) {
        deletions.push(`-${i + 1}: ${oldLine}`);
      } else if (oldLine !== newLine) {
        modifications.push(`~${i + 1}: ${oldLine} → ${newLine}`);
      }
    }

    return { additions, deletions, modifications };
  }
}