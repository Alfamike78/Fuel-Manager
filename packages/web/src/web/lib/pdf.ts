import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_NAVY = "#1b3a5c";
const BRAND_SAND = "#d6c4a0";

function addHeader(doc: jsPDF, title: string, companyName: string) {
  doc.setFillColor(27, 58, 92); // navy
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(214, 196, 160); // sand
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(companyName || "PilotCraft Solutions", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 21);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generato il ${new Date().toLocaleString("it-IT")}`, 196, 21, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

export function exportMovementsPDF(
  movements: any[],
  tankMap: Record<string, any>,
  heliMap: Record<string, any>,
  companyName: string
) {
  const doc = new jsPDF();
  addHeader(doc, "Report Movimenti Carburante", companyName);

  const totalRefuel = movements.filter((m) => m.type === "refuel").reduce((s, m) => s + m.liters, 0);
  const totalConsumption = movements.filter((m) => m.type === "consumption").reduce((s, m) => s + m.liters, 0);
  const totalDrain = movements.filter((m) => m.type === "drain_check").reduce((s, m) => s + m.liters, 0);

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`Rifornimenti totali: ${totalRefuel.toLocaleString()} L`, 14, 36);
  doc.text(`Consumi totali: ${totalConsumption.toLocaleString()} L`, 14, 42);
  doc.text(`Spurghi totali: ${totalDrain.toLocaleString()} L`, 14, 48);
  doc.text(`Movimenti totali: ${movements.length}`, 14, 54);

  const rows = movements.map((m) => [
    m.date + " " + (m.time ?? ""),
    m.type === "refuel" ? "Rifornimento" : m.type === "consumption" ? "Consumo" : m.type === "transfer" ? "Trasferimento" : "Drain Check",
    tankMap[m.tankId]?.name ?? "-",
    m.toTankId ? (tankMap[m.toTankId]?.name ?? "-") : (heliMap[m.helicopterId]?.name ?? "-"),
    `${m.liters?.toLocaleString() ?? 0} L`,
    m.notes ?? "",
  ]);

  autoTable(doc, {
    startY: 60,
    head: [["Data/Ora", "Tipo", "Cisterna", "Destinazione/Mezzo", "Litri", "Note"]],
    body: rows,
    headStyles: { fillColor: [27, 58, 92], textColor: [214, 196, 160] },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`report-movimenti-${new Date().toISOString().split("T")[0]}.pdf`);
}

export function exportDrainChecksPDF(
  drainChecks: any[],
  tankMap: Record<string, any>,
  heliMap: Record<string, any>,
  companyName: string
) {
  const doc = new jsPDF();
  addHeader(doc, "Report Drain Check", companyName);

  const rows = drainChecks.map((d) => [
    d.date + " " + (d.time ?? ""),
    tankMap[d.tankId]?.name ?? heliMap[d.helicopterId]?.name ?? "-",
    `${d.liters?.toLocaleString() ?? 0} L`,
    d.quality === "ok" ? "Regolare" : d.quality === "water" ? "Acqua presente" : "Impurità",
    d.notes ?? "",
  ]);

  autoTable(doc, {
    startY: 34,
    head: [["Data/Ora", "Cisterna/Mezzo", "Litri", "Esito", "Note"]],
    body: rows,
    headStyles: { fillColor: [27, 58, 92], textColor: [214, 196, 160] },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = data.cell.raw as string;
        if (val === "Acqua presente" || val === "Impurità") {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  doc.save(`report-drain-check-${new Date().toISOString().split("T")[0]}.pdf`);
}
