import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { UploadCloud, CheckCircle2, History, FileSpreadsheet, FileJson } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { useAppStore } from '@/services/store';
import { JsonDropzone } from '@/components/import/JsonDropzone';
import { ImportPreviewModal } from '@/components/import/ImportPreviewModal';
import { SchemaViewer } from '@/components/import/SchemaViewer';
import { AiPromptCard } from '@/components/import/AiPromptCard';
import { PasteJsonModal } from '@/components/import/PasteJsonModal';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { RawExpenseReport } from '@/types';
import { SAMPLE_IMPORT_REPORT, SAMPLE_CSV_STATEMENT } from '@/data/mockData';
import { csvExporter } from '@/services/csvExporter';
import { csvParser } from '@/services/csvParser';
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
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);

  // Dynamic category names from household store
  const categoryNames = React.useMemo(() => {
    return categories.map((cat) => cat.name);
  }, [categories]);

  // Family member names from household store
  const memberNames = React.useMemo(() => {
    return members.map((member) => member.display_name);
  }, [members]);

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

  const handleLoadSampleCsv = () => {
    const parseResult = csvParser.parse(SAMPLE_CSV_STATEMENT);
    if (parseResult.success && parseResult.data) {
      handleFileParsed(parseResult.data, 'sample-bank-statement.csv');
    }
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
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: 130,
        maxWidth: 760,
        width: '100%',
        alignSelf: 'center',
      }}
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
          <CheckCircle2 size={22} color={theme.colors.success} strokeWidth={2.5} />
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

      {/* Prominent Bulk Import Action Card */}
      <Card
        padding="lg"
        style={{
          marginBottom: spacing.lg,
          borderWidth: 1.5,
          borderColor: theme.colors.cardBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radius.lg,
              backgroundColor: theme.colors.brandLight,
              borderWidth: 1.5,
              borderColor: `${theme.colors.brand}40`,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UploadCloud size={28} color={theme.colors.brand} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.heavy,
              }}
              numberOfLines={1}
            >
              {t.import.bulkImportTitle}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: typography.fontSizes.sm,
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              {t.import.bulkImportSubtitle}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title={t.import.loadSampleCsv}
              variant="secondary"
              size="md"
              icon={<FileSpreadsheet size={18} color={theme.colors.brand} strokeWidth={2.5} />}
              onPress={handleLoadSampleCsv}
              style={{ width: '100%' }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={t.import.loadSample}
              variant="secondary"
              size="md"
              icon={<FileJson size={18} color={theme.colors.brand} strokeWidth={2.5} />}
              onPress={handleLoadSample}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Card>

      {/* Free AI Prompt Generator Card */}
      <View style={{ marginBottom: spacing.lg }}>
        <AiPromptCard
          categories={categoryNames}
          currency={family.currency}
          familyMembers={memberNames}
          onOpenPasteModal={() => setIsPasteModalOpen(true)}
        />
      </View>

      {/* Main Upload Dropzone */}
      <View style={{ marginBottom: spacing.lg }}>
        <JsonDropzone
          onFileParsed={handleFileParsed}
          onOpenPasteModal={() => setIsPasteModalOpen(true)}
        />
      </View>

      {/* Schema Template Viewer */}
      <View style={{ marginBottom: spacing.lg }}>
        <SchemaViewer onLoadSample={handleLoadSample} />
      </View>

      {/* Export Section */}
      <Card padding="lg" style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {t.import.exportLedger}
        </Text>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: typography.fontSizes.sm,
            marginBottom: spacing.md,
          }}
          numberOfLines={1}
        >
          {t.import.exportLedgerSub} ({expenses.length} {t.common.items})
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title={t.import.exportCsv}
              variant="outline"
              size="md"
              icon={
                <FileSpreadsheet size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />
              }
              onPress={handleExportCsv}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={t.import.exportJson}
              variant="outline"
              size="md"
              icon={<FileJson size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />}
              onPress={handleExportJson}
              fullWidth
            />
          </View>
        </View>
      </Card>

      {/* Import History */}
      {importBatches.length > 0 && (
        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              marginBottom: spacing.sm,
            }}
          >
            <History size={18} color={theme.colors.textSecondary} strokeWidth={2.5} />
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
              }}
              numberOfLines={1}
            >
              {t.import.importHistory}
            </Text>
          </View>

          <View style={{ gap: spacing.xs }}>
            {importBatches.map((batch) => (
              <Card
                key={batch.id}
                padding="md"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1.5,
                  borderColor: theme.colors.borderTactile,
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {batch.file_name}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: typography.fontSizes.xs,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {new Date(batch.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ flexShrink: 0 }}>
                  <Badge
                    label={`${batch.total_records} ${t.dashboard.txs} • ${family.currency}${batch.total_amount.toFixed(2)}`}
                    color={theme.colors.brand}
                    size="md"
                  />
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}

      {/* Direct Paste JSON Modal */}
      <PasteJsonModal
        visible={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onReportParsed={handleFileParsed}
      />

      {/* Staged Report Confirmation Modal */}
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
