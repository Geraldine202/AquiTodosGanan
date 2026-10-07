import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
          // Filtrado local según estado de stock si aplica
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

  // --- MÉTODOS DE EXPORTACIÓN ---

  exportarExcel() {
    if (!this.reporteData.detalles || this.reporteData.detalles.length === 0) return;

    let dataExport: any[] = [];
    let filename = '';

    if (this.modoReporte === 'DETALLE_ACTIVIDAD') {
      filename = `Reporte_Actividad_${this.idActividadSeleccionada}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      dataExport = this.reporteData.detalles.map((item: any) => ({
        'RUT': item.rut || 'N/A',
          'Estudiante': item.estudiante || 'Sin Nombre',
          'Correo': item.correo || 'Sin Correo',
          'Asistencia': item.asistencia || 'Ausente',
          'Puntos Otorgados': item.puntos ?? 0
      }));
    } else {
      filename = `Reporte_Stock_Sede_${new Date().toISOString().slice(0, 10)}.xlsx`;
      dataExport = this.reporteData.detalles.map((item: any) => ({
        'Premio': item.premio,
        'Categoría': item.categoria,
        'Sede': item.sede,
        'Costo Puntos': item.costo_puntos,
        'Stock Actual': item.stock_actual,
        'Estado': item.estado_stock
      }));
    }

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExport);
    const workbook: XLSX.WorkBook = { Sheets: { 'Reporte': worksheet }, SheetNames: ['Reporte'] };
    XLSX.writeFile(workbook, filename);
  }

  exportarPDF() {
    if (!this.reporteData.detalles || this.reporteData.detalles.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(16);

    if (this.modoReporte === 'DETALLE_ACTIVIDAD') {
      doc.text(`Reporte: ${this.reporteData.kpis.nombre_actividad || 'Actividad'}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Fecha: ${this.reporteData.kpis.fecha || 'N/A'} | Inscritos: ${this.reporteData.kpis.total_inscritos} | Presentes: ${this.reporteData.kpis.total_presentes} (${this.reporteData.kpis.porcentaje_asistencia}%)`, 14, 22);

      const columns = ['RUT', 'Estudiante', 'Correo', 'Asistencia', 'Puntos'];
      const rows = this.reporteData.detalles.map((item: any) => [
        item.rut, item.estudiante, item.correo, item.asistencia, item.puntos
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });

      doc.save(`Reporte_Actividad_${new Date().toISOString().slice(0, 10)}.pdf`);
    } else {
      doc.text('Reporte de Stock de Premios por Sede', 14, 15);
      doc.setFontSize(10);
      doc.text(`Total Productos: ${this.reporteData.kpis.total_productos} | Unidades: ${this.reporteData.kpis.total_unidades_stock} | Stock Crítico: ${this.reporteData.kpis.alertas_criticas}`, 14, 22);

      const columns = ['Premio', 'Categoría', 'Sede', 'Costo Pts', 'Stock', 'Estado'];
      const rows = this.reporteData.detalles.map((item: any) => [
        item.premio, item.categoria, item.sede, item.costo_puntos, item.stock_actual, item.estado_stock
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] }
      });

      doc.save(`Reporte_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
  }
}