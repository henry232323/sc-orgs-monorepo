
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeTableOfContents?: boolean;
  customStyles?: string;
  pageFormat?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  fontFamily?: string;
  includePageNumbers?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
  watermark?: string;
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
   * Export document to PDF format using jsPDF and html2canvas
   */
  static async exportToPdf(content: string, metadata: DocumentMetadata, options: ExportOptions = {}): Promise<Blob> {
    const {
      pageFormat = 'A4',
      orientation = 'portrait',
      margins = { top: 20, right: 20, bottom: 20, left: 20 },
      includeMetadata = true
    } = options;

    // Create PDF with proper configuration
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageFormat.toLowerCase() as 'a4' | 'letter',
    });

    // Set PDF metadata
    pdf.setProperties({
      title: metadata.title,
      subject: metadata.description || '',
      author: 'HR Document System',
      creator: 'HR Document System',
      keywords: metadata.access_roles.join(', '),

    });

    // Get page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margins.left - margins.right;


    let currentY = margins.top;

    // Add header with title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(metadata.title, contentWidth);
    pdf.text(titleLines, margins.left, currentY);
    currentY += titleLines.length * 8 + 10;

    // Add description if available
    if (metadata.description) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'italic');
      const descLines = pdf.splitTextToSize(metadata.description, contentWidth);
      pdf.text(descLines, margins.left, currentY);
      currentY += descLines.length * 5 + 10;
    }

    // Add metadata section if requested
    if (includeMetadata) {
      currentY = this.addMetadataToPdf(pdf, metadata, margins.left, currentY, contentWidth);
    }

    // Add separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margins.left, currentY, pageWidth - margins.right, currentY);
    currentY += 10;

    // Convert markdown to HTML and render to PDF
    const htmlContent = this.renderMarkdownToHtml(content, metadata, { 
      ...options, 
      includeMetadata: false // We already added metadata above
    });
    
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${contentWidth * 3.78}px; /* Convert mm to px (1mm ≈ 3.78px) */
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 20px;
    `;
    
    document.body.appendChild(container);

    try {
      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight,
      });

      // Calculate image dimensions for PDF
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if we need to add content to current page or new page
      if (currentY + imgHeight > pageHeight - margins.bottom) {
        pdf.addPage();
        currentY = margins.top;
      }

      let heightLeft = imgHeight;
      let position = currentY;
      const imgData = canvas.toDataURL('image/png', 0.95); // Slightly compressed for smaller file size

      // Add image to PDF (handle multiple pages if needed)
      while (heightLeft > 0) {
        const availableHeight = pageHeight - position - margins.bottom;
        const imageHeight = Math.min(heightLeft, availableHeight);
        
        if (imageHeight > 0) {
          pdf.addImage(
            imgData, 
            'PNG', 
            margins.left, 
            position, 
            imgWidth, 
            imageHeight,
            undefined,
            'FAST'
          );
        }

        heightLeft -= availableHeight;
        
        if (heightLeft > 0) {
          pdf.addPage();
          position = margins.top;
        }
      }

      // Add footer with generation info
      this.addFooterToPdf(pdf, metadata);

      return pdf.output('blob');
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  /**
   * Add metadata section to PDF
   */
  private static addMetadataToPdf(
    pdf: jsPDF, 
    metadata: DocumentMetadata, 
    x: number, 
    y: number, 
    width: number
  ): number {
    let currentY = y;

    // Metadata header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Document Information', x, currentY);
    currentY += 10;

    // Metadata content
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const metadataItems = [
      ['Version:', metadata.version.toString()],
      ['Created:', new Date(metadata.created_at).toLocaleDateString()],
      ['Updated:', new Date(metadata.updated_at).toLocaleDateString()],
      ['Word Count:', metadata.word_count.toString()],
      ['Reading Time:', `${metadata.estimated_reading_time} minutes`],
      ['Folder:', metadata.folder_path],
      ['Requires Acknowledgment:', metadata.requires_acknowledgment ? 'Yes' : 'No'],
      ['Access Roles:', metadata.access_roles.join(', ')],
    ];

    metadataItems.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label || '', x, currentY);
      pdf.setFont('helvetica', 'normal');
      const valueLines = pdf.splitTextToSize(value || '', width - 40);
      pdf.text(valueLines, x + 40, currentY);
      currentY += Math.max(4, valueLines.length * 4);
    });

    return currentY + 10;
  }

  /**
   * Add footer to all pages of PDF
   */
  private static addFooterToPdf(pdf: jsPDF, metadata: DocumentMetadata): void {
    const pageCount = pdf.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Footer line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
      
      // Footer text
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      
      const footerLeft = `${metadata.title} (v${metadata.version})`;
      const footerCenter = `Generated on ${new Date().toLocaleDateString()}`;
      const footerRight = `Page ${i} of ${pageCount}`;
      
      pdf.text(footerLeft, 20, pageHeight - 8);
      pdf.text(footerCenter, pageWidth / 2, pageHeight - 8, { align: 'center' });
      pdf.text(footerRight, pageWidth - 20, pageHeight - 8, { align: 'right' });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
    }
  }

  /**
   * Export document to PDF format (fallback using browser's print functionality)
   */
  static async exportToPdfPrint(content: string, metadata: DocumentMetadata, options: ExportOptions = {}): Promise<void> {
    const htmlContent = this.exportToHtml(content, metadata, {
      ...options,
      customStyles: `
        ${options.customStyles || ''}
        @page {
          size: ${options.pageFormat || 'A4'} ${options.orientation || 'portrait'};
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
  static downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || 'text/plain' });
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
   * Export and download document in specified format
   */
  static async exportAndDownload(
    content: string,
    metadata: DocumentMetadata,
    format: 'html' | 'pdf' | 'md',
    options: ExportOptions = {}
  ): Promise<void> {
    const filename = this.getExportFilename(metadata.title, format);

    switch (format) {
      case 'html': {
        const htmlContent = this.exportToHtml(content, metadata, options);
        this.downloadFile(htmlContent, filename, 'text/html');
        break;
      }
      case 'pdf': {
        const pdfBlob = await this.exportToPdf(content, metadata, options);
        this.downloadFile(pdfBlob, filename);
        break;
      }
      case 'md': {
        const markdownContent = this.exportToMarkdown(content, metadata, options);
        this.downloadFile(markdownContent, filename, 'text/markdown');
        break;
      }
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
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
   * Get PDF export presets for common use cases
   */
  static getPdfExportPresets(): Record<string, ExportOptions> {
    return {
      standard: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        includeMetadata: true,
        includePageNumbers: true,
        includeHeader: true,
        includeFooter: true,
        fontSize: 12,
      },
      compact: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 },
        includeMetadata: false,
        includePageNumbers: true,
        includeHeader: false,
        includeFooter: true,
        fontSize: 10,
      },
      presentation: {
        pageFormat: 'A4',
        orientation: 'landscape',
        margins: { top: 25, right: 25, bottom: 25, left: 25 },
        includeMetadata: true,
        includeTableOfContents: true,
        includePageNumbers: true,
        includeHeader: true,
        includeFooter: true,
        fontSize: 14,
      },
      minimal: {
        pageFormat: 'A4',
        orientation: 'portrait',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        includeMetadata: false,
        includePageNumbers: false,
        includeHeader: false,
        includeFooter: false,
        fontSize: 11,
      },
    };
  }

  /**
   * Validate PDF export options
   */
  static validatePdfOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.margins) {
      const { top, right, bottom, left } = options.margins;
      if (top < 0 || right < 0 || bottom < 0 || left < 0) {
        errors.push('Margins must be non-negative values');
      }
      if (top + bottom > 200 || left + right > 200) {
        errors.push('Margins are too large for the page format');
      }
    }

    if (options.fontSize && (options.fontSize < 6 || options.fontSize > 72)) {
      errors.push('Font size must be between 6 and 72 points');
    }

    return errors;
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
   * Render markdown to HTML using marked library for better formatting
   */
  private static renderMarkdownToHtml(content: string, metadata: DocumentMetadata, options: ExportOptions = {}): string {
    const {
      includeMetadata = true,
      includeTableOfContents = false,
    } = options;

    // Configure marked for better rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // Convert markdown to HTML
    const htmlContent = marked(content);
    
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

    return `
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
    `;
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