import { Component, OnInit, ViewChild } from '@angular/core';
import { IonModal, ToastController, AlertController } from '@ionic/angular';
import { ActividadService, ActividadPayload } from '../../services/actividad';

@Component({
  selector: 'app-admin-actividades',
  templateUrl: './admin-actividades.page.html',
  styleUrls: ['./admin-actividades.page.scss'],
  standalone: false
})
export class AdminActividadesPage implements OnInit {
  @ViewChild('modalDocentes') modalDocentes!: IonModal;

  modoFormulario: 'agregar' | 'editar' = 'agregar';
  busquedaActividad: string = '';
  busquedaDocente: string = '';
  idActividadSeleccionada: number | null = null;

  // Listas de datos desde FastAPI / Supabase
  listaActividades: any[] = [];
  actividadesFiltradas: any[] = [];
  listaDocentes: any[] = [];
  docentesFiltrados: any[] = [];
  listaTipos: any[] = [];
  listaEstados: any[] = [];
  listaSedes: any[] = [];

  // Formulario de Creación
  formulario = {
    nombre_actividad: '',
    descripcion: '',
    responsable_actividad: '',
    rut_usuario: '',
    id_tipo_actividad: null as number | null,
    id_estado_actividad: 1 as number | null, // Por defecto 1 (Programada)
    id_sede: null as number | null,
    fecha_inicio: '',
    fecha_termino: '',
    puntos: null as number | null,
    cupos: null as number | null,
    lugar: '',
    requisito: ''
  };

  // Formulario de Edición
  formularioEdicion = { ...this.formulario };

  constructor(
    private actividadService: ActividadService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.cargarCatalogos();
    this.cargarActividades();
  }

  // Carga inicial de datos desde los endpoints de catálogo
  cargarCatalogos() {
    this.actividadService.getDocentes().subscribe({
      next: (data) => {
        this.listaDocentes = data;
        this.docentesFiltrados = [...data];
      },
      error: () => this.mostrarToast('Error al cargar docentes desde la BD', 'danger')
    });

    this.actividadService.getTiposActividad().subscribe(data => this.listaTipos = data);
    this.actividadService.getEstadosActividad().subscribe(data => this.listaEstados = data);
    this.actividadService.getSedes().subscribe(data => this.listaSedes = data);
  }

  cargarActividades() {
    this.actividadService.getActividades().subscribe({
      next: (data) => {
        this.listaActividades = data;
        this.actividadesFiltradas = [...data];
      },
      error: () => this.mostrarToast('Error al cargar la lista de actividades', 'danger')
    });
  }

  // Filtrar lista de actividades en la vista principal
  filtrarActividades() {
    const q = this.busquedaActividad.toLowerCase().trim();
    if (!q) {
      this.actividadesFiltradas = [...this.listaActividades];
      return;
    }
    this.actividadesFiltradas = this.listaActividades.filter(act =>
      act.nombre_actividad?.toLowerCase().includes(q) ||
      (act.responsable_actividad && act.responsable_actividad.toLowerCase().includes(q))
    );
  }

  // Lógica para abrir el Mini Slide / Modal de docentes
  abrirModalDocentes(modo: 'agregar' | 'editar') {
    this.modoFormulario = modo;
    this.busquedaDocente = '';
    this.docentesFiltrados = [...this.listaDocentes];
    this.modalDocentes.present();
  }

  // Filtrar docentes dentro del Modal
  filtrarDocentes() {
    const q = this.busquedaDocente.toLowerCase().trim();
    if (!q) {
      this.docentesFiltrados = [...this.listaDocentes];
      return;
    }
    this.docentesFiltrados = this.listaDocentes.filter(doc =>
      (doc.nombre_completo && doc.nombre_completo.toLowerCase().includes(q)) ||
      (doc.rut_usuario && doc.rut_usuario.toLowerCase().includes(q))
    );
  }

  // Seleccionar docente y autocompletar Responsable y RUT
  seleccionarDocente(docente: { rut_usuario: string; nombre_completo: string }) {
    if (this.modoFormulario === 'agregar') {
      this.formulario.responsable_actividad = docente.nombre_completo;
      this.formulario.rut_usuario = docente.rut_usuario;
    } else {
      this.formularioEdicion.responsable_actividad = docente.nombre_completo;
      this.formularioEdicion.rut_usuario = docente.rut_usuario;
    }
    this.modalDocentes.dismiss();
  }

  limpiarFormulario() {
    this.formulario = {
      nombre_actividad: '',
      descripcion: '',
      responsable_actividad: '',
      rut_usuario: '',
      id_tipo_actividad: null,
      id_estado_actividad: 1, // Reset a 'Programada'
      id_sede: null,
      fecha_inicio: '',
      fecha_termino: '',
      puntos: null,
      cupos: null,
      lugar: '',
      requisito: ''
    };
  }

  // Convierte cadenas de fecha a ISO válido
  private formatearFechaISO(fechaStr: string): string {
    if (!fechaStr || fechaStr.trim() === '') return new Date().toISOString();
    const d = new Date(fechaStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // Construye el objeto exacto requerido por FastAPI
  private construirPayload(f: any): ActividadPayload {
    return {
      nombre_actividad: f.nombre_actividad,
      descripcion: f.descripcion || 'Sin descripción',
      responsable_actividad: f.responsable_actividad || 'Por asignar',
      rut_usuario: f.rut_usuario,
      id_tipo_actividad: Number(f.id_tipo_actividad),
      id_estado_actividad: f.id_estado_actividad ? Number(f.id_estado_actividad) : 1,
      id_sede: f.id_sede ? Number(f.id_sede) : 1,
      fecha_inicio: this.formatearFechaISO(f.fecha_inicio),
      fecha_termino: this.formatearFechaISO(f.fecha_termino),
      puntos: f.puntos ? Number(f.puntos) : 0,
      cupos: f.cupos ? Number(f.cupos) : 0,
      lugar: f.lugar || 'Por definir',
      requisito: f.requisito || 'Sin requisitos'
    };
  }

  // Guardar nueva actividad (FastAPI crea la actividad y llena las 5 tablas relacionadas)
  guardarActividad(modal: IonModal) {
    if (!this.formulario.nombre_actividad || !this.formulario.rut_usuario || !this.formulario.id_tipo_actividad) {
      this.mostrarToast('Por favor complete los campos obligatorios (*)', 'warning');
      return;
    }

    const payload = this.construirPayload(this.formulario);

    this.actividadService.crearActividad(payload).subscribe({
      next: () => {
        this.mostrarToast('Actividad creada exitosamente', 'success');
        this.cargarActividades();
        modal.dismiss();
        this.limpiarFormulario();
      },
      error: (err) => {
        console.error('Detalle error FastAPI:', err.error?.detail || err.error);
        this.mostrarToast('Error al crear la actividad', 'danger');
      }
    });
  }

  // Cargar datos en el modal de edición extrayendo datos relacionales anidados de la BD
  prepararEdicion(act: any, modal: IonModal) {
    this.idActividadSeleccionada = act.id_actividad;

    // Extracción segura soportando listas u objetos anidados de las tablas relacionales
    const puntoItem = Array.isArray(act.puntaje_act) ? act.puntaje_act[0] : act.puntaje_act;
    const cupoItem = Array.isArray(act.cupo_actividad) ? act.cupo_actividad[0] : act.cupo_actividad;
    const lugarItem = Array.isArray(act.lugar_actividad) ? act.lugar_actividad[0] : act.lugar_actividad;
    const calItem = Array.isArray(act.calendario) ? act.calendario[0] : act.calendario;
    const reqItem = Array.isArray(act.requisito_participacion) ? act.requisito_participacion[0] : act.requisito_participacion;

    this.formularioEdicion = {
      nombre_actividad: act.nombre_actividad || '',
      descripcion: act.descripcion || '',
      responsable_actividad: act.responsable_actividad || '',
      rut_usuario: act.rut_usuario || '',
      id_tipo_actividad: act.id_tipo_actividad || null,
      id_estado_actividad: act.id_estado_actividad || 1,
      id_sede: act.id_sede || null,
      fecha_inicio: act.fecha_inicio ? act.fecha_inicio.substring(0, 16) : '',
      fecha_termino: act.fecha_termino ? act.fecha_termino.substring(0, 16) : '',
      puntos: puntoItem?.cantidad ?? null,
      cupos: cupoItem?.cantidad ?? null,
      lugar: lugarItem?.descripcion || calItem?.lugar || '',
      requisito: reqItem?.descripcion || ''
    };

    modal.present();
  }

  // Actualizar actividad existente
  actualizarActividad(modal: IonModal) {
    if (!this.idActividadSeleccionada) return;

    const payload = this.construirPayload(this.formularioEdicion);

    this.actividadService.actualizarActividad(this.idActividadSeleccionada, payload).subscribe({
      next: () => {
        this.mostrarToast('Actividad actualizada correctamente', 'success');
        this.cargarActividades();
        modal.dismiss();
      },
      error: (err) => {
        console.error('Detalle error FastAPI:', err.error?.detail || err.error);
        this.mostrarToast('Error al actualizar la actividad', 'danger');
      }
    });
  }

  // Diálogo de confirmación antes de eliminar
  async confirmarEliminacion(id: number) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar esta actividad? Esta acción borrará la actividad y todos sus registros asociados.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.eliminarActividad(id);
          }
        }
      ]
    });
    await alert.present();
  }

  eliminarActividad(id: number) {
    this.actividadService.eliminarActividad(id).subscribe({
      next: () => {
        this.mostrarToast('Actividad eliminada correctamente', 'success');
        this.cargarActividades();
      },
      error: () => this.mostrarToast('Error al eliminar la actividad', 'danger')
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}