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

export default function ImportScreen() {
  const { theme, spacing, radius, typography } = useTheme();
  const { family, members, categories, expenses, importBatches, importExpenseReport } =
    useAppStore();

  const [stagedReport, setStagedReport] = useState<RawExpenseReport | null>(null);
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleFileParsed = (report: RawExpenseReport, fileName: string) => {
    setStagedReport(report);
    setStagedFileName(fileName);
  };

  const handleConfirmImport = () => {
    if (!stagedReport) return;

    const result = importExpenseReport(stagedReport, stagedFileName);
    setStagedReport(null);
    setSuccessNotice(
      `Successfully imported ${result.importedCount} transactions (${family.currency}${result.totalAmount.toFixed(2)}) into the ledger!`,
    );

    setTimeout(() => {
      setSuccessNotice(null);
    }, 5000);
  };

  const handleLoadSample = () => {
    handleFileParsed(SAMPLE_IMPORT_REPORT, 'sample-family-expense-report.json');
  };

  const handleExportJson = () => {
    const exportData = {
      family: family.name,
      currency: family.currency,
      exported_at: new Date().toISOString(),
      expenses: expenses,
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `family-expenses-${family.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else {
      Alert.alert('Export Ready', `Exported ${expenses.length} transactions as JSON.`);
    }
  };

  const handleExportCsv = () => {
    const csvContent = csvExporter.generateCsv(expenses, categories, members, family.currency);
    const fileName = `family-expenses-${family.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    csvExporter.downloadCsv(csvContent, fileName);
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
          Export Family Ledger
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.xs,
            marginBottom: spacing.md,
          }}
        >
          Download complete household ledger ({expenses.length} records) for backup or spreadsheet
          analysis.
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title="Export CSV"
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet size={14} color={theme.colors.textPrimary} />}
            onPress={handleExportCsv}
            style={{ flex: 1 }}
          />
          <Button
            title="Export JSON"
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
              Import History
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
                    records
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
