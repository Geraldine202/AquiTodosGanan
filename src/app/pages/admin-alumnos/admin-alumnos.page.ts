import { Component, OnInit, ViewChild } from '@angular/core';
import { AlumnoService, HistorialPayload } from 'src/app/services/alumno'; 
import { ActividadService } from 'src/app/services/actividad';
import { AlertController, ToastController, IonModal } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-alumnos',
  templateUrl: './admin-alumnos.page.html',
  styleUrls: ['./admin-alumnos.page.scss'],
  standalone: false
})
export class AdminAlumnosPage implements OnInit {
  @ViewChild('modalEditar1') modalEditar1!: IonModal;
  @ViewChild('modalAgregar') modalAgregar!: IonModal;

  alumnos: any[] = []; 
  alumnosFiltrados: any[] = [];

  // Control para el segmento: 'todos' | 'alumnos' | 'consejeros'
  filtroApartado: string = 'todos';

  carreras: any[] = [];
  escuelas: any[] = [];
  sedes: any[] = [];
  jornadas: any[] = [];
  tiposCarrera: any[] = [];
  estadosMatricula: any[] = [];
  periodosAcademicos: any[] = [];

  historialAlumno: any[] = [];
  alumnoSeleccionado: any = null; 
  estadoPrevio: any = null;
  justificacionEstado: string = '';

  nuevoAlumno: any = {
    rut_usuario: '', 
    nombre_completo: '', 
    genero: '', 
    correo: '',
    id_carrera: null,
    id_escuela: null,
    id_sede: 1,
    id_comuna: 1, 
    id_periodo_academico: 1, 
    id_estado_matricula: 1,
    id_tipo_usuario: 1, 
    id_jornada_carrera: null,
    id_tipo_carrera: null,
    direccion: '', 
    telefono: null, 
    fecha_nacimiento: '',
    id_requisito: null,
    puntaje_total: 0,
    actividades_inscritas: 0,
    historial_academico_resumen: '',
    matriculado: true,
    suspension: false,
    sumario: false,
    observacion: ''
  };

  archivoSeleccionado: File | null = null;
  imagenPreview: string | null = null;
  textoBuscar: string = '';

  constructor(
    private alumnoService: AlumnoService, 
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() { 
    this.obtenerAlumnos(); 
    this.obtenerCatalogos();
  }

  private extraerArreglo(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.result)) return res.result;
    if (Array.isArray(res.datos)) return res.datos;
    return [];
  }

  /**
   * Extrae el ID del rol/tipo de usuario buscando en múltiples propiedades posibles
   */
  obtenerTipoUsuario(alu: any): number {
    const val = alu?.id_tipo_usuario ?? 
                alu?.tipo_usuario?.id_tipo_usuario ?? 
                alu?.id_rol ?? 
                alu?.rol?.id_rol ?? 
                1;
    return Number(val);
  }

  /**
   * Normaliza cualquier RUT al formato estándar con puntos y guión (XX.XXX.XXX-X)
   */
  private formatearRutChile(rut: string): string {
    if (!rut) return '';
    const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length < 2) return rut;

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const cuerpoFormateado = Number(cuerpo).toLocaleString('es-CL');

    return `${cuerpoFormateado}-${dv}`;
  }

  /**
   * Extrae dinámicamente el puntaje total del alumno
   */
  obtenerPuntajeReal(alu: any): number {
    if (!alu) return 0;

    if (typeof alu.puntaje_total === 'number') return alu.puntaje_total;

    if (Array.isArray(alu.puntaje_total)) {
      if (alu.puntaje_total.length === 0) return 0;
      return alu.puntaje_total.reduce((acc: number, curr: any) => {
        const val = typeof curr === 'number' ? curr : (curr?.puntaje || curr?.puntaje_total || 0);
        return acc + Number(val);
      }, 0);
    }

    if (typeof alu.puntaje_total === 'object' && alu.puntaje_total !== null) {
      return Number(alu.puntaje_total.puntaje || alu.puntaje_total.total || 0);
    }

    return Number(alu.puntaje_total) || 0;
  }

  /**
   * Obtiene el conteo real de actividades del backend si el usuario es encargado
   */
  async obtenerActividadesReales(alu: any): Promise<number> {
    if (!alu || !alu.rut_usuario) return 0;

    const tipoUser = this.obtenerTipoUsuario(alu);

    if ([2, 3, 4].includes(tipoUser)) {
      try {
        const rutSanitizado = encodeURIComponent(alu.rut_usuario);

        const conteo = await firstValueFrom(
          this.actividadService.getConteoActividadesPorUsuario(rutSanitizado)
        );

        if (conteo && typeof conteo.total_actividades === 'number') {
          return conteo.total_actividades;
        }
      } catch (err) {
        console.warn(`No se pudo consultar el conteo para RUT ${alu.rut_usuario}:`, err);
      }
    }

    return 0;
  }

  /**
   * Carga los usuarios/alumnos y asigna el conteo de actividades
   */
  obtenerAlumnos() {
    this.alumnoService.getAlumnos().subscribe({
      next: async (res: any) => {
        const datosBrutos = this.extraerArreglo(res);

        this.alumnos = await Promise.all(
          datosBrutos.map(async (alu) => {
            const conteoActividades = await this.obtenerActividadesReales(alu);
            const tipoUser = this.obtenerTipoUsuario(alu);
            const esEncargado = [2, 3, 4].includes(tipoUser);

            return {
              ...alu,
              id_tipo_usuario: tipoUser,
              puntaje_total: this.obtenerPuntajeReal(alu),
              actividades_a_cargo: esEncargado ? conteoActividades : 0,
              actividades_cargo_count: esEncargado ? conteoActividades : 0,
              actividades_inscritas: !esEncargado ? conteoActividades : (alu.actividades_inscritas || 0)
            };
          })
        );

        this.filtrarAlumnos();
      },
      error: (err) => {
        console.error('Error al cargar alumnos:', err);
        this.mostrarToast('Error al cargar la lista de alumnos', 'danger');
      }
    });
  }

  cargarHistorial(rut: string) {
    if (!rut) return;

    this.alumnoService.getHistorialByRut(rut).subscribe({
      next: (res: any) => {
        const registros = this.extraerArreglo(res);
        this.historialAlumno = registros.map(item => ({
          ...item,
          fecha_mostrar: item.fecha_registro || item.fecha || new Date()
        }));
      },
      error: (err) => {
        console.error('Error al consultar historial del backend:', err.error || err);
        this.historialAlumno = [];
      }
    });
  }

  obtenerCatalogos() {
    this.alumnoService.getCarreras().subscribe({
      next: (res: any) => { this.carreras = this.extraerArreglo(res); },
      error: (err) => console.error('Error cargando carreras:', err)
    });

    this.alumnoService.getEscuelas().subscribe({ 
      next: (res: any) => { this.escuelas = this.extraerArreglo(res); },
      error: (err) => console.error('Error cargando escuelas:', err)
    });

    this.alumnoService.getSedes().subscribe({ 
      next: (res: any) => { this.sedes = this.extraerArreglo(res); },
      error: (err) => console.error('Error cargando sedes:', err)
    });

    this.alumnoService.getJornadas().subscribe({ 
      next: (res: any) => { this.jornadas = this.extraerArreglo(res); },
      error: (err) => console.error('Error cargando jornadas:', err)
    });

    this.alumnoService.getTiposCarrera().subscribe({ 
      next: (res: any) => { this.tiposCarrera = this.extraerArreglo(res); },
      error: (err) => console.error('Error cargando tipos de carrera:', err)
    });

    this.alumnoService.getEstadosMatricula().subscribe({ 
      next: (res: any) => { this.estadosMatricula = this.extraerArreglo(res); },
      error: (err) => console.error('Error cargando estados matrícula:', err)
    });

    this.alumnoService.getPeriodosAcademicos().subscribe({ 
      next: (res: any) => { this.periodosAcademicos = this.extraerArreglo(res); },
      error: (err) => console.error('Error cargando periodos:', err)
    });
  }

  onCarreraChange(modal: 'nuevo' | 'editar') {
    const target = modal === 'nuevo' ? this.nuevoAlumno : this.alumnoSeleccionado;
    if (!target || !target.id_carrera) return;

    const carreraSel = this.carreras.find(c => Number(c.id_carrera) === Number(target.id_carrera));
    if (carreraSel) {
      target.id_escuela = carreraSel.id_escuela || target.id_escuela;
      if (carreraSel.id_jornada_carrera) target.id_jornada_carrera = carreraSel.id_jornada_carrera;
      if (carreraSel.id_tipo_carrera) target.id_tipo_carrera = carreraSel.id_tipo_carrera;
    }
  }

  onConsejeroChange(event: any) {
    if (!this.alumnoSeleccionado) return;
    const esConsejero = event.detail.checked;
    this.alumnoSeleccionado.id_tipo_usuario = esConsejero ? 4 : 1;
  }

  esEstadoSuspendida(idEstado: any): boolean {
    if (!idEstado) return false;
    const est = this.estadosMatricula.find(e => Number(e.id_estado_matricula) === Number(idEstado));
    if (est) {
      const nombre = (est.nombre_estado || est.descripcion || '').toLowerCase();
      return nombre.includes('suspend') || nombre.includes('suspensión') || nombre.includes('suspension');
    }
    return Number(idEstado) === 2;
  }

  onEstadoMatriculaChange(idEstado: any) {
    if (!this.alumnoSeleccionado) return;
    const esSuspendida = this.esEstadoSuspendida(idEstado);
    this.alumnoSeleccionado.suspension = esSuspendida;
    if (!esSuspendida) {
      this.justificacionEstado = '';
    }
  }

  filtrarAlumnos() {
    if (!Array.isArray(this.alumnos)) {
      this.alumnosFiltrados = [];
      return;
    }

    let resultado = [...this.alumnos];
    const texto = this.textoBuscar.trim().toLowerCase();

    if (texto !== '') {
      resultado = resultado.filter(alu => {
        const nombre = alu.nombre_completo ? String(alu.nombre_completo).toLowerCase() : '';
        const rut = alu.rut_usuario ? String(alu.rut_usuario).toLowerCase() : '';
        const carrera = typeof alu.carrera === 'string' 
          ? alu.carrera.toLowerCase() 
          : (alu.carrera?.descripcion?.toLowerCase() || alu.carrera?.nombre_carrera?.toLowerCase() || '');
        
        return nombre.includes(texto) || rut.includes(texto) || carrera.includes(texto);
      });
    }

    if (this.filtroApartado === 'alumnos') {
      resultado = resultado.filter(alu => this.obtenerTipoUsuario(alu) !== 4);
    } else if (this.filtroApartado === 'consejeros') {
      resultado = resultado.filter(alu => this.obtenerTipoUsuario(alu) === 4);
    }

    resultado.sort((a, b) => {
      const tipoA = this.obtenerTipoUsuario(a);
      const tipoB = this.obtenerTipoUsuario(b);
      
      if (tipoA !== tipoB) {
        return tipoB === 4 ? 1 : -1;
      }
      
      const nombreA = a.nombre_completo || '';
      const nombreB = b.nombre_completo || '';
      return nombreA.localeCompare(nombreB);
    });

    this.alumnosFiltrados = resultado;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Crea el alumno en el backend.
   * La API se encarga de generar el hash con los números del RUT sin DV
   * y enviar la notificación con las credenciales al correo del alumno.
   */
  agregarAlumno() {
    if (!this.nuevoAlumno.rut_usuario || !this.nuevoAlumno.nombre_completo || !this.nuevoAlumno.correo) {
      this.mostrarToast('RUT, Nombre y Correo son obligatorios', 'warning');
      return;
    }

    const {
      jornada, tipo_carrera, periodo_academico, id_jornada_carrera, id_tipo_carrera, ...datosValidos
    } = this.nuevoAlumno;

    const payload = {
      ...datosValidos,
      fecha_nacimiento: datosValidos.fecha_nacimiento ? datosValidos.fecha_nacimiento : null,
      direccion: datosValidos.direccion ? datosValidos.direccion : null,
      telefono: datosValidos.telefono ? Number(datosValidos.telefono) : null,
      id_carrera: datosValidos.id_carrera ? Number(datosValidos.id_carrera) : null,
      id_escuela: datosValidos.id_escuela ? Number(datosValidos.id_escuela) : null,
      id_sede: datosValidos.id_sede ? Number(datosValidos.id_sede) : 1,
      id_comuna: datosValidos.id_comuna ? Number(datosValidos.id_comuna) : 1,
      id_estado_matricula: datosValidos.id_estado_matricula ? Number(datosValidos.id_estado_matricula) : 1,
      id_periodo_academico: datosValidos.id_periodo_academico ? Number(datosValidos.id_periodo_academico) : 1,
      id_tipo_usuario: 1,
      puntaje_total: Number(datosValidos.puntaje_total || 0),
      actividades_inscritas: Number(datosValidos.actividades_inscritas || 0),
      historial_academico_resumen: datosValidos.historial_academico_resumen || 'Registro inicial del alumno'
    };

    this.alumnoService.addAlumno(payload, this.archivoSeleccionado || undefined).subscribe({
      next: () => {
        this.mostrarToast('Alumno registrado con éxito. Se enviaron las credenciales por correo.', 'success');
        this.modalAgregar.dismiss();
        this.resetForm();
        this.obtenerAlumnos();
      },
      error: (err) => {
        console.error('ERROR DETALLADO:', err.error);
        const detalle = err.error?.error || 'Error al procesar la solicitud';
        this.mostrarToast(`Error al guardar: ${detalle}`, 'danger');
      }
    });
  }

  async eliminarAlumno(param: any) {
    const rut = typeof param === 'string' ? param : param?.rut_usuario;

    if (!rut) {
      this.mostrarToast('No se encontró un RUT válido para eliminar', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Está seguro de eliminar al alumno con RUT ${rut}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.alumnoService.deleteAlumno(rut).subscribe({
              next: () => {
                if (this.alumnoSeleccionado?.rut_usuario === rut) {
                  this.alumnoSeleccionado = null;
                }
                this.resetForm();
                this.obtenerAlumnos();
                this.mostrarToast('Alumno y sus registros fueron eliminados correctamente', 'success');
              },
              error: (err) => {
                console.error('Error DELETE:', err);
                const msg = err?.error?.error || err?.error?.message || 'Error al eliminar alumno';
                this.mostrarToast(msg, 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async prepararEdicion(alumno: any) {
    if (!alumno) return;

    this.limpiarImagenes();

    const validacion = Array.isArray(alumno.validacion_usuario) 
      ? alumno.validacion_usuario[0] 
      : alumno.validacion_usuario;

    const historial = Array.isArray(alumno.historial_academico) 
      ? alumno.historial_academico[0] 
      : alumno.historial_academico;

    const conteoActividades = await this.obtenerActividadesReales(alumno);
    const tipoUser = this.obtenerTipoUsuario(alumno);
    const esEncargado = [2, 3, 4].includes(tipoUser);

    this.alumnoSeleccionado = {
      ...alumno,
      id_tipo_usuario: tipoUser,
      id_carrera: alumno.id_carrera || (typeof alumno.carrera === 'object' ? alumno.carrera?.id_carrera : null),
      id_escuela: alumno.id_escuela || historial?.id_escuela || null,
      id_requisito: alumno.id_requisito || validacion?.id_requisito || null,
      id_estado_matricula: alumno.id_estado_matricula || alumno.estado_matricula?.id_estado_matricula || 1,
      matriculado: validacion?.matriculado !== undefined ? validacion.matriculado : true,
      suspension: validacion?.suspension !== undefined ? validacion.suspension : false,
      sumario: validacion?.sumario !== undefined ? validacion.sumario : false,
      observacion: validacion?.observacion || alumno.observacion || '',
      cumple: validacion?.cumple !== undefined ? validacion.cumple : true,
      id_jornada_carrera: alumno.id_jornada_carrera || null,
      id_tipo_carrera: alumno.id_tipo_carrera || null,
      id_periodo_academico: alumno.id_periodo_academico || 1,
      puntaje_total: this.obtenerPuntajeReal(alumno),
      actividades_a_cargo: esEncargado ? conteoActividades : 0,
      actividades_cargo_count: esEncargado ? conteoActividades : 0,
      actividades_inscritas: !esEncargado ? conteoActividades : (alumno.actividades_inscritas || 0),
      historial_academico_resumen: ''
    };

    this.justificacionEstado = this.alumnoSeleccionado.observacion || '';
    this.estadoPrevio = JSON.parse(JSON.stringify(this.alumnoSeleccionado));

    if (this.alumnoSeleccionado.rut_usuario) {
      this.cargarHistorial(this.alumnoSeleccionado.rut_usuario);
    }

    if (this.alumnoSeleccionado.id_carrera) {
      this.onCarreraChange('editar');
    }

    this.modalEditar1.present();
  }

  async actualizarAlumno() {
    if (!this.alumnoSeleccionado) return;
    const rut = this.alumnoSeleccionado.rut_usuario;

    const cambios: string[] = [];

    if (this.estadoPrevio && Number(this.alumnoSeleccionado.id_tipo_usuario) !== Number(this.estadoPrevio.id_tipo_usuario)) {
      const nuevoRol = Number(this.alumnoSeleccionado.id_tipo_usuario) === 4 ? 'Consejero de Carrera' : 'Alumno Regular';
      cambios.push(`Rol actualizado a: ${nuevoRol}`);
    }

    if (this.estadoPrevio && Number(this.alumnoSeleccionado.id_estado_matricula) !== Number(this.estadoPrevio.id_estado_matricula)) {
      const estObj = this.estadosMatricula.find(e => Number(e.id_estado_matricula) === Number(this.alumnoSeleccionado.id_estado_matricula));
      const nombreEst = estObj?.nombre_estado || estObj?.descripcion || `Estado ID ${this.alumnoSeleccionado.id_estado_matricula}`;
      
      let detalleCambio = `Estado modificado a: ${nombreEst}`;
      if (this.esEstadoSuspendida(this.alumnoSeleccionado.id_estado_matricula) && this.justificacionEstado.trim()) {
        detalleCambio += ` (Motivo: ${this.justificacionEstado.trim()})`;
      }
      cambios.push(detalleCambio);
    } else if (this.esEstadoSuspendida(this.alumnoSeleccionado.id_estado_matricula) && this.justificacionEstado.trim() && this.justificacionEstado.trim() !== (this.estadoPrevio?.observacion || '')) {
      cambios.push(`Motivo de suspensión: ${this.justificacionEstado.trim()}`);
    }

    if (this.estadoPrevio && this.alumnoSeleccionado.direccion !== this.estadoPrevio.direccion) {
      cambios.push(`Dirección actualizada a: "${this.alumnoSeleccionado.direccion}"`);
    }
    if (this.estadoPrevio && String(this.alumnoSeleccionado.telefono) !== String(this.estadoPrevio.telefono)) {
      cambios.push(`Teléfono actualizado a: ${this.alumnoSeleccionado.telefono}`);
    }

    if (this.estadoPrevio && Number(this.alumnoSeleccionado.id_carrera) !== Number(this.estadoPrevio.id_carrera)) {
      const car = this.carreras.find(c => Number(c.id_carrera) === Number(this.alumnoSeleccionado.id_carrera));
      const nombreCarrera = car?.descripcion || car?.nombre_carrera || 'Nueva carrera';
      cambios.push(`Cambio de carrera a: ${nombreCarrera}`);
    }

    if (this.alumnoSeleccionado.historial_academico_resumen?.trim()) {
      cambios.push(this.alumnoSeleccionado.historial_academico_resumen.trim());
    }

    if (cambios.length > 0) {
      const resumenHistorialFinal = cambios.join(' | ');
      const payloadHistorial: HistorialPayload = {
        rut_usuario: rut,
        descripcion: resumenHistorialFinal,
        id_escuela: this.alumnoSeleccionado.id_escuela ? Number(this.alumnoSeleccionado.id_escuela) : undefined
      };

      try {
        await firstValueFrom(this.alumnoService.addHistorial(payloadHistorial));
      } catch (errHistorial: any) {
        console.error('No se pudo guardar el hito de historial:', errHistorial?.error || errHistorial);
      }
    }

    try {
      const {
        carrera, sede, comuna, estado_matricula, validacion_usuario,
        historial_academico, participacion_activa, puntaje_total,
        jornada, tipo_carrera, periodo_academico, id_jornada_carrera, id_tipo_carrera,
        descripcion, historial_academico_resumen, actividades_a_cargo, actividades_cargo_count,
        ...datosLimpios
      } = this.alumnoSeleccionado;

      const datosTexto = {
        ...datosLimpios,
        id_tipo_usuario: Number(this.alumnoSeleccionado.id_tipo_usuario || 1),
        telefono: this.alumnoSeleccionado.telefono ? Number(this.alumnoSeleccionado.telefono) : null,
        id_sede: Number(this.alumnoSeleccionado.id_sede),
        id_comuna: Number(this.alumnoSeleccionado.id_comuna),
        id_estado_matricula: Number(this.alumnoSeleccionado.id_estado_matricula),
        id_carrera: this.alumnoSeleccionado.id_carrera ? Number(this.alumnoSeleccionado.id_carrera) : null,
        id_escuela: this.alumnoSeleccionado.id_escuela ? Number(this.alumnoSeleccionado.id_escuela) : null,
        id_requisito: this.alumnoSeleccionado.id_requisito ? Number(this.alumnoSeleccionado.id_requisito) : null,
        puntaje_total: Number(this.alumnoSeleccionado.puntaje_total || 0),
        actividades_inscritas: Number(this.alumnoSeleccionado.actividades_inscritas || 0),
        matriculado: Boolean(this.alumnoSeleccionado.matriculado),
        suspension: Boolean(this.alumnoSeleccionado.suspension),
        sumario: Boolean(this.alumnoSeleccionado.sumario),
        cumple: Boolean(this.alumnoSeleccionado.cumple),
        observacion: this.justificacionEstado.trim() ? this.justificacionEstado.trim() : null
      };

      await firstValueFrom(this.alumnoService.editAlumno(rut, datosTexto, this.archivoSeleccionado || undefined));

      this.mostrarToast('Alumno actualizado correctamente', 'success');
      this.obtenerAlumnos();
      this.modalEditar1.dismiss();
      this.limpiarImagenes();
      this.justificacionEstado = '';

    } catch (err: any) {
      console.error('Error al actualizar datos del alumno:', err?.error || err);
      const msg = err?.error?.error || err?.error?.message || 'Error al guardar los cambios del alumno';
      this.mostrarToast(msg, 'danger');
    }
  }

  eliminarHistorial(idHistorial: number) {
    this.alumnoService.deleteHistorial(idHistorial).subscribe({
      next: () => {
        this.mostrarToast('Hito eliminado del historial', 'success');
        if (this.alumnoSeleccionado?.rut_usuario) {
          this.cargarHistorial(this.alumnoSeleccionado.rut_usuario);
        }
      },
      error: (err) => {
        console.error('Error al eliminar hito:', err);
        this.mostrarToast('Error al eliminar registro de historial', 'danger');
      }
    });
  }

  limpiarImagenes() {
    this.archivoSeleccionado = null;
    this.imagenPreview = null;
  }

  resetForm() {
    this.nuevoAlumno = { 
      rut_usuario: '', 
      nombre_completo: '', 
      genero: '', 
      correo: '',
      id_carrera: null,
      id_escuela: null,
      id_sede: 1,
      id_comuna: 1, 
      id_periodo_academico: 1, 
      id_estado_matricula: 1,
      id_tipo_usuario: 1, 
      id_jornada_carrera: null,
      id_tipo_carrera: null,
      direccion: '', 
      telefono: null, 
      fecha_nacimiento: '',
      id_requisito: null,
      puntaje_total: 0,
      actividades_inscritas: 0,
      historial_academico_resumen: '',
      matriculado: true,
      suspension: false,
      sumario: false,
      observacion: ''
    };
    this.historialAlumno = [];
    this.estadoPrevio = null;
    this.justificacionEstado = '';
    this.limpiarImagenes();
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}