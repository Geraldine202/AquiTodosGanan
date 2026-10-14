import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type ModoReporte = 'DETALLE_ACTIVIDAD' | 'STOCK_SEDE';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: false
})
export class ReportesPage implements OnInit {

  // Control de Vista Activa
  modoReporte: ModoReporte = 'DETALLE_ACTIVIDAD';

  // Listas de Opciones para Filtros
  actividadesList: any[] = [];
  sedesList: any[] = [];

  // Filtros Seleccionados
  idActividadSeleccionada: number | null = null;
  idSedeSeleccionada: number | null = null;
  filtroEstadoStock: string = 'TODOS';

  // Respuestas del Backend FastAPI
  reporteData: any = {
    kpis: {},
    detalles: []
  };

  cargando: boolean = false;
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarActividades();
    this.cargarSedes();
  }

  // --- MÉTODOS DE INICIALIZACIÓN Y CARGA DE FILTROS ---

  cargarActividades() {
    this.http.get<any[]>(`${this.apiUrl}/actividades`).subscribe({
      next: (res) => {
        this.actividadesList = Array.isArray(res) ? res : (res as any)?.data || [];
        if (this.actividadesList.length > 0) {
          this.idActividadSeleccionada = this.actividadesList[0].id_actividad;
          this.generarReporte();
        }
      },
      error: (err) => console.error('Error al cargar actividades:', err)
    });
  }

  cargarSedes() {
    this.http.get<any[]>(`${this.apiUrl}/sedes`).subscribe({
      next: (res) => {
        this.sedesList = Array.isArray(res) ? res : (res as any)?.data || [];
      },
      error: (err) => console.error('Error al cargar sedes:', err)
    });
  }

  // --- MÉTODOS DE CONSULTA AL BACKEND ---

  cambiarModoReporte() {
    this.reporteData = { kpis: {}, detalles: [] };
    this.generarReporte();
  }

  generarReporte() {
    this.cargando = true;

    if (this.modoReporte === 'DETALLE_ACTIVIDAD') {
      if (!this.idActividadSeleccionada) {
        this.cargando = false;
        return;
      }
      this.http.get<any>(`${this.apiUrl}/reportes/detalle-actividad/${this.idActividadSeleccionada}`).subscribe({
        next: (data) => {
          this.reporteData = data || { kpis: {}, detalles: [] };
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error al cargar reporte de actividad:', err);
          this.reporteData = { kpis: {}, detalles: [] };
          this.cargando = false;
        }
      });
    } else {
      let url = `${this.apiUrl}/reportes/stock-sede`;
      if (this.idSedeSeleccionada) {
        url += `?id_sede=${this.idSedeSeleccionada}`;
      }

      this.http.get<any>(url).subscribe({
        next: (data) => {
          if (data && data.detalles) {
            if (this.filtroEstadoStock === 'CRITICO') {
              data.detalles = data.detalles.filter((d: any) => d.stock_actual <= 5 && d.stock_actual > 0);
            } else if (this.filtroEstadoStock === 'AGOTADO') {
              data.detalles = data.detalles.filter((d: any) => d.stock_actual === 0);
            }
          }
          this.reporteData = data || { kpis: {}, detalles: [] };
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error al cargar reporte de stock:', err);
          this.reporteData = { kpis: {}, detalles: [] };
          this.cargando = false;
        }
      });
    }
  }

  // --- HELPER PARA CARGAR IMAGEN COMO BASE64/BUFFER ---

  private obtenerImagenBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('No se pudo obtener el contexto del canvas');
        }
      };
      img.onerror = (err) => reject(err);
    });
  }

  // --- EXPORTACIÓN A EXCEL COLORIDO CON LOGO ---

  async exportarExcel() {
    if (!this.reporteData.detalles || this.reporteData.detalles.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Cargar e insertar logo en Excel
    try {
      const logoBase64 = await this.obtenerImagenBase64('assets/logo.png');
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0.2, row: 0.2 },
        ext: { width: 120, height: 80 }
      });
    } catch (e) {
      console.warn('No se pudo cargar el logo para Excel:', e);
    }

    // Título y Resumen KPIs
    worksheet.mergeCells('C2:G2');
    const titleCell = worksheet.getCell('C2');
    titleCell.value = this.modoReporte === 'DETALLE_ACTIVIDAD' 
      ? `REPORTE: ${this.reporteData.kpis.nombre_actividad || 'ACTIVIDAD'}`.toUpperCase()
      : 'REPORTE DE STOCK DE PREMIOS POR SEDE';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00172B' } }; // Azul oscuro Duoc
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Fila vacía de separación
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Definición de columnas e información de tabla
    let headers: string[] = [];
    let rowsData: any[] = [];

    if (this.modoReporte === 'DETALLE_ACTIVIDAD') {
      headers = ['RUT', 'Estudiante', 'Correo', 'Asistencia', 'Puntos Otorgados'];
      rowsData = this.reporteData.detalles.map((item: any) => [
        item.rut || 'N/A',
        item.estudiante || 'Sin Nombre',
        item.correo || 'Sin Correo',
        item.asistencia || 'Ausente',
        item.puntos ?? 0
      ]);
    } else {
      headers = ['Premio', 'Categoría', 'Sede', 'Costo Puntos', 'Stock Actual', 'Estado'];
      rowsData = this.reporteData.detalles.map((item: any) => [
        item.premio,
        item.categoria,
        item.sede,
        item.costo_puntos,
        item.stock_actual,
        item.estado_stock
      ]);
    }

    // Fila de encabezados de tabla
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF58220' } }; // Naranja Duoc Pro
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } }
      };
    });

    // Filas de datos estilizadas
    rowsData.forEach((data, idx) => {
      const row = worksheet.addRow(data);
      const isEven = idx % 2 === 0;

      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } // Filas intercaladas
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } }
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Ajuste automático de ancho de columnas
    worksheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell!({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 4, 35);
    });

    // Descarga del archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = this.modoReporte === 'DETALLE_ACTIVIDAD'
      ? `Reporte_Actividad_${this.idActividadSeleccionada}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Reporte_Stock_Sede_${new Date().toISOString().slice(0, 10)}.xlsx`;

    saveAs(new Blob([buffer]), filename);
  }

  // --- EXPORTACIÓN A PDF CON LOGO ---

  async exportarPDF() {
    if (!this.reporteData.detalles || this.reporteData.detalles.length === 0) return;

    const doc = new jsPDF();

    // Intentar agregar logo
    try {
      const logoBase64 = await this.obtenerImagenBase64('assets/logo.png');
      doc.addImage(logoBase64, 'PNG', 14, 10, 28, 18);
    } catch (e) {
      console.warn('No se pudo cargar el logo para PDF:', e);
    }

    doc.setFontSize(15);
    doc.setTextColor(0, 23, 43); // Azul Duoc #00172b

    if (this.modoReporte === 'DETALLE_ACTIVIDAD') {
      doc.text(`Reporte: ${this.reporteData.kpis.nombre_actividad || 'Actividad'}`, 36, 17);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Fecha: ${this.reporteData.kpis.fecha || 'N/A'} | Inscritos: ${this.reporteData.kpis.total_inscritos} | Presentes: ${this.reporteData.kpis.total_presentes} (${this.reporteData.kpis.porcentaje_asistencia}%)`, 36, 23);

      const columns = ['RUT', 'Estudiante', 'Correo', 'Asistencia', 'Puntos'];
      const rows = this.reporteData.detalles.map((item: any) => [
        item.rut, item.estudiante, item.correo, item.asistencia, item.puntos
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 32,
        theme: 'striped',
        headStyles: { fillColor: [245, 130, 32], textColor: [255, 255, 255], fontStyle: 'bold' }, // Encabezado naranja #f58220
        styles: { fontSize: 9 }
      });

      doc.save(`Reporte_Actividad_${new Date().toISOString().slice(0, 10)}.pdf`);
    } else {
      doc.text('Reporte de Stock de Premios por Sede', 36, 17);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Productos: ${this.reporteData.kpis.total_productos} | Unidades: ${this.reporteData.kpis.total_unidades_stock} | Stock Crítico: ${this.reporteData.kpis.alertas_criticas}`, 36, 23);

      const columns = ['Premio', 'Categoría', 'Sede', 'Costo Pts', 'Stock', 'Estado'];
      const rows = this.reporteData.detalles.map((item: any) => [
        item.premio, item.categoria, item.sede, item.costo_puntos, item.stock_actual, item.estado_stock
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 32,
        theme: 'striped',
        headStyles: { fillColor: [0, 23, 43], textColor: [255, 255, 255], fontStyle: 'bold' }, // Encabezado azul #00172b
        styles: { fontSize: 9 }
      });

      doc.save(`Reporte_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
  }
}