import React, { useState, useEffect } from 'react';
import Dialog from '../../ui/Dialog';
import Button from '../../ui/Button';
import { DocumentExportService, type ExportOptions } from '../../../services/DocumentExportService';

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ExportOptions;
  onSave: (options: ExportOptions) => void;
}

export const ExportSettingsModal: React.FC<ExportSettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onSave,
}) => {
  const [localOptions, setLocalOptions] = useState<ExportOptions>(options);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  const handleSave = () => {
    const errors = DocumentExportService.validatePdfOptions(localOptions);
    setValidationErrors(errors);

    if (errors.length === 0) {
      onSave(localOptions);
      onClose();
    }
  };

  const handlePresetSelect = (presetName: string) => {
    const presets = DocumentExportService.getPdfExportPresets();
    const preset = presets[presetName];
    if (preset) {
      setLocalOptions(preset);
      setValidationErrors([]);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setLocalOptions(prev => ({ ...prev, [key]: value }));
    setValidationErrors([]);
  };

  const updateMargin = (side: 'top' | 'right' | 'bottom' | 'left', value: number) => {
    setLocalOptions(prev => ({
      ...prev,
      margins: {
        top: prev.margins?.top || 20,
        right: prev.margins?.right || 20,
        bottom: prev.margins?.bottom || 20,
        left: prev.margins?.left || 20,
        [side]: value,
      },
    }));
    setValidationErrors([]);
  };

  const presets = DocumentExportService.getPdfExportPresets();

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Export Settings"
      size="xl"
    >
      {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-[var(--radius-glass-sm)]">
            <h4 className="text-sm font-semibold text-error mb-1">
              Please fix the following errors:
            </h4>
            <ul className="text-sm text-error/80 list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

      <div className="space-y-6">
          {/* Presets */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).map(([presetName, preset]) => (
                <button
                  key={presetName}
                  onClick={() => handlePresetSelect(presetName)}
                  className="p-3 text-left border border-glass-border rounded-[var(--radius-glass-sm)] hover:bg-glass-hover focus:outline-none focus:ring-2 focus:ring-glass-focus transition-all duration-[var(--duration-normal)]"
                >
                  <div className="font-semibold capitalize text-sm text-primary">
                    {presetName}
                  </div>
                  <div className="text-xs text-tertiary mt-1">
                    {preset.pageFormat} • {preset.orientation}
                    {preset.includeMetadata && ' • With metadata'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Page Format and Orientation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pageFormat" className="block text-sm font-semibold text-primary mb-2">
                Page Format
              </label>
              <select
                id="pageFormat"
                value={localOptions.pageFormat || 'A4'}
                onChange={(e) => updateOption('pageFormat', e.target.value as 'A4' | 'Letter')}
                className="w-full px-3 py-2 border border-glass-border rounded-[var(--radius-glass-sm)] bg-dark-glass text-primary focus:outline-none focus:ring-2 focus:ring-glass-focus transition-all duration-[var(--duration-normal)]"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </select>
            </div>

            <div>
              <label htmlFor="orientation" className="block text-sm font-semibold text-primary mb-2">
                Orientation
              </label>
              <select
                id="orientation"
                value={localOptions.orientation || 'portrait'}
                onChange={(e) => updateOption('orientation', e.target.value as 'portrait' | 'landscape')}
                className="w-full px-3 py-2 border border-glass-border rounded-[var(--radius-glass-sm)] bg-dark-glass text-primary focus:outline-none focus:ring-2 focus:ring-glass-focus transition-all duration-[var(--duration-normal)]"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* Margins */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Margins (mm)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-tertiary mb-1">Top</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={localOptions.margins?.top || 20}
                  onChange={(e) => updateMargin('top', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-glass-border rounded-[var(--radius-glass-sm)] bg-dark-glass text-primary focus:outline-none focus:ring-2 focus:ring-glass-focus transition-all duration-[var(--duration-normal)]"
                />
              </div>
              <div>
                <label className="block text-xs text-tertiary mb-1">Right</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={localOptions.margins?.right || 20}
                  onChange={(e) => updateMargin('right', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-glass-border rounded-[var(--radius-glass-sm)] bg-dark-glass text-primary focus:outline-none focus:ring-2 focus:ring-glass-focus transition-all duration-[var(--duration-normal)]"
                />
              </div>
              <div>
                <label className="block text-xs text-tertiary mb-1">Bottom</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={localOptions.margins?.bottom || 20}
                  onChange={(e) => updateMargin('bottom', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-glass-border rounded-[var(--radius-glass-sm)] bg-dark-glass text-primary focus:outline-none focus:ring-2 focus:ring-glass-focus transition-all duration-[var(--duration-normal)]"
                />
              </div>
              <div>
                <label className="block text-xs text-tertiary mb-1">Left</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={localOptions.margins?.left || 20}
                  onChange={(e) => updateMargin('left', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-glass-border rounded-[var(--radius-glass-sm)] bg-dark-glass text-primary focus:outline-none focus:ring-2 focus:ring-glass-focus transition-all duration-[var(--duration-normal)]"
                />
              </div>
            </div>
          </div>

                  {/* Content Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Content Options
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOptions.includeMetadata ?? true}
                          onChange={(e) => updateOption('includeMetadata', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Include document metadata</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOptions.includeTableOfContents ?? false}
                          onChange={(e) => updateOption('includeTableOfContents', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Include table of contents</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOptions.includePageNumbers ?? true}
                          onChange={(e) => updateOption('includePageNumbers', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Include page numbers</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOptions.includeHeader ?? true}
                          onChange={(e) => updateOption('includeHeader', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Include header</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localOptions.includeFooter ?? true}
                          onChange={(e) => updateOption('includeFooter', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Include footer</span>
                      </label>
                    </div>
                  </div>

                  {/* Font Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Size (pt)
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="72"
                        value={localOptions.fontSize || 12}
                        onChange={(e) => updateOption('fontSize', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Font Family
                      </label>
                      <select
                        value={localOptions.fontFamily || 'helvetica'}
                        onChange={(e) => updateOption('fontFamily', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="helvetica">Helvetica</option>
                        <option value="times">Times</option>
                        <option value="courier">Courier</option>
                      </select>
                    </div>
                  </div>
                </div>

      <div className="mt-8 flex justify-end space-x-3">
        <Button
          variant="ghost"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
        >
          Save Settings
        </Button>
      </div>
    </Dialog>
  );
};