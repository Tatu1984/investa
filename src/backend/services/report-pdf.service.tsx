import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

export interface ReportPdfInput {
  date: string;
  title: string;
  summary: string;
  sections: {
    marketOverview: string;
    keySignals: string;
    topOpportunities: string;
    avoidList: string;
    sectorView: string;
    allocation: string;
  };
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1a1f2c" },
  brand: { fontSize: 9, color: "#7a7f8c", letterSpacing: 1, textTransform: "uppercase" },
  h1: { fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 6, lineHeight: 1.2 },
  meta: { fontSize: 9, color: "#7a7f8c", marginBottom: 20 },
  accentRule: { height: 2, backgroundColor: "#c99664", width: 40, marginBottom: 20 },
  lead: { fontSize: 12, lineHeight: 1.5, color: "#2e3547", marginBottom: 18 },
  sectionTitle: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#5a6070", marginTop: 14, marginBottom: 6 },
  sectionBody: { fontSize: 11, lineHeight: 1.55, color: "#2e3547" },
  footer: { position: "absolute", fontSize: 8, bottom: 30, left: 48, right: 48, color: "#8a8f99", borderTop: 1, borderColor: "#eaeaea", paddingTop: 8 },
  disclaimer: { fontSize: 8, color: "#8a8f99", lineHeight: 1.4 },
});

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

function ReportDoc({ data }: { data: ReportPdfInput }) {
  const s = data.sections;
  return (
    <Document title={data.title} author="Investa">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Investa · Daily Brief</Text>
        <Text style={styles.h1}>{data.title}</Text>
        <Text style={styles.meta}>Published {data.date} · Indian markets · End of day</Text>
        <View style={styles.accentRule} />
        <Text style={styles.lead}>{data.summary}</Text>

        <Section title="Market overview" body={s.marketOverview} />
        <Section title="Key signals" body={s.keySignals} />
        <Section title="Top opportunities" body={s.topOpportunities} />
        <Section title="Be careful with" body={s.avoidList} />
        <Section title="Sector view" body={s.sectorView} />
        <Section title="Asset allocation suggestion" body={s.allocation} />

        <View style={styles.footer} fixed>
          <Text style={styles.disclaimer}>
            Research-only. Not investment advice. Past performance is not a guarantee of future results.
            Model version rules-v0.1. Regenerated each market close. © Investa.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(data: ReportPdfInput): Promise<Buffer> {
  return renderToBuffer(<ReportDoc data={data} />);
}
