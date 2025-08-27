import axios from 'axios';
import TurndownService from 'turndown';
import * as cheerio from 'cheerio';
import logger from '../config/logger';

export interface RSIOrgPageData {
  name: string;
  headline?: string;
  description?: string;
  contentSources?: Array<{ name: string; content: string | undefined }>;
  icon_url?: string;
  banner_url?: string;
  member_count?: number;
  language?: string;
}

export class RSIClient {
  private baseUrl: string;
  private turndownService: TurndownService;

  constructor() {
    this.baseUrl =
      process.env.RSI_API_BASE_URL || 'https://robertsspaceindustries.com';

    // Initialize Turndown service for HTML to Markdown conversion
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      bulletListMarker: '-',
      linkStyle: 'inlined',
    });
  }

  /**
   * Scrape an RSI organization page to extract data and verify sentinel codes
   */
  async scrapeOrganizationPage(orgId: string): Promise<RSIOrgPageData | null> {
    try {
      const url = `${this.baseUrl}/en/orgs/${orgId}`;
      logger.info('Scraping RSI organization page', { url, orgId });

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'SC-Orgs/1.0 (Star Citizen Organization Platform)',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
        },
      });

      if (response.status !== 200) {
        logger.warn('RSI organization page returned non-200 status', {
          orgId,
          status: response.status,
          url,
        });
        return null;
      }

      const html = response.data;

      logger.debug('Raw HTML fetched', {
        orgId,
        htmlLength: html.length,
        htmlPreview: html.substring(0, 500) + '...',
      });

      return this.parseOrganizationHTML(html, orgId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to scrape RSI organization page', {
        orgId,
        error: errorMessage,
        url: `${this.baseUrl}/en/orgs/${orgId}`,
      });
      return null;
    }
  }

  /**
   * Convert HTML content to Markdown
   */
  private htmlToMarkdown(html: string): string {
    try {
      return this.turndownService.turndown(html);
    } catch (error) {
      logger.warn(
        'Failed to convert HTML to Markdown, falling back to text extraction',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      // Fallback to simple text extraction
      return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  /**
   * Parse HTML content to extract organization data using Cheerio
   */
  private parseOrganizationHTML(
    html: string,
    orgId: string
  ): RSIOrgPageData | null {
    try {
      logger.debug('Starting HTML parsing with Cheerio', {
        orgId,
        htmlLength: html.length,
      });

      const $ = cheerio.load(html);

      // Extract organization name from title
      let name = orgId; // Default to org ID
      const title = $('title').text().trim();
      if (title) {
        // Extract just the organization name, removing the rest
        // Format: "Blackwell Inc. [BWINCORP] - Organizations - Roberts Space Industries"
        const orgNameMatch = title.match(/^([^[]+?)\s*\[[^\]]+\]/);
        if (orgNameMatch) {
          name = orgNameMatch[1].trim();
        } else {
          // Fallback: remove common suffixes
          name = title
            .replace(/ - Organizations?/, '')
            .replace(/ - Roberts Space Industries/, '')
            .replace(/ - Star Citizen/, '')
            .trim();
        }
      }

      // Alternative: Extract from h1 tag if title parsing fails
      if (!name || name === orgId) {
        const h1Text = $('h1').first().text().trim();
        if (h1Text) {
          const h1Match = h1Text.match(/^([^/]+)\s*\/\s*/);
          if (h1Match) {
            name = h1Match[1].trim();
          }
        }
      }

      // Extract headline
      const headline = $('.headline').first().text().trim() || undefined;

      // Extract content from specific sections
      const contentSources: Array<{
        name: string;
        content: string | undefined;
      }> = [];

      // 1. Main description body area - this is where verification codes are!
      const mainBodyContent = $('.body.markitup-text').first();
      if (mainBodyContent.length > 0) {
        const markdownContent = this.htmlToMarkdown(
          mainBodyContent.html() || ''
        );
        if (markdownContent.length > 0) {
          contentSources.push({
            name: 'body-markitup',
            content: markdownContent,
          });
        }
      }

      // 2. Extract organization tags
      const tags: string[] = [];
      $('.tags li').each((_, element) => {
        const tagText = $(element).text().trim();
        if (tagText) {
          tags.push(tagText);
        }
      });

      if (tags.length > 0) {
        contentSources.push({
          name: 'organization-tags',
          content: tags.join(', '),
        });
      }

      // 3. Content tabs (history, manifesto, charter)
      $('.content-tab').each((_, element) => {
        const $tab = $(element);
        const titleElement = $tab.find('.tab-title').first();
        const contentElement = $tab.find('.markitup-text').first();

        if (titleElement.length > 0 && contentElement.length > 0) {
          const tabTitle = titleElement.text().trim().toLowerCase();
          const markdownContent = this.htmlToMarkdown(
            contentElement.html() || ''
          );
          if (markdownContent.length > 0) {
            contentSources.push({
              name: `content-tab-${tabTitle}`,
              content: markdownContent,
            });
          }
        }
      });

      // Log all content sources found
      logger.debug('Content sources extracted with Cheerio', {
        orgId,
        sourceCount: contentSources.length,
        sources: contentSources.map(s => ({
          name: s.name,
          length: s.content?.length || 0,
          preview: s.content ? s.content.substring(0, 100) + '...' : 'empty',
        })),
      });

      // Build comprehensive description from all content sources
      let description = '';

      // Start with headline if available
      if (headline) {
        description += `${headline}\n\n`;
      }

      // Add content sources in order of preference
      const contentSections = [
        { source: 'body-markitup' }, // Main description with markitup (primary)
        { source: 'content-tab-history' }, // History tab
        { source: 'content-tab-manifesto' }, // Manifesto tab
        { source: 'content-tab-charter' }, // Charter tab
      ];

      for (const section of contentSections) {
        const source = contentSources.find(s => s.name === section.source);
        if (source && source.content && source.content.trim().length > 0) {
          description += `${source.content.trim()}\n\n`;
        }
      }

      // Extract icon URL
      let icon_url: string | undefined;
      const logoImg = $('.logo img').first();
      if (logoImg.length > 0) {
        const src = logoImg.attr('src');
        if (src && !src.startsWith('data:')) {
          icon_url = new URL(src, this.baseUrl).href;
        }
      }

      // Extract banner URL
      let banner_url: string | undefined;
      const bannerImg = $('.org-banner').first();
      if (bannerImg.length > 0) {
        const src = bannerImg.attr('src');
        if (src) {
          banner_url = new URL(src, this.baseUrl).href;
        }
      }

      // Extract member count
      let member_count: number | undefined;
      const countSpan = $('.count').first();
      if (countSpan.length > 0) {
        const countText = countSpan.text();
        const match = countText.match(/(\d+)\s*member/i);
        if (match) {
          member_count = parseInt(match[1]);
        }
      }

      // Extract language (default to English for now)
      const language = 'English';

      logger.info('Successfully parsed RSI organization page with Cheerio', {
        orgId,
        name,
        hasHeadline: !!headline,
        hasIcon: !!icon_url,
        hasBanner: !!banner_url,
        memberCount: member_count,
        hasDescription: !!description,
        headlineLength: headline?.length || 0,
        descriptionLength: description?.length || 0,
        headlinePreview: headline ? headline.substring(0, 100) + '...' : 'none',
        descriptionPreview: description
          ? description.substring(0, 100) + '...'
          : 'none',
        contentSourceCount: contentSources.length,
        contentSources: contentSources.map(s => ({
          name: s.name,
          length: s.content?.length || 0,
          preview: s.content ? s.content.substring(0, 50) + '...' : 'empty',
        })),
      });

      return {
        name,
        headline,
        description,
        contentSources, // Include all content sources for verification
        icon_url,
        banner_url,
        member_count,
        language,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to parse RSI organization HTML with Cheerio', {
        orgId,
        error: errorMessage,
      });
      return null;
    }
  }

  /**
   * Check if a sentinel code exists in the organization headline or description
   */
  async verifySentinelCode(
    orgId: string,
    sentinelCode: string
  ): Promise<boolean> {
    try {
      const orgData = await this.scrapeOrganizationPage(orgId);
      if (!orgData) {
        logger.warn('No organization data found for verification', {
          orgId,
          sentinelCode,
        });
        return false;
      }

      // Check headline, description, and all content sources for the sentinel code
      logger.debug('Checking for sentinel code', {
        orgId,
        sentinelCode,
        headline: orgData.headline,
        description: orgData.description,
        contentSourceCount: orgData.contentSources?.length || 0,
      });

      try {
        const hasSentinelInHeadline = orgData.headline
          ? orgData.headline.includes(sentinelCode)
          : false;
        const hasSentinelInDescription = orgData.description
          ? orgData.description.includes(sentinelCode)
          : false;

        // Check all content sources for the sentinel code
        let hasSentinelInContentSources = false;
        if (orgData.contentSources) {
          for (const source of orgData.contentSources) {
            if (source.content && source.content.includes(sentinelCode)) {
              hasSentinelInContentSources = true;
              logger.debug('Sentinel code found in content source', {
                orgId,
                sourceName: source.name,
                sourceContent: source.content.substring(0, 100) + '...',
              });
              break;
            }
          }
        }

        const hasSentinel =
          hasSentinelInHeadline ||
          hasSentinelInDescription ||
          hasSentinelInContentSources;

        logger.info('Sentinel code verification result', {
          orgId,
          sentinelCode,
          headline: orgData.headline,
          description: orgData.description,
          hasSentinelInHeadline,
          hasSentinelInDescription,
          hasSentinelInContentSources,
          hasSentinel,
        });

        logger.debug('Verification completed successfully', {
          orgId,
          hasSentinel,
          hasSentinelType: typeof hasSentinel,
          hasSentinelTruthy: !!hasSentinel,
        });

        logger.info('Final return value', {
          orgId,
          returnValue: hasSentinel,
          returnValueType: typeof hasSentinel,
        });

        return hasSentinel;
      } catch (error) {
        logger.error('Error during sentinel code verification', {
          orgId,
          sentinelCode,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to verify sentinel code', {
        orgId,
        sentinelCode,
        error: errorMessage,
      });
      return false;
    }
  }

  /**
   * Get organization data for registration (after verification)
   */
  async getOrganizationData(orgId: string): Promise<RSIOrgPageData | null> {
    return this.scrapeOrganizationPage(orgId);
  }
}

export default new RSIClient();
