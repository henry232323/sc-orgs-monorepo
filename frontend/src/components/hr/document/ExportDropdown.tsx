import React, { useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { 
  ChevronDownIcon, 
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PrinterIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

import { DocumentExportService, type DocumentMetadata, type ExportOptions } from '../../../services/DocumentExportService';
import { ExportSettingsModal } from './ExportSettingsModal';
import { ExportProgressIndicator } from './ExportProgressIndicator';

interface ExportDropdownProps {
  content: string;
  metadata: DocumentMetadata;
  className?: string;
  disabled?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  content,
  metadata,
  className = '',
  disabled = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    format: string;
    progress: number;
    status: string;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    DocumentExportService.getPdfExportPresets().standard || {}
  );

  const handleExport = async (format: 'html' | 'pdf' | 'md', options?: ExportOptions) => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress({
      format: format.toUpperCase(),
      progress: 0,
      status: 'Preparing export...',
    });

    try {
      // Simulate progress updates
      setExportProgress(prev => prev ? { ...prev, progress: 25, status: 'Processing content...' } : null);
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
      
      setExportProgress(prev => prev ? { ...prev, progress: 50, status: 'Generating file...' } : null);
      
      await DocumentExportService.exportAndDownload(
        content,
        metadata,
        format,
        options || exportOptions
      );
      
      setExportProgress(prev => prev ? { ...prev, progress: 100, status: 'Download started!' } : null);
      
      // Hide progress after a short delay
      setTimeout(() => {
        setExportProgress(null);
        setIsExporting(false);
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress({
        format: format.toUpperCase(),
        progress: 0,
        status: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      
      setTimeout(() => {
        setExportProgress(null);
        setIsExporting(false);
      }, 3000);
    }
  };

  const exportFormats = [
    {
      key: 'html' as const,
      label: 'HTML',
      description: 'Web page with embedded styles',
      icon: DocumentTextIcon,
      color: 'text-orange-600',
    },
    {
      key: 'pdf' as const,
      label: 'PDF',
      description: 'Portable document format',
      icon: DocumentArrowDownIcon,
      color: 'text-red-600',
    },
    {
      key: 'md' as const,
      label: 'Markdown',
      description: 'Raw markdown with metadata',
      icon: DocumentTextIcon,
      color: 'text-blue-600',
    },
  ];

  const pdfPresets = DocumentExportService.getPdfExportPresets();

  return (
    <>
      <div className={`relative ${className}`}>
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton
            disabled={disabled || isExporting}
            className="glass-button inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-semibold text-primary border border-glass hover:bg-glass-hover hover:border-glass-hover focus:outline-none focus:ring-2 focus:ring-glass-focus focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-[var(--duration-normal)]"
          >
            <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
            Export
            <ChevronDownIcon className="h-4 w-4 text-tertiary" aria-hidden="true" />
          </MenuButton>

          <MenuItems className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-[var(--radius-dropdown)] bg-dark-glass border border-glass-border shadow-[var(--shadow-glass-lg)] backdrop-blur-[var(--blur-glass-strong)] focus:outline-none divide-y divide-white/10">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-primary">Export Options</p>
                <p className="text-sm text-tertiary">Choose a format to download</p>
              </div>

              <div className="py-1">
                {exportFormats.map((format) => (
                  <MenuItem key={format.key}>
                    <button
                      onClick={() => handleExport(format.key)}
                      disabled={isExporting}
                      className="w-full flex items-center px-4 py-3 text-sm text-primary hover:bg-white/10 hover:backdrop-blur-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-b border-white/10 last:border-b-0"
                    >
                      <format.icon
                        className={`mr-3 h-5 w-5 ${format.color}`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{format.label}</div>
                        <div className="text-xs text-tertiary">{format.description}</div>
                      </div>
                    </button>
                  </MenuItem>
                ))}
              </div>

              <div className="py-1">
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-primary mb-2">PDF Presets</p>
                  <div className="space-y-1">
                    {Object.entries(pdfPresets).map(([presetName, preset]) => (
                      <button
                        key={presetName}
                        onClick={() => handleExport('pdf', preset)}
                        disabled={isExporting}
                        className="w-full text-left px-2 py-1 text-xs text-secondary hover:bg-white/5 rounded-[var(--radius-button)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                      >
                        <span className="font-medium">{presetName.charAt(0).toUpperCase() + presetName.slice(1)}</span>
                        <span className="ml-2 text-tertiary">
                          {preset.orientation} • {preset.pageFormat}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="py-1">
                <MenuItem>
                  <button
                    onClick={() => setShowSettings(true)}
                    disabled={isExporting}
                    className="w-full flex items-center px-4 py-2 text-sm text-primary hover:bg-white/10 hover:backdrop-blur-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-b border-white/10"
                  >
                    <Cog6ToothIcon
                      className="mr-3 h-5 w-5 text-tertiary"
                      aria-hidden="true"
                    />
                    Export Settings
                  </button>
                </MenuItem>
              </div>

              <div className="py-1">
                <MenuItem>
                  <button
                    onClick={() => DocumentExportService.exportToPdfPrint(content, metadata, exportOptions)}
                    disabled={isExporting}
                    className="w-full flex items-center px-4 py-2 text-sm text-primary hover:bg-white/10 hover:backdrop-blur-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PrinterIcon
                      className="mr-3 h-5 w-5 text-tertiary"
                      aria-hidden="true"
                    />
                    Print
                  </button>
                </MenuItem>
              </div>
            </MenuItems>
        </Menu>

        {exportProgress && (
          <ExportProgressIndicator
            format={exportProgress.format}
            progress={exportProgress.progress}
            status={exportProgress.status}
          />
        )}
      </div>

      <ExportSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        options={exportOptions}
        onSave={setExportOptions}
      />
    </>
  );
};