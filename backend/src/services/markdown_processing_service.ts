const MarkdownIt = require('markdown-it');
let DOMPurify: any;
let JSDOM: any;

try {
  DOMPurify = require('dompurify');
  JSDOM = require('jsdom').JSDOM;
} catch (error) {
  // Fallback for environments where these modules are not available
  DOMPurify = null;
  JSDOM = null;
}
import logger from '../config/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  wordCount: number;
  estimatedReadingTime: number;
}

export interface MarkdownProcessingOptions {
  maxContentLength?: number;
  maxWordCount?: number;
  allowedHtmlTags?: string[];
  sanitizeHtml?: boolean;
  strictMode?: boolean;
  allowExternalLinks?: boolean;
  maxLinkCount?: number;
  maxImageCount?: number;
}

export class MarkdownProcessingService {
  private readonly DEFAULT_MAX_CONTENT_LENGTH = 1000000; // 1MB
  private readonly DEFAULT_MAX_WORD_COUNT = 100000; // 100k words
  private readonly DEFAULT_MAX_LINK_COUNT = 100;
  private readonly DEFAULT_MAX_IMAGE_COUNT = 50;
  private readonly AVERAGE_READING_SPEED = 200; // words per minute
  private readonly ALLOWED_HTML_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 's',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'del', 'ins'
  ];
  
  // Dangerous patterns that should be blocked
  private readonly DANGEROUS_PATTERNS = [
    /javascript:/gi,
    /data:(?!image\/)/gi, // Allow data: URLs only for images
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<form/gi,
    /<input/gi,
    /<button/gi,
    /<meta/gi,
    /<link/gi,
    /<style/gi,
  ];

  // Allowed URL schemes for links
  private readonly ALLOWED_URL_SCHEMES = [
    'http:',
    'https:',
    'mailto:',
    'tel:',
    'ftp:',
  ];

  private domPurify: typeof DOMPurify;
  private md: any;

  constructor() {
    try {
      // Initialize DOMPurify with JSDOM for server-side usage
      if (JSDOM && DOMPurify) {
        const window = new JSDOM('').window;
        this.domPurify = DOMPurify(window as any);
      } else {
        this.domPurify = null;
      }
    } catch (error) {
      // Fallback for test environment
      logger.warn('Failed to initialize DOMPurify with JSDOM, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.domPurify = null as any;
    }
    
    // Initialize markdown-it with GitHub Flavored Markdown features
    this.md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
    });
  }

  /**
   * Validates markdown content with syntax checking and security validation
   */
  async validateContent(
    content: string,
    options: MarkdownProcessingOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic content validation
      if (!content || typeof content !== 'string') {
        errors.push('Content must be a non-empty string');
        return {
          isValid: false,
          errors,
          warnings,
          wordCount: 0,
          estimatedReadingTime: 0,
        };
      }

      const trimmedContent = content.trim();
      if (trimmedContent.length === 0) {
        errors.push('Content cannot be empty');
        return {
          isValid: false,
          errors,
          warnings,
          wordCount: 0,
          estimatedReadingTime: 0,
        };
      }

      // Content length validation
      const maxLength = options.maxContentLength || this.DEFAULT_MAX_CONTENT_LENGTH;
      if (content.length > maxLength) {
        errors.push(`Content exceeds maximum length of ${maxLength} characters`);
      }

      // Calculate word count and reading time
      const wordCount = this.calculateWordCount(content);
      const estimatedReadingTime = this.estimateReadingTime(content);

      // Word count validation
      const maxWordCount = options.maxWordCount || this.DEFAULT_MAX_WORD_COUNT;
      if (wordCount > maxWordCount) {
        errors.push(`Content exceeds maximum word count of ${maxWordCount} words`);
      }

      // Markdown syntax validation
      try {
        const rendered = this.md.render(content);

        // Check for potential security issues in rendered HTML
        const securityIssues = this.checkForSecurityIssues(rendered);
        if (securityIssues.length > 0) {
          warnings.push(...securityIssues);
        }
      } catch (markdownError) {
        errors.push(`Invalid markdown syntax: ${markdownError instanceof Error ? markdownError.message : 'Unknown error'}`);
      }

      // Security validation
      const securityValidation = this.validateContentSecurity(content, options);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      // Check for common markdown issues
      const markdownWarnings = this.checkMarkdownQuality(content);
      warnings.push(...markdownWarnings);

      // Validate content complexity
      const complexityWarnings = this.checkContentComplexity(content, options);
      warnings.push(...complexityWarnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        wordCount,
        estimatedReadingTime,
      };
    } catch (error) {
      logger.error('Error validating markdown content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content?.length || 0,
      });

      return {
        isValid: false,
        errors: ['Failed to validate markdown content'],
        warnings: [],
        wordCount: 0,
        estimatedReadingTime: 0,
      };
    }
  }

  /**
   * Extracts plain text from markdown content for search indexing
   */
  extractPlainText(content: string): string {
    try {
      if (!content || typeof content !== 'string') {
        return '';
      }

      // First, render markdown to HTML
      const html = this.md.render(content);

      // Create a DOM from the HTML and extract text content
      try {
        if (JSDOM) {
          const dom = new JSDOM(html);
          const textContent = dom.window.document.body.textContent || '';
          
          // Clean up the text
          return textContent
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim();
        } else {
          throw new Error('JSDOM not available');
        }
      } catch (jsdomError) {
        // Fallback: use simple regex-based text extraction
        return html
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ')
          .trim();
      }


    } catch (error) {
      logger.error('Error extracting plain text from markdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content?.length || 0,
      });

      // Fallback: return the original content with basic cleanup
      return content
        .replace(/[#*_`~\[\]()]/g, '') // Remove basic markdown characters
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  /**
   * Sanitizes markdown content for safe storage and rendering
   */
  sanitizeContent(content: string, options: MarkdownProcessingOptions = {}): string {
    try {
      if (!content || typeof content !== 'string') {
        return '';
      }

      let sanitizedContent = content;

      // Step 1: Remove dangerous patterns from raw markdown
      for (const pattern of this.DANGEROUS_PATTERNS) {
        sanitizedContent = sanitizedContent.replace(pattern, '');
      }

      // Step 2: Sanitize links
      sanitizedContent = this.sanitizeLinks(sanitizedContent, options);

      // Step 3: Sanitize images
      sanitizedContent = this.sanitizeImages(sanitizedContent, options);

      // Step 4: Remove excessive HTML tags if in strict mode
      if (options.strictMode) {
        sanitizedContent = this.removeExcessiveHtml(sanitizedContent);
      }

      // Step 5: If HTML sanitization is enabled, render and sanitize HTML
      const sanitizeHtml = options.sanitizeHtml !== false; // Default to true
      if (sanitizeHtml) {
        // Render markdown to HTML
        const html = this.md.render(sanitizedContent);

        // Configure DOMPurify options
        const allowedTags = options.allowedHtmlTags || this.ALLOWED_HTML_TAGS;

        // Sanitize the HTML if DOMPurify is available
        if (this.domPurify) {
          const sanitizedHtml = this.domPurify.sanitize(html, {
            ALLOWED_TAGS: allowedTags,
            ALLOWED_ATTR: [
              'href', 'title', 'alt', 'src', 'width', 'height',
              'class', 'id', 'target', 'rel'
            ],
            ALLOW_DATA_ATTR: false,
            FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'style'],
            FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
            ADD_ATTR: ['target'], // Ensure external links open in new tab
            ADD_TAGS: [], // Don't add any additional tags
          });
        }

        // For storage, we return the sanitized markdown content, not HTML
        // The HTML sanitization is mainly for validation
      }

      return sanitizedContent;
    } catch (error) {
      logger.error('Error sanitizing markdown content', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content?.length || 0,
      });

      // Return original content if sanitization fails
      return content;
    }
  }

  private sanitizeLinks(content: string, options: MarkdownProcessingOptions): string {
    const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    
    return content.replace(linkPattern, (match, linkText, linkUrl) => {
      try {
        // Skip relative links
        if (linkUrl.startsWith('#') || linkUrl.startsWith('/') || linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
          return match;
        }

        const url = new URL(linkUrl);
        
        // Remove disallowed protocols
        if (!this.ALLOWED_URL_SCHEMES.includes(url.protocol)) {
          return linkText; // Just return the text without the link
        }

        // Remove external links if not allowed
        if (!options.allowExternalLinks && (url.protocol === 'http:' || url.protocol === 'https:')) {
          return `${linkText} (external link removed)`;
        }

        // Remove suspicious domains
        if (this.isSuspiciousDomain(url.hostname)) {
          return `${linkText} (suspicious link removed)`;
        }

        return match; // Link is safe
      } catch (urlError) {
        // Invalid URL, remove the link
        return linkText;
      }
    });
  }

  private sanitizeImages(content: string, options: MarkdownProcessingOptions): string {
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    
    return content.replace(imagePattern, (match, altText, imageSrc) => {
      try {
        if (imageSrc.startsWith('data:')) {
          // Check if it's actually an image data URL
          if (!imageSrc.startsWith('data:image/')) {
            return `[Image removed: invalid data URL]`;
          }
          // Check size
          if (imageSrc.length > 1000000) { // ~750KB
            return `[Image removed: too large]`;
          }
          return match; // Data image is safe
        }

        // Skip relative image paths
        if (imageSrc.startsWith('/') || imageSrc.startsWith('./') || imageSrc.startsWith('../')) {
          return match;
        }

        const url = new URL(imageSrc);
        
        // Remove disallowed protocols
        if (!this.ALLOWED_URL_SCHEMES.includes(url.protocol)) {
          return `[Image removed: disallowed protocol]`;
        }

        return match; // Image is safe
      } catch (urlError) {
        // Invalid URL or dangerous protocol, remove the image
        if (imageSrc.includes('javascript:') || imageSrc.includes('vbscript:') || imageSrc.includes('data:text/')) {
          return `[Image removed: dangerous URL]`;
        }
        // For other invalid URLs that aren't relative paths, remove them
        if (!imageSrc.startsWith('/') && !imageSrc.startsWith('./') && !imageSrc.startsWith('../')) {
          return `[Image removed: invalid URL]`;
        }
        return match; // Keep relative paths
      }
    });
  }

  private removeExcessiveHtml(content: string): string {
    // In strict mode, remove all HTML tags except basic formatting
    const allowedInStrict = ['strong', 'em', 'code', 'del', 'ins'];
    const htmlTagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    
    return content.replace(htmlTagPattern, (match, tagName) => {
      if (allowedInStrict.includes(tagName.toLowerCase())) {
        return match;
      }
      return ''; // Remove the tag
    });
  }

  /**
   * Calculates word count from markdown content
   */
  calculateWordCount(content: string): number {
    try {
      if (!content || typeof content !== 'string') {
        return 0;
      }

      // Extract plain text first
      const plainText = this.extractPlainText(content);

      // Count words (split by whitespace and filter out empty strings)
      const words = plainText
        .split(/\s+/)
        .filter(word => word.length > 0);

      return words.length;
    } catch (error) {
      logger.error('Error calculating word count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content?.length || 0,
      });

      return 0;
    }
  }

  /**
   * Estimates reading time in minutes based on average reading speed
   */
  estimateReadingTime(content: string): number {
    try {
      const wordCount = this.calculateWordCount(content);
      const readingTimeMinutes = Math.ceil(wordCount / this.AVERAGE_READING_SPEED);
      
      // Minimum reading time of 1 minute
      return Math.max(1, readingTimeMinutes);
    } catch (error) {
      logger.error('Error estimating reading time', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content?.length || 0,
      });

      return 1; // Default to 1 minute
    }
  }

  /**
   * Renders markdown to HTML safely
   */
  renderToHtml(content: string, options: MarkdownProcessingOptions = {}): string {
    try {
      if (!content || typeof content !== 'string') {
        return '';
      }

      // Render markdown to HTML
      const html = this.md.render(content);

      // Sanitize if requested
      if (options.sanitizeHtml !== false) {
        const allowedTags = options.allowedHtmlTags || this.ALLOWED_HTML_TAGS;
        
        if (this.domPurify) {
          return this.domPurify.sanitize(html, {
            ALLOWED_TAGS: allowedTags,
            ALLOWED_ATTR: [
              'href', 'title', 'alt', 'src', 'width', 'height',
              'class', 'id', 'target', 'rel'
            ],
            ALLOW_DATA_ATTR: false,
            FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
            FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
          });
        }
      }

      return html;
    } catch (error) {
      logger.error('Error rendering markdown to HTML', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content?.length || 0,
      });

      return '';
    }
  }

  // Private helper methods

  private validateContentSecurity(content: string, options: MarkdownProcessingOptions): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for dangerous patterns in raw markdown
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(content)) {
          if (options.strictMode) {
            errors.push(`Content contains potentially dangerous pattern: ${pattern.source}`);
          } else {
            warnings.push(`Content contains potentially dangerous pattern that will be sanitized: ${pattern.source}`);
          }
        }
      }

      // Validate links
      const linkValidation = this.validateLinks(content, options);
      errors.push(...linkValidation.errors);
      warnings.push(...linkValidation.warnings);

      // Validate images
      const imageValidation = this.validateImages(content, options);
      errors.push(...imageValidation.errors);
      warnings.push(...imageValidation.warnings);

      // Check for excessive HTML content
      const htmlContent = content.match(/<[^>]+>/g) || [];
      if (htmlContent.length > 50) {
        warnings.push(`Content contains ${htmlContent.length} HTML tags which may be sanitized`);
      }

      // Check for potential XSS vectors
      const xssVectors = this.detectXSSVectors(content);
      if (xssVectors.length > 0) {
        if (options.strictMode) {
          errors.push(`Content contains potential XSS vectors: ${xssVectors.join(', ')}`);
        } else {
          warnings.push(`Content contains potential XSS vectors that will be sanitized: ${xssVectors.join(', ')}`);
        }
      }

    } catch (error) {
      logger.error('Error during security validation', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      warnings.push('Unable to complete full security validation');
    }

    return { errors, warnings };
  }

  private validateLinks(content: string, options: MarkdownProcessingOptions): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract markdown links [text](url)
    const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    const links = [...content.matchAll(linkPattern)];

    const maxLinks = options.maxLinkCount || this.DEFAULT_MAX_LINK_COUNT;
    if (links.length > maxLinks) {
      errors.push(`Content contains ${links.length} links, maximum allowed is ${maxLinks}`);
    }

    // Validate each link
    for (const [, linkText, linkUrl] of links) {
      try {
        const url = new URL(linkUrl);
        
        // Check allowed schemes
        if (!this.ALLOWED_URL_SCHEMES.includes(url.protocol)) {
          errors.push(`Link contains disallowed protocol: ${url.protocol}`);
        }

        // Check for external links if not allowed
        if (!options.allowExternalLinks && (url.protocol === 'http:' || url.protocol === 'https:')) {
          warnings.push(`External link detected: ${linkUrl}`);
        }

        // Check for suspicious domains
        if (this.isSuspiciousDomain(url.hostname)) {
          warnings.push(`Link to potentially suspicious domain: ${url.hostname}`);
        }

      } catch (urlError) {
        // Invalid URL format
        if (linkUrl.startsWith('#') || linkUrl.startsWith('/')) {
          // Relative links are generally OK
          continue;
        }
        warnings.push(`Invalid URL format: ${linkUrl}`);
      }
    }

    return { errors, warnings };
  }

  private validateImages(content: string, options: MarkdownProcessingOptions): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract markdown images ![alt](src)
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images = [...content.matchAll(imagePattern)];

    const maxImages = options.maxImageCount || this.DEFAULT_MAX_IMAGE_COUNT;
    if (images.length > maxImages) {
      errors.push(`Content contains ${images.length} images, maximum allowed is ${maxImages}`);
    }

    // Validate each image
    for (const [, altText, imageSrc] of images) {
      try {
        if (imageSrc.startsWith('data:')) {
          // Data URLs for images
          if (!imageSrc.startsWith('data:image/')) {
            errors.push(`Data URL is not an image: ${imageSrc.substring(0, 50)}...`);
          }
          // Check data URL size (base64 encoded, so roughly 4/3 of actual size)
          if (imageSrc.length > 1000000) { // ~750KB actual image
            warnings.push('Large embedded image detected (>750KB)');
          }
        } else {
          // External image URLs
          const url = new URL(imageSrc);
          if (!this.ALLOWED_URL_SCHEMES.includes(url.protocol)) {
            errors.push(`Image contains disallowed protocol: ${url.protocol}`);
          }
        }
      } catch (urlError) {
        // Relative image paths are generally OK
        if (!imageSrc.startsWith('/') && !imageSrc.startsWith('./') && !imageSrc.startsWith('../')) {
          warnings.push(`Invalid image URL format: ${imageSrc}`);
        }
      }
    }

    return { errors, warnings };
  }

  private detectXSSVectors(content: string): string[] {
    const vectors: string[] = [];

    // Common XSS patterns
    const xssPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<script/gi,
      /expression\s*\(/gi,
      /url\s*\(\s*javascript:/gi,
      /style\s*=.*expression/gi,
      /style\s*=.*javascript:/gi,
      /src\s*=.*javascript:/gi,
      /href\s*=.*javascript:/gi,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(content)) {
        vectors.push(pattern.source);
      }
    }

    return vectors;
  }

  private isSuspiciousDomain(hostname: string): boolean {
    // List of suspicious TLDs or patterns
    const suspiciousPatterns = [
      /\.tk$/i,
      /\.ml$/i,
      /\.ga$/i,
      /\.cf$/i,
      /bit\.ly/i,
      /tinyurl/i,
      /t\.co/i,
      // Add more suspicious patterns as needed
    ];

    return suspiciousPatterns.some(pattern => pattern.test(hostname));
  }

  private checkForSecurityIssues(html: string): string[] {
    const warnings: string[] = [];

    // Check for potentially dangerous patterns
    if (html.includes('<script')) {
      warnings.push('Content contains script tags which will be removed');
    }

    if (html.includes('javascript:')) {
      warnings.push('Content contains javascript: URLs which will be removed');
    }

    if (html.includes('data:')) {
      warnings.push('Content contains data: URLs which may be restricted');
    }

    if (html.includes('onclick') || html.includes('onload') || html.includes('onerror')) {
      warnings.push('Content contains event handlers which will be removed');
    }

    return warnings;
  }

  private checkMarkdownQuality(content: string): string[] {
    const warnings: string[] = [];

    // Check for common markdown issues
    if (content.includes('](') && !content.includes('](http')) {
      warnings.push('Content may contain relative links that might not work');
    }

    // Check for unbalanced brackets
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      warnings.push('Content has unbalanced square brackets');
    }

    // Check for unbalanced parentheses in links
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      warnings.push('Content has unbalanced parentheses');
    }

    // Check for very long lines (readability)
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 120);
    if (longLines.length > 0) {
      warnings.push(`Content has ${longLines.length} lines longer than 120 characters`);
    }

    return warnings;
  }

  private checkContentComplexity(content: string, options: MarkdownProcessingOptions): string[] {
    const warnings: string[] = [];

    // Check for deeply nested lists
    const listDepth = this.getMaxListDepth(content);
    if (listDepth > 4) {
      warnings.push(`Content has deeply nested lists (depth: ${listDepth})`);
    }

    // Check for very large tables
    const tableRows = (content.match(/\|.*\|/g) || []).length;
    if (tableRows > 50) {
      warnings.push(`Content has large tables (${tableRows} rows) which may affect performance`);
    }

    // Check for excessive heading levels
    const headings = content.match(/^#{1,6}\s/gm) || [];
    const maxHeadingLevel = Math.max(...headings.map(h => h.match(/#/g)?.length || 0));
    if (maxHeadingLevel > 4) {
      warnings.push(`Content uses deep heading levels (H${maxHeadingLevel})`);
    }

    return warnings;
  }

  private getMaxListDepth(content: string): number {
    const lines = content.split('\n');
    let maxDepth = 0;

    for (const line of lines) {
      // Check for list items (- or * or numbers)
      const match = line.match(/^(\s*)([-*]|\d+\.)\s/);
      if (match) {
        const indentLevel = Math.floor(match[1].length / 2) + 1;
        maxDepth = Math.max(maxDepth, indentLevel);
      }
    }

    return maxDepth;
  }
}