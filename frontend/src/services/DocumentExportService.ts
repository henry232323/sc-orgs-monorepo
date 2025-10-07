

export interface ExportOptions {
  includeMetadata?: boolean;
  includeTableOfContents?: boolean;
  customStyles?: string;
  pageFormat?: 'A4' | 'Letter';
}

export interface DocumentMetadata {
  title: string;
  description?: string;
  version: number;
  created_at: string;
  updated_at: string;
  word_count: number;
  estimated_reading_time: number;
  folder_path: string;
  requires_acknowledgment: boolean;
  access_roles: string[];
}

export class DocumentExportService {
  /**
   * Export document to HTML format
   */
  static exportToHtml(content: string, metadata: DocumentMetadata, options: ExportOptions = {}): string {
    const {
      includeMetadata = true,
      includeTableOfContents = false,
      customStyles = '',
    } = options;

    // Simple markdown to HTML conversion for basic formatting
    const htmlContent = this.simpleMarkdownToHtml(content);
    
    // Generate table of contents if requested
    let toc = '';
    if (includeTableOfContents) {
      toc = this.generateTableOfContents(content);
    }

    // Generate metadata section
    let metadataHtml = '';
    if (includeMetadata) {
      metadataHtml = `
        <div class="document-metadata">
          <h2>Document Information</h2>
          <table>
            <tr><td><strong>Title:</strong></td><td>${metadata.title}</td></tr>
            ${metadata.description ? `<tr><td><strong>Description:</strong></td><td>${metadata.description}</td></tr>` : ''}
            <tr><td><strong>Version:</strong></td><td>${metadata.version}</td></tr>
            <tr><td><strong>Created:</strong></td><td>${new Date(metadata.created_at).toLocaleDateString()}</td></tr>
            <tr><td><strong>Updated:</strong></td><td>${new Date(metadata.updated_at).toLocaleDateString()}</td></tr>
            <tr><td><strong>Word Count:</strong></td><td>${metadata.word_count}</td></tr>
            <tr><td><strong>Reading Time:</strong></td><td>${metadata.estimated_reading_time} min</td></tr>
            <tr><td><strong>Folder:</strong></td><td>${metadata.folder_path}</td></tr>
            <tr><td><strong>Requires Acknowledgment:</strong></td><td>${metadata.requires_acknowledgment ? 'Yes' : 'No'}</td></tr>
            <tr><td><strong>Access Roles:</strong></td><td>${metadata.access_roles.join(', ')}</td></tr>
          </table>
        </div>
      `;
    }

    const defaultStyles = `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          color: #333;
        }
        
        h1, h2, h3, h4, h5, h6 {
          color: #2c3e50;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        
        h1 {
          border-bottom: 2px solid #3498db;
          padding-bottom: 0.5rem;
        }
        
        h2 {
          border-bottom: 1px solid #bdc3c7;
          padding-bottom: 0.3rem;
        }
        
        code {
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
        }
        
        pre {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 5px;
          overflow-x: auto;
          border-left: 4px solid #3498db;
        }
        
        pre code {
          background: transparent;
          padding: 0;
        }
        
        blockquote {
          border-left: 4px solid #3498db;
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          background: #f8f9fa;
          font-style: italic;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 0.75rem;
          text-align: left;
        }
        
        th {
          background: #f8f9fa;
          font-weight: 600;
        }
        
        .document-metadata {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 5px;
          margin-bottom: 2rem;
          border-left: 4px solid #3498db;
        }
        
        .document-metadata table {
          margin: 0.5rem 0 0 0;
        }
        
        .document-metadata td {
          border: none;
          padding: 0.25rem 0.5rem;
        }
        
        .table-of-contents {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 5px;
          margin-bottom: 2rem;
        }
        
        .table-of-contents ul {
          list-style: none;
          padding-left: 1rem;
        }
        
        .table-of-contents a {
          text-decoration: none;
          color: #3498db;
        }
        
        .table-of-contents a:hover {
          text-decoration: underline;
        }
        
        img {
          max-width: 100%;
          height: auto;
          border-radius: 5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        a {
          color: #3498db;
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
        
        /* Task list styling */
        .task-list-item {
          list-style: none;
        }
        
        .task-list-item input[type="checkbox"] {
          margin-right: 0.5rem;
        }
        
        /* Print styles */
        @media print {
          body {
            margin: 0;
            padding: 1rem;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }
          
          pre, blockquote, table {
            page-break-inside: avoid;
          }
          
          a {
            color: #000;
          }
          
          a[href]:after {
            content: " (" attr(href) ")";
            font-size: 0.8em;
            color: #666;
          }
        }
        
        ${customStyles}
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${metadata.title}</title>
          ${defaultStyles}
        </head>
        <body>
          <header>
            <h1>${metadata.title}</h1>
            ${metadata.description ? `<p class="description">${metadata.description}</p>` : ''}
          </header>
          
          ${metadataHtml}
          ${toc}
          
          <main class="document-content">
            ${htmlContent}
          </main>
          
          <footer>
            <hr>
            <p><small>Generated on ${new Date().toLocaleDateString()} from ${metadata.title} (Version ${metadata.version})</small></p>
          </footer>
        </body>
      </html>
    `;
  }

  /**
   * Export document to PDF format (using browser's print functionality)
   */
  static async exportToPdf(content: string, metadata: DocumentMetadata, options: ExportOptions = {}): Promise<void> {
    const htmlContent = this.exportToHtml(content, metadata, {
      ...options,
      customStyles: `
        ${options.customStyles || ''}
        @page {
          size: ${options.pageFormat || 'A4'};
          margin: 2cm;
        }
        body {
          margin: 0;
          padding: 0;
        }
      `
    });

    // Create a new window with the HTML content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check your popup blocker settings.');
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }

  /**
   * Export document to markdown format with metadata
   */
  static exportToMarkdown(content: string, metadata: DocumentMetadata, options: ExportOptions = {}): string {
    const { includeMetadata = true } = options;

    let output = '';

    // Add YAML frontmatter if metadata is included
    if (includeMetadata) {
      output += '---\n';
      output += `title: "${metadata.title}"\n`;
      if (metadata.description) {
        output += `description: "${metadata.description}"\n`;
      }
      output += `version: ${metadata.version}\n`;
      output += `created: "${metadata.created_at}"\n`;
      output += `updated: "${metadata.updated_at}"\n`;
      output += `word_count: ${metadata.word_count}\n`;
      output += `reading_time: ${metadata.estimated_reading_time}\n`;
      output += `folder: "${metadata.folder_path}"\n`;
      output += `requires_acknowledgment: ${metadata.requires_acknowledgment}\n`;
      output += `access_roles: [${metadata.access_roles.map(role => `"${role}"`).join(', ')}]\n`;
      output += '---\n\n';
    }

    // Add the main content
    output += content;

    // Add metadata as a footer if requested
    if (includeMetadata) {
      output += '\n\n---\n\n';
      output += '## Document Information\n\n';
      output += `- **Title:** ${metadata.title}\n`;
      if (metadata.description) {
        output += `- **Description:** ${metadata.description}\n`;
      }
      output += `- **Version:** ${metadata.version}\n`;
      output += `- **Created:** ${new Date(metadata.created_at).toLocaleDateString()}\n`;
      output += `- **Updated:** ${new Date(metadata.updated_at).toLocaleDateString()}\n`;
      output += `- **Word Count:** ${metadata.word_count}\n`;
      output += `- **Reading Time:** ${metadata.estimated_reading_time} minutes\n`;
      output += `- **Folder:** ${metadata.folder_path}\n`;
      output += `- **Requires Acknowledgment:** ${metadata.requires_acknowledgment ? 'Yes' : 'No'}\n`;
      output += `- **Access Roles:** ${metadata.access_roles.join(', ')}\n`;
    }

    return output;
  }

  /**
   * Download a file with the given content
   */
  static downloadFile(content: string | Blob, filename: string, mimeType: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Generate a table of contents from markdown content
   */
  private static generateTableOfContents(content: string): string {
    const headings = content.match(/^#{1,6}\s+.+$/gm);
    if (!headings || headings.length === 0) {
      return '';
    }

    let toc = '<div class="table-of-contents">\n<h2>Table of Contents</h2>\n<ul>\n';
    
    headings.forEach(heading => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s+/, '').trim();
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      
      const indent = '  '.repeat(level - 1);
      toc += `${indent}<li><a href="#${id}">${text}</a></li>\n`;
    });
    
    toc += '</ul>\n</div>\n';
    return toc;
  }

  /**
   * Get appropriate filename for export
   */
  static getExportFilename(title: string, format: 'html' | 'pdf' | 'md'): string {
    const sanitizedTitle = title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedTitle}-${timestamp}.${format}`;
  }

  /**
   * Simple markdown to HTML conversion for basic formatting
   */
  private static simpleMarkdownToHtml(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

    // Code
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/gim, '</p><p>');
    html = html.replace(/\n/gim, '<br>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    // Lists (basic)
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/gim, '');

    return html;
  }
}