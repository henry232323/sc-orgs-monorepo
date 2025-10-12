import db from '../config/database';
import { HRDocument } from '../models/hr_document_model';
import logger from '../config/logger';

export interface SearchResult {
  document: HRDocument;
  relevance_score: number;
  content_snippet?: string;
  highlighted_snippet?: string;
  match_positions?: Array<{
    start: number;
    end: number;
    field: 'title' | 'description' | 'content';
  }>;
}

export interface SearchOptions {
  query: string;
  organization_id: string;
  user_roles?: string[];
  folder_paths?: string[];
  requires_acknowledgment?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'relevance' | 'date' | 'title';
  include_content?: boolean;
  snippet_length?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  execution_time_ms: number;
  suggestions?: string[];
}

export class HRDocumentSearchService {
  private readonly SNIPPET_LENGTH = 200;
  private readonly SNIPPET_CONTEXT = 50;

  /**
   * Performs advanced full-text search with PostgreSQL's text search features
   */
  async searchDocuments(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Sanitize and prepare search query
      const searchQuery = this.sanitizeSearchQuery(options.query);
      const tsQuery = this.buildTsQuery(searchQuery);

      // Build the main search query
      let query = db('hr_documents')
        .where({ organization_id: options.organization_id })
        .select(
          'hr_documents.*',
          // Calculate relevance score using PostgreSQL's text search ranking
          db.raw(`
            ts_rank_cd(
              to_tsvector('english', 
                COALESCE(title, '') || ' ' || 
                COALESCE(description, '') || ' ' || 
                COALESCE(content, '')
              ), 
              to_tsquery('english', ?)
            ) as relevance_score
          `, [tsQuery])
        )
        .whereRaw(`
          to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(description, '') || ' ' || 
            COALESCE(content, '')
          ) @@ to_tsquery('english', ?)
        `, [tsQuery]);

      // Apply role-based access control
      if (options.user_roles && options.user_roles.length > 0) {
        query = query.where(function() {
          // Documents with empty access_roles are accessible to all
          this.whereRaw('jsonb_array_length(access_roles) = 0');
          
          // Or documents where user has at least one matching role
          options.user_roles!.forEach(role => {
            this.orWhereRaw('access_roles @> ?', [JSON.stringify([role])]);
          });
        });
      }

      // Apply additional filters
      if (options.folder_paths && options.folder_paths.length > 0) {
        query = query.whereIn('folder_path', options.folder_paths);
      }

      if (options.requires_acknowledgment !== undefined) {
        query = query.where({ requires_acknowledgment: options.requires_acknowledgment });
      }

      // Get total count for pagination
      const countQuery = query.clone()
        .clearSelect()
        .count('* as count');
      
      const totalResult = await countQuery.first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply sorting
      switch (options.sort_by) {
        case 'relevance':
          query = query.orderBy('relevance_score', 'desc');
          break;
        case 'date':
          query = query.orderBy('updated_at', 'desc');
          break;
        case 'title':
          query = query.orderBy('title', 'asc');
          break;
        default:
          query = query.orderBy('relevance_score', 'desc');
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.offset(options.offset);
      }

      // Execute search
      const documents = await query;

      // Process results and generate snippets
      const results: SearchResult[] = await Promise.all(
        documents.map(async (doc: any) => {
          const searchResult: SearchResult = {
            document: {
              id: doc.id,
              organization_id: doc.organization_id,
              title: doc.title,
              description: doc.description,
              content: options.include_content ? doc.content : '',
              word_count: doc.word_count,
              estimated_reading_time: doc.estimated_reading_time,
              folder_path: doc.folder_path,
              version: doc.version,
              requires_acknowledgment: doc.requires_acknowledgment,
              access_roles: doc.access_roles,
              uploaded_by: doc.uploaded_by,
              created_at: doc.created_at,
              updated_at: doc.updated_at,
            },
            relevance_score: parseFloat(doc.relevance_score) || 0,
          };

          // Generate content snippet and highlighting
          if (doc.content) {
            const snippet = this.generateContentSnippet(
              doc.content,
              searchQuery,
              options.snippet_length || this.SNIPPET_LENGTH
            );
            
            if (snippet) {
              searchResult.content_snippet = snippet.text;
              searchResult.highlighted_snippet = snippet.highlighted;
              searchResult.match_positions = snippet.positions;
            }
          }

          return searchResult;
        })
      );

      const executionTime = Date.now() - startTime;

      // Generate search suggestions for empty results
      let suggestions: string[] = [];
      if (results.length === 0) {
        suggestions = await this.generateSearchSuggestions(options.query, options.organization_id);
      }

      logger.info('Document search completed', {
        query: options.query,
        organizationId: options.organization_id,
        resultsCount: results.length,
        total,
        executionTimeMs: executionTime,
      });

      return {
        results,
        total,
        query: options.query,
        execution_time_ms: executionTime,
        suggestions,
      };

    } catch (error) {
      logger.error('Document search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: options.query,
        organizationId: options.organization_id,
      });

      return {
        results: [],
        total: 0,
        query: options.query,
        execution_time_ms: Date.now() - startTime,
        suggestions: [],
      };
    }
  }

  /**
   * Generates content snippets with highlighted search terms
   */
  private generateContentSnippet(
    content: string,
    searchQuery: string,
    maxLength: number = this.SNIPPET_LENGTH
  ): {
    text: string;
    highlighted: string;
    positions: Array<{ start: number; end: number; field: 'title' | 'description' | 'content' }>;
  } | null {
    if (!content || !searchQuery) return null;

    const searchTerms = this.extractSearchTerms(searchQuery);
    if (searchTerms.length === 0) return null;

    // Find the best match position in content
    const bestMatch = this.findBestMatchPosition(content, searchTerms);
    if (!bestMatch) return null;

    // Extract snippet around the best match
    const snippetStart = Math.max(0, bestMatch.position - this.SNIPPET_CONTEXT);
    const snippetEnd = Math.min(content.length, snippetStart + maxLength);
    
    let snippet = content.substring(snippetStart, snippetEnd);
    
    // Add ellipsis if truncated
    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < content.length) snippet = snippet + '...';

    // Generate highlighted version
    const highlighted = this.highlightSearchTerms(snippet, searchTerms);

    // Calculate match positions relative to snippet
    const positions = this.findMatchPositions(snippet, searchTerms, 'content');

    return {
      text: snippet,
      highlighted,
      positions,
    };
  }

  /**
   * Finds the best position in content to extract snippet from
   */
  private findBestMatchPosition(content: string, searchTerms: string[]): { position: number; score: number } | null {
    const contentLower = content.toLowerCase();
    let bestMatch: { position: number; score: number } | null = null;

    // Look for positions where multiple search terms appear close together
    for (let i = 0; i < content.length - this.SNIPPET_LENGTH; i += 50) {
      const window = contentLower.substring(i, i + this.SNIPPET_LENGTH);
      let score = 0;

      searchTerms.forEach(term => {
        const termLower = term.toLowerCase();
        let pos = 0;
        while ((pos = window.indexOf(termLower, pos)) !== -1) {
          score += termLower.length;
          pos += termLower.length;
        }
      });

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { position: i, score };
      }
    }

    return bestMatch;
  }

  /**
   * Highlights search terms in text
   */
  private highlightSearchTerms(text: string, searchTerms: string[]): string {
    let highlighted = text;
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }

  /**
   * Finds positions of search terms in text
   */
  private findMatchPositions(
    text: string,
    searchTerms: string[],
    field: 'title' | 'description' | 'content'
  ): Array<{ start: number; end: number; field: 'title' | 'description' | 'content' }> {
    const positions: Array<{ start: number; end: number; field: 'title' | 'description' | 'content' }> = [];
    const textLower = text.toLowerCase();

    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      let pos = 0;
      
      while ((pos = textLower.indexOf(termLower, pos)) !== -1) {
        positions.push({
          start: pos,
          end: pos + term.length,
          field,
        });
        pos += term.length;
      }
    });

    return positions.sort((a, b) => a.start - b.start);
  }

  /**
   * Sanitizes search query to prevent injection attacks
   */
  private sanitizeSearchQuery(query: string): string {
    if (!query) return '';
    
    // Remove potentially dangerous characters and normalize whitespace
    return query
      .replace(/[<>'"&]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit query length
  }

  /**
   * Builds PostgreSQL tsquery from search terms
   */
  private buildTsQuery(query: string): string {
    if (!query) return '';

    // Split into terms and handle phrases
    const terms = this.extractSearchTerms(query);
    
    if (terms.length === 0) return '';

    // Build tsquery with OR logic for better recall
    return terms
      .map(term => term.replace(/[^\w\s]/g, '')) // Remove special chars
      .filter(term => term.length > 0)
      .map(term => `${term}:*`) // Add prefix matching
      .join(' | '); // OR logic
  }

  /**
   * Extracts individual search terms from query
   */
  private extractSearchTerms(query: string): string[] {
    if (!query) return [];

    // Handle quoted phrases and individual terms
    const terms: string[] = [];
    const regex = /"([^"]+)"|(\S+)/g;
    let match;

    while ((match = regex.exec(query)) !== null) {
      const term = match[1] || match[2]; // Quoted phrase or individual term
      if (term && term.length > 1) { // Ignore single characters
        terms.push(term);
      }
    }

    return terms;
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generates search suggestions for empty results
   */
  private async generateSearchSuggestions(query: string, organizationId: string): Promise<string[]> {
    try {
      // Get common terms from document titles and content
      const commonTerms = await db('hr_documents')
        .where({ organization_id: organizationId })
        .select(
          db.raw(`
            unnest(string_to_array(
              regexp_replace(
                lower(COALESCE(title, '') || ' ' || COALESCE(description, '')), 
                '[^a-z0-9\\s]', ' ', 'g'
              ), 
              ' '
            )) as term
          `)
        )
        .groupBy('term')
        .havingRaw('length(term) > 2')
        .orderByRaw('count(*) desc')
        .limit(10);

      const suggestions = commonTerms
        .map((row: any) => row.term)
        .filter((term: string) => term && term.length > 2)
        .slice(0, 5);

      return suggestions;
    } catch (error) {
      logger.error('Failed to generate search suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        organizationId,
      });
      return [];
    }
  }

  /**
   * Gets search analytics for performance monitoring
   */
  async getSearchAnalytics(organizationId: string, days: number = 30): Promise<{
    total_searches: number;
    avg_results_per_search: number;
    most_common_queries: Array<{ query: string; count: number }>;
    zero_result_queries: Array<{ query: string; count: number }>;
  }> {
    // This would require a search_logs table to track search queries
    // For now, return placeholder data
    return {
      total_searches: 0,
      avg_results_per_search: 0,
      most_common_queries: [],
      zero_result_queries: [],
    };
  }

  /**
   * Indexes document content for improved search performance
   */
  async reindexDocuments(organizationId: string): Promise<{ indexed: number; errors: number }> {
    try {
      // Update the full-text search vectors for all documents
      const result = await db.raw(`
        UPDATE hr_documents 
        SET updated_at = updated_at -- Trigger any update hooks
        WHERE organization_id = ? 
        AND content IS NOT NULL
      `, [organizationId]);

      logger.info('Document reindexing completed', {
        organizationId,
        documentsProcessed: result.rowCount || 0,
      });

      return {
        indexed: result.rowCount || 0,
        errors: 0,
      };
    } catch (error) {
      logger.error('Document reindexing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
      });

      return {
        indexed: 0,
        errors: 1,
      };
    }
  }
}