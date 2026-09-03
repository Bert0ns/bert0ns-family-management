import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import {
  Download,
  UploadCloud,
  CheckCircle2,
  History,
  Share2,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { JsonDropzone } from '@/components/import/JsonDropzone';
import { ImportPreviewModal } from '@/components/import/ImportPreviewModal';
import { SchemaViewer } from '@/components/import/SchemaViewer';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { RawExpenseReport } from '@/types';
import { SAMPLE_IMPORT_REPORT } from '@/data/mockData';
import { csvExporter } from '@/services/csvExporter';
import { exportAndShareFile } from '@/services/fileExporter';
import { importLogger } from '@/services/logger';

export default function ImportScreen() {
  const { theme, spacing, radius, typography } = useTheme();
  const { t } = useI18n();
  const { family, members, categories, expenses, importBatches, importExpenseReport } =
    useAppStore();

  const [stagedReport, setStagedReport] = useState<RawExpenseReport | null>(null);
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleFileParsed = (report: RawExpenseReport, fileName: string) => {
    importLogger.info('Staging expense report for preview', {
      fileName,
      expensesCount: report.expenses.length,
      currency: report.currency,
    });
    setStagedReport(report);
    setStagedFileName(fileName);
  };

  const handleConfirmImport = () => {
    if (!stagedReport) return;

    importLogger.info('Confirming expense report import', { fileName: stagedFileName });
    const result = importExpenseReport(stagedReport, stagedFileName);
    setStagedReport(null);
    setSuccessNotice(
      `${t.import.successNotice} (${result.importedCount} ${t.common.items} • ${family.currency}${result.totalAmount.toFixed(2)})`,
    );
  };

  React.useEffect(() => {
    if (!successNotice) return;
    const timer = setTimeout(() => {
      setSuccessNotice(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successNotice]);

  const handleLoadSample = () => {
    handleFileParsed(SAMPLE_IMPORT_REPORT, 'sample-family-expense-report.json');
  };

  const handleExportJson = async () => {
    const exportData = {
      family: family.name,
      currency: family.currency,
      exported_at: new Date().toISOString(),
      expenses: expenses,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `family-expenses-${family.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    await exportAndShareFile(jsonString, fileName, 'application/json');
  };

  const handleExportCsv = async () => {
    const csvContent = csvExporter.generateCsv(expenses, categories, members, family.currency);
    const fileName = `family-expenses-${family.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    await exportAndShareFile(csvContent, fileName, 'text/csv');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Notification Alert */}
      {successNotice && (
        <Card
          padding="md"
          style={{
            backgroundColor: theme.colors.successBg,
            borderColor: theme.colors.success,
            marginBottom: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <CheckCircle2 size={20} color={theme.colors.success} />
          <Text
            style={{
              color: theme.colors.success,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              flex: 1,
            }}
          >
            {successNotice}
          </Text>
        </Card>
      )}

      {/* Main Upload Dropzone */}
      <View style={{ marginBottom: spacing.lg }}>
        <JsonDropzone onFileParsed={handleFileParsed} />
      </View>

      {/* Schema Template Viewer */}
      <View style={{ marginBottom: spacing.lg }}>
        <SchemaViewer onLoadSample={handleLoadSample} />
      </View>

      {/* Export Section */}
      <Card padding="md" style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.bold,
            marginBottom: 2,
          }}
        >
          {t.import.exportLedger}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.md,
          }}
        >
          {t.import.exportLedgerSub} ({expenses.length} {t.common.items})
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title={t.import.exportCsv}
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet size={14} color={theme.colors.textPrimary} />}
            onPress={handleExportCsv}
            style={{ flex: 1 }}
          />
          <Button
            title={t.import.exportJson}
            variant="outline"
            size="sm"
            icon={<FileJson size={14} color={theme.colors.textPrimary} />}
            onPress={handleExportJson}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {/* Import History */}
      {importBatches.length > 0 && (
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              marginBottom: spacing.sm,
            }}
          >
            <History size={18} color={theme.colors.textSecondary} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              {t.import.importHistory}
            </Text>
          </View>

          <View style={{ gap: spacing.xs }}>
            {importBatches.map((batch) => (
              <Card
                key={batch.id}
                padding="sm"
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    {batch.file_name}
                  </Text>
                  <Text
                    style={{ color: theme.colors.textMuted, fontSize: typography.fontSizes.xs }}
                  >
                    {new Date(batch.created_at).toLocaleDateString()} • {batch.total_records}{' '}
                    {t.common.items}
                  </Text>
                </View>
                <Badge
                  label={`${family.currency}${batch.total_amount.toFixed(2)}`}
                  color={theme.colors.brand}
                  size="sm"
                />
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* Staging Preview Modal with Duplicate Detection */}
      <ImportPreviewModal
        visible={!!stagedReport}
        report={stagedReport}
        fileName={stagedFileName}
        existingExpenses={expenses}
        onClose={() => setStagedReport(null)}
        onConfirm={handleConfirmImport}
      />
    </ScrollView>
  );
}
