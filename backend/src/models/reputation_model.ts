import db from '../config/database';
import {
  PlayerReport,
  CreatePlayerReportData,
  UpdatePlayerReportData,
  PlayerReportAttestation,
  CreatePlayerReportAttestationData,
  PlayerComment,
  CreatePlayerCommentData,
  UpdatePlayerCommentData,
  PlayerCommentAttestation,
  CreatePlayerCommentAttestationData,
  PlayerTag,
  CreatePlayerTagData,
  PlayerTagAttestation,
  CreatePlayerTagAttestationData,
  PlayerReportWithAttestations,
  PlayerCommentWithAttestations,
  PlayerTagWithAttestations,
  // Enhanced Reporting System Types
  OrganizationReport,
  CreateOrganizationReportData,
  OrganizationReportCorroboration,
  CreateOrganizationReportCorroborationData,
  AltAccountReport,
  CreateAltAccountReportData,
  AltAccountReportCorroboration,
  CreateAltAccountReportCorroborationData,
  AffiliatedPeopleReport,
  CreateAffiliatedPeopleReportData,
  AffiliatedPeopleReportCorroboration,
  CreateAffiliatedPeopleReportCorroborationData,
} from '../types/reputation';
import logger from '../config/logger';

export class ReputationModel {
  // Report methods
  async createReport(reportData: CreatePlayerReportData): Promise<PlayerReport> {
    const insertData = {
      ...reportData,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [report] = await db('player_reports').insert(insertData).returning('*');
    return report;
  }

  async getReportById(id: string): Promise<PlayerReport | null> {
    const report = await db('player_reports').where({ id }).first();
    return report || null;
  }

  async getReportWithAttestations(id: string): Promise<PlayerReportWithAttestations | null> {
    const report = await this.getReportById(id);
    if (!report) return null;

    const attestations = await db('player_report_attestations')
      .where({ report_id: id });

    const attestation_counts = {
      support: attestations.filter(a => a.attestation_type === 'support').length,
      dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
      neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
    };

    return {
      ...report,
      attestations,
      attestation_counts,
    };
  }

  async updateReport(id: string, updateData: UpdatePlayerReportData): Promise<PlayerReport | null> {
    const [report] = await db('player_reports')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');
    return report || null;
  }

  async deleteReport(id: string): Promise<boolean> {
    const deleted = await db('player_reports').where({ id }).del();
    return deleted > 0;
  }

  async createReportAttestation(attestationData: CreatePlayerReportAttestationData): Promise<PlayerReportAttestation> {
    const insertData = {
      ...attestationData,
      created_at: new Date(),
    };

    const [attestation] = await db('player_report_attestations').insert(insertData).returning('*');
    return attestation;
  }

  async getUserReportAttestation(reportId: string, userId: string): Promise<PlayerReportAttestation | null> {
    const attestation = await db('player_report_attestations')
      .where({ report_id: reportId, attester_id: userId })
      .first();
    return attestation || null;
  }

  // Comment methods
  async createComment(commentData: CreatePlayerCommentData): Promise<PlayerComment> {
    const insertData = {
      ...commentData,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [comment] = await db('player_comments').insert(insertData).returning('*');
    return comment;
  }

  async getCommentById(id: string): Promise<PlayerComment | null> {
    const comment = await db('player_comments').where({ id }).first();
    return comment || null;
  }

  async getCommentWithAttestations(id: string): Promise<PlayerCommentWithAttestations | null> {
    const comment = await this.getCommentById(id);
    if (!comment) return null;

    const attestations = await db('player_comment_attestations')
      .where({ comment_id: id });

    const attestation_counts = {
      support: attestations.filter(a => a.attestation_type === 'support').length,
      dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
      neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
    };

    return {
      ...comment,
      attestations,
      attestation_counts,
    };
  }

  async updateComment(id: string, updateData: UpdatePlayerCommentData): Promise<PlayerComment | null> {
    const [comment] = await db('player_comments')
      .where({ id })
      .update({
        ...updateData,
        updated_at: new Date(),
      })
      .returning('*');
    return comment || null;
  }

  async deleteComment(id: string): Promise<boolean> {
    const deleted = await db('player_comments').where({ id }).del();
    return deleted > 0;
  }

  async createCommentAttestation(attestationData: CreatePlayerCommentAttestationData): Promise<PlayerCommentAttestation> {
    const insertData = {
      ...attestationData,
      created_at: new Date(),
    };

    const [attestation] = await db('player_comment_attestations').insert(insertData).returning('*');
    return attestation;
  }

  async updateCommentAttestation(commentId: string, userId: string, data: Partial<CreatePlayerCommentAttestationData>): Promise<PlayerCommentAttestation> {
    const [attestation] = await db('player_comment_attestations')
      .where({ comment_id: commentId, attester_id: userId })
      .update(data)
      .returning('*');
    
    return attestation;
  }

  async getUserCommentAttestation(commentId: string, userId: string): Promise<PlayerCommentAttestation | null> {
    const attestation = await db('player_comment_attestations')
      .where({ comment_id: commentId, attester_id: userId })
      .first();
    return attestation || null;
  }

  // Tag methods
  async createTag(tagData: CreatePlayerTagData): Promise<PlayerTag> {
    // Check if a tag with the same name already exists for this player
    const existingTag = await db('player_tags')
      .where({ 
        player_id: tagData.player_id, 
        tag_name: tagData.tag_name 
      })
      .first();

    if (existingTag) {
      // If tag exists, create a support attestation instead of a new tag
      const attestationData = {
        tag_id: existingTag.id,
        attester_id: tagData.tagger_id,
        attestation_type: 'support' as const,
        created_at: new Date(),
      };

      // Check if user already attested to this tag
      const existingAttestation = await this.getUserTagAttestation(existingTag.id, tagData.tagger_id);
      if (existingAttestation) {
        // User already attested, return the existing tag
        return existingTag;
      }

      // Create attestation
      await this.createTagAttestation(attestationData);
      
      // Update attestation counts
      await this.updateTagAttestationCount(existingTag.id);
      
      return existingTag;
    }

    // Create new tag if it doesn't exist
    const insertData = {
      ...tagData,
      created_at: new Date(),
    };

    const [tag] = await db('player_tags').insert(insertData).returning('*');
    return tag;
  }

  async getTagById(id: string): Promise<PlayerTag | null> {
    const tag = await db('player_tags').where({ id }).first();
    return tag || null;
  }

  async getTagWithAttestations(id: string): Promise<PlayerTagWithAttestations | null> {
    const tag = await this.getTagById(id);
    if (!tag) return null;

    const attestations = await db('player_tag_attestations')
      .where({ tag_id: id });

    const attestation_counts = {
      support: attestations.filter(a => a.attestation_type === 'support').length,
      dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
      neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
    };

    const score = this.calculateTagScore(tag.tag_type, attestation_counts);

    return {
      ...tag,
      attestations,
      attestation_counts,
      score,
    };
  }

  async deleteTag(id: string): Promise<boolean> {
    const deleted = await db('player_tags').where({ id }).del();
    return deleted > 0;
  }

  async createTagAttestation(attestationData: CreatePlayerTagAttestationData): Promise<PlayerTagAttestation> {
    const insertData = {
      ...attestationData,
      created_at: new Date(),
    };

    const [attestation] = await db('player_tag_attestations').insert(insertData).returning('*');
    return attestation;
  }

  async updateTagAttestation(tagId: string, userId: string, data: Partial<CreatePlayerTagAttestationData>): Promise<PlayerTagAttestation> {
    const [attestation] = await db('player_tag_attestations')
      .where({ tag_id: tagId, attester_id: userId })
      .update(data)
      .returning('*');
    
    return attestation;
  }

  async getUserTagAttestation(tagId: string, userId: string): Promise<PlayerTagAttestation | null> {
    const attestation = await db('player_tag_attestations')
      .where({ tag_id: tagId, attester_id: userId })
      .first();
    return attestation || null;
  }

  async updateCommentAttestationCount(commentId: string): Promise<void> {
    const attestations = await db('player_comment_attestations')
      .where({ comment_id: commentId });

    const counts = {
      support: attestations.filter(a => a.attestation_type === 'support').length,
      dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
      neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
    };

    await db('player_comments')
      .where({ id: commentId })
      .update({
        attestation_counts: counts,
        updated_at: new Date(),
      });
  }

  async updateTagAttestationCount(tagId: string): Promise<void> {
    const attestations = await db('player_tag_attestations')
      .where({ tag_id: tagId });

    const counts = {
      support: attestations.filter(a => a.attestation_type === 'support').length,
      dispute: attestations.filter(a => a.attestation_type === 'dispute').length,
      neutral: attestations.filter(a => a.attestation_type === 'neutral').length,
    };

    await db('player_tags')
      .where({ id: tagId })
      .update({
        attestation_count: counts.support + counts.dispute + counts.neutral,
        updated_at: new Date(),
      });
  }

  async getUserTag(playerId: string, userId: string, tagName: string): Promise<PlayerTag | null> {
    const tag = await db('player_tags')
      .where({ player_id: playerId, tagger_id: userId, tag_name: tagName })
      .first();
    return tag || null;
  }

  // Enhanced Reporting System Methods

  // Organization Reports
  async createOrganizationReport(data: CreateOrganizationReportData): Promise<OrganizationReport> {
    const insertData = {
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [report] = await db('organization_reports').insert(insertData).returning('*');
    return report;
  }

  async getOrganizationReportById(id: string): Promise<OrganizationReport | null> {
    const report = await db('organization_reports').where({ id }).first();
    return report || null;
  }

  async getOrganizationReportsByPlayer(playerId: string, page = 1, limit = 20): Promise<{ reports: OrganizationReport[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const reports = await db('organization_reports')
      .where({ player_id: playerId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalResult = await db('organization_reports')
      .where({ player_id: playerId })
      .count('* as count')
      .first();

    const total = totalResult ? parseInt(totalResult.count as string) : 0;

    return { reports, total };
  }

  async createOrganizationReportCorroboration(data: CreateOrganizationReportCorroborationData): Promise<OrganizationReportCorroboration> {
    const insertData = {
      ...data,
      created_at: new Date(),
    };

    const [corroboration] = await db('organization_report_corroborations').insert(insertData).returning('*');
    
    // Update corroboration count
    await this.updateOrganizationReportCorroborationCount(data.report_id);
    
    return corroboration;
  }

  async updateOrganizationReportCorroboration(reportId: string, userId: string, data: Partial<CreateOrganizationReportCorroborationData>): Promise<OrganizationReportCorroboration> {
    const [corroboration] = await db('organization_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .update(data)
      .returning('*');
    
    // Update corroboration count
    await this.updateOrganizationReportCorroborationCount(reportId);
    
    return corroboration;
  }

  async updateOrganizationReportCorroborationCount(reportId: string): Promise<void> {
    const counts = await db('organization_report_corroborations')
      .where({ report_id: reportId })
      .count('* as count')
      .first();

    const count = counts ? parseInt(counts.count as string) : 0;

    await db('organization_reports')
      .where({ id: reportId })
      .update({ corroboration_count: count, updated_at: new Date() });
  }

  async getUserOrganizationReportCorroboration(reportId: string, userId: string): Promise<OrganizationReportCorroboration | null> {
    const corroboration = await db('organization_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .first();
    return corroboration || null;
  }


  // Alt Account Reports
  async createAltAccountReport(data: CreateAltAccountReportData): Promise<AltAccountReport> {
    const insertData = {
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [report] = await db('alt_account_reports').insert(insertData).returning('*');
    return report;
  }

  async getAltAccountReportById(id: string): Promise<AltAccountReport | null> {
    const report = await db('alt_account_reports').where({ id }).first();
    return report || null;
  }

  async getAltAccountReportsByPlayer(playerId: string, page = 1, limit = 20): Promise<{ reports: AltAccountReport[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const reports = await db('alt_account_reports')
      .where({ main_player_id: playerId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalResult = await db('alt_account_reports')
      .where({ main_player_id: playerId })
      .count('* as count')
      .first();

    const total = totalResult ? parseInt(totalResult.count as string) : 0;

    return { reports, total };
  }

  async createAltAccountReportCorroboration(data: CreateAltAccountReportCorroborationData): Promise<AltAccountReportCorroboration> {
    const insertData = {
      ...data,
      created_at: new Date(),
    };

    const [corroboration] = await db('alt_account_report_corroborations').insert(insertData).returning('*');
    
    // Update corroboration count
    await this.updateAltAccountReportCorroborationCount(data.report_id);
    
    return corroboration;
  }

  async updateAltAccountReportCorroboration(reportId: string, userId: string, data: Partial<CreateAltAccountReportCorroborationData>): Promise<AltAccountReportCorroboration> {
    const [corroboration] = await db('alt_account_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .update(data)
      .returning('*');
    
    // Update corroboration count
    await this.updateAltAccountReportCorroborationCount(reportId);
    
    return corroboration;
  }

  async updateAltAccountReportCorroborationCount(reportId: string): Promise<void> {
    const counts = await db('alt_account_report_corroborations')
      .where({ report_id: reportId })
      .count('* as count')
      .first();

    const count = counts ? parseInt(counts.count as string) : 0;

    await db('alt_account_reports')
      .where({ id: reportId })
      .update({ corroboration_count: count, updated_at: new Date() });
  }

  async getUserAltAccountReportCorroboration(reportId: string, userId: string): Promise<AltAccountReportCorroboration | null> {
    const corroboration = await db('alt_account_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .first();
    return corroboration || null;
  }

  // Affiliated People Reports
  async createAffiliatedPeopleReport(data: CreateAffiliatedPeopleReportData): Promise<AffiliatedPeopleReport> {
    const insertData = {
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [report] = await db('affiliated_people_reports').insert(insertData).returning('*');
    return report;
  }

  async getAffiliatedPeopleReportById(id: string): Promise<AffiliatedPeopleReport | null> {
    const report = await db('affiliated_people_reports').where({ id }).first();
    return report || null;
  }

  async getAffiliatedPeopleReportsByPlayer(playerId: string, page = 1, limit = 20): Promise<{ reports: AffiliatedPeopleReport[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const reports = await db('affiliated_people_reports')
      .where({ main_player_id: playerId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalResult = await db('affiliated_people_reports')
      .where({ main_player_id: playerId })
      .count('* as count')
      .first();

    const total = totalResult ? parseInt(totalResult.count as string) : 0;

    return { reports, total };
  }

  async createAffiliatedPeopleReportCorroboration(data: CreateAffiliatedPeopleReportCorroborationData): Promise<AffiliatedPeopleReportCorroboration> {
    const insertData = {
      ...data,
      created_at: new Date(),
    };

    const [corroboration] = await db('affiliated_people_report_corroborations').insert(insertData).returning('*');
    
    // Update corroboration count
    await this.updateAffiliatedPeopleReportCorroborationCount(data.report_id);
    
    return corroboration;
  }

  async updateAffiliatedPeopleReportCorroboration(reportId: string, userId: string, data: Partial<CreateAffiliatedPeopleReportCorroborationData>): Promise<AffiliatedPeopleReportCorroboration> {
    const [corroboration] = await db('affiliated_people_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .update(data)
      .returning('*');
    
    // Update corroboration count
    await this.updateAffiliatedPeopleReportCorroborationCount(reportId);
    
    return corroboration;
  }

  async updateAffiliatedPeopleReportCorroborationCount(reportId: string): Promise<void> {
    const counts = await db('affiliated_people_report_corroborations')
      .where({ report_id: reportId })
      .count('* as count')
      .first();

    const count = counts ? parseInt(counts.count as string) : 0;

    await db('affiliated_people_reports')
      .where({ id: reportId })
      .update({ corroboration_count: count, updated_at: new Date() });
  }

  async getUserAffiliatedPeopleReportCorroboration(reportId: string, userId: string): Promise<AffiliatedPeopleReportCorroboration | null> {
    const corroboration = await db('affiliated_people_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .first();
    return corroboration || null;
  }

  // Update methods for Spectrum data
  async updateAltAccountReportSpectrumData(reportId: string, altSpectrumId?: string, altDisplayName?: string): Promise<void> {
    const updateData: any = { updated_at: new Date() };
    if (altSpectrumId) updateData.alt_spectrum_id = altSpectrumId;
    if (altDisplayName) updateData.alt_display_name = altDisplayName;

    await db('alt_account_reports')
      .where({ id: reportId })
      .update(updateData);
  }

  async updateAffiliatedPeopleReportSpectrumData(reportId: string, affiliatedSpectrumId?: string, affiliatedDisplayName?: string): Promise<void> {
    const updateData: any = { updated_at: new Date() };
    if (affiliatedSpectrumId) updateData.affiliated_spectrum_id = affiliatedSpectrumId;
    if (affiliatedDisplayName) updateData.affiliated_display_name = affiliatedDisplayName;

    await db('affiliated_people_reports')
      .where({ id: reportId })
      .update(updateData);
  }

  // Delete methods for removing votes/attestations
  async deleteCommentAttestation(commentId: string, userId: string): Promise<void> {
    await db('player_comment_attestations')
      .where({ comment_id: commentId, attester_id: userId })
      .del();
    
    // Update attestation count
    await this.updateCommentAttestationCount(commentId);
  }

  async deleteTagAttestation(tagId: string, userId: string): Promise<void> {
    await db('player_tag_attestations')
      .where({ tag_id: tagId, attester_id: userId })
      .del();
    
    // Update attestation count
    await this.updateTagAttestationCount(tagId);
  }

  async deleteOrganizationReportCorroboration(reportId: string, userId: string): Promise<void> {
    await db('organization_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .del();
    
    // Update corroboration count
    await this.updateOrganizationReportCorroborationCount(reportId);
  }

  async deleteAltAccountReportCorroboration(reportId: string, userId: string): Promise<void> {
    await db('alt_account_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .del();
    
    // Update corroboration count
    await this.updateAltAccountReportCorroborationCount(reportId);
  }

  async deleteAffiliatedPeopleReportCorroboration(reportId: string, userId: string): Promise<void> {
    await db('affiliated_people_report_corroborations')
      .where({ report_id: reportId, corroborator_id: userId })
      .del();
    
    // Update corroboration count
    await this.updateAffiliatedPeopleReportCorroborationCount(reportId);
  }

  // Utility methods
  private calculateTagScore(tagType: 'positive' | 'negative' | 'neutral', counts: { support: number; dispute: number; neutral: number }): number {
    const { support, dispute } = counts;
    const netScore = support - dispute;
    
    switch (tagType) {
      case 'positive':
        return netScore;
      case 'negative':
        return -netScore;
      case 'neutral':
      default:
        return 0;
    }
  }
}