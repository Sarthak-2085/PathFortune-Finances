import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, ArrowRight, RefreshCcw } from 'lucide-react';
import { previewImportFile, processImportFile } from '../services/api';

export const DataImport: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    date: '',
    description: '',
    type: '',
    category: '',
    amount: '',
    vendor_customer: ''
  });
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      // Auto-preview
      setLoading(true);
      setImportError(null);
      try {
        const data = await previewImportFile(selected);
        setPreviewData(data);

        // Auto-guess column mappings
        const cols: string[] = data.columns;
        const autoMap: Record<string, string> = { ...columnMapping };
        cols.forEach(c => {
          const lower = c.toLowerCase();
          if (lower.includes('date')) autoMap.date = c;
          else if (lower.includes('desc') || lower.includes('particulars')) autoMap.description = c;
          else if (lower.includes('type')) autoMap.type = c;
          else if (lower.includes('cat')) autoMap.category = c;
          else if (lower.includes('amount') || lower.includes('val')) autoMap.amount = c;
          else if (lower.includes('vendor') || lower.includes('client') || lower.includes('payee')) autoMap.vendor_customer = c;
        });
        setColumnMapping(autoMap);
        setStep(2);
      } catch (err: any) {
        console.error("Failed parsing file", err);
        setImportError("Failed parsing file. Please ensure it is a valid CSV or Excel document.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleProcessImport = async () => {
    if (!file) return;

    setLoading(true);
    setImportError(null);
    try {
      const data = await processImportFile(file, columnMapping);
      setImportResult(data);
      setStep(4);
    } catch (err: any) {
      console.error("Error importing records", err);
      setImportError("Error importing records. Please check your column mapping and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Workflow Step Tracker */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between text-xs font-semibold text-slate-500">
        <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-brand-600 font-bold' : ''}`}>
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border text-[11px]">1</span>
          <span>Upload File</span>
        </div>
        <ArrowRight size={14} className="text-slate-300" />
        <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-brand-600 font-bold' : ''}`}>
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border text-[11px]">2</span>
          <span>Preview Dataset</span>
        </div>
        <ArrowRight size={14} className="text-slate-300" />
        <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-brand-600 font-bold' : ''}`}>
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border text-[11px]">3</span>
          <span>Map Columns</span>
        </div>
        <ArrowRight size={14} className="text-slate-300" />
        <div className={`flex items-center space-x-2 ${step >= 4 ? 'text-brand-600 font-bold' : ''}`}>
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border text-[11px]">4</span>
          <span>Validation Report</span>
        </div>
      </div>

      {/* Inline import error - replaces the previous browser alert() */}
      {importError && (
        <div className="flex items-start space-x-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800">
          <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
          <span>{importError}</span>
        </div>
      )}

      {/* STEP 1: Upload File */}
      {step === 1 && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4 hover:border-brand-500 transition-colors cursor-pointer relative">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center shadow-xs">
            <UploadCloud size={32} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Drop your financial dataset here</h3>
            <p className="text-xs text-slate-500 mt-1">Supports CSV and Excel (.xlsx, .xls) files</p>
          </div>
          <button className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-xs">
            Select Local File
          </button>
        </div>
      )}

      {/* STEP 2 & 3: Preview & Mapping */}
      {(step === 2 || step === 3) && previewData && (
        <div className="space-y-6">
          {/* Dataset Preview */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Dataset Preview ({previewData.filename})</h3>
                <p className="text-xs text-slate-500">{previewData.total_rows} total rows detected</p>
              </div>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1"
              >
                <span>Proceed to Mapping</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    {previewData.columns.map((col: string, idx: number) => (
                      <th key={idx} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.preview.map((row: any, rIdx: number) => (
                    <tr key={rIdx}>
                      {previewData.columns.map((col: string, cIdx: number) => (
                        <td key={cIdx} className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{String(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column Mapping Section */}
          {step === 3 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Map CSV Columns to System Fields</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {['date', 'description', 'type', 'category', 'amount', 'vendor_customer'].map((field) => (
                  <div key={field} className="space-y-1">
                    <label className="block font-semibold text-slate-700 capitalize">{field.replace('_', ' ')} *</label>
                    <select
                      value={columnMapping[field] || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs"
                    >
                      <option value="">-- Unmapped --</option>
                      {previewData.columns.map((col: string) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleProcessImport}
                  disabled={loading}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  {loading ? 'Validating & Importing...' : 'Run Data Ingestion'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Validation Report */}
      {step === 4 && importResult && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Data Import Execution Complete</h2>
            <p className="text-xs text-slate-500 mt-1">Validation engine processed file records successfully</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs max-w-lg mx-auto">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800">
              <div className="font-bold text-lg">{importResult.imported_count}</div>
              <div>Records Imported</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-800">
              <div className="font-bold text-lg">{importResult.duplicates_skipped}</div>
              <div>Duplicates Skipped</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-800">
              <div className="font-bold text-lg">{importResult.error_count}</div>
              <div>Validation Errors</div>
            </div>
          </div>

          <button
            onClick={() => { setStep(1); setFile(null); setPreviewData(null); }}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
          >
            Import Another Dataset
          </button>
        </div>
      )}
    </div>
  );
};
