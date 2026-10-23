import { Component, OnInit, ViewChild } from '@angular/core';
import { AlumnoService, HistorialPayload } from 'src/app/services/alumno'; 
import { ActividadService } from 'src/app/services/actividad';
import { AlertController, ToastController, IonModal, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-alumnos',
  templateUrl: './admin-alumnos.page.html',
  styleUrls: ['./admin-alumnos.page.scss'],
  standalone: false
})
export class AdminAlumnosPage implements OnInit, ViewWillEnter {
  @ViewChild('modalEditar1') modalEditar1!: IonModal;
  @ViewChild('modalAgregar') modalAgregar!: IonModal;

  alumnos: any[] = []; 
  alumnosFiltrados: any[] = [];

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

  archivoSeleccionado: File | null = null;
  imagenPreview: string | null = null;
  eliminarFotoFlag: boolean = false;
  textoBuscar: string = '';

  errores = {
    rut: '',
    correo: '',
    telefono: '',
    fecha_nacimiento: ''
  };

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
    telefono: '', 
    fecha_nacimiento: '',
    id_requisito: null,
    puntaje_total: 0,
    actividades_inscritas: 0,
    historial_academico_resumen: '',
    matriculado: true,
    suspension: false,
    sumario: false,
    observacion: '',
    img_usr: ''
  };

  constructor(
    private alumnoService: AlumnoService, 
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.obtenerAlumnos(); 
    this.obtenerCatalogos();
  }

  // ==========================================
  // MÉTODOS DE MANEJO DE IMÁGENES
  // ==========================================

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;
      this.eliminarFotoFlag = false;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  quitarImagen(modo: 'nuevo' | 'editar' = 'editar') {
    this.archivoSeleccionado = null;
    this.imagenPreview = null;

    if (modo === 'nuevo') {
      this.nuevoAlumno.img_usr = null;
      this.nuevoAlumno.imagen = null;
    } else if (this.alumnoSeleccionado) {
      this.alumnoSeleccionado.img_usr = null;
      this.alumnoSeleccionado.imagen = null;
      this.eliminarFotoFlag = true;
    }

    this.mostrarToast('Fotografía eliminada', 'warning');
  }

  limpiarImagenes() {
    this.archivoSeleccionado = null;
    this.imagenPreview = null;
    this.eliminarFotoFlag = false;
  }

  // ==========================================
  // MÉTODOS DE VALIDACIÓN Y FORMATEO
  // ==========================================

  private formatearRutChile(rut: string): string {
    if (!rut) return '';
    const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length === 0) return '';
    if (limpio.length === 1) return limpio;

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const cuerpoFormateado = Number(cuerpo).toLocaleString('es-CL');

    return `${cuerpoFormateado}-${dv}`;
  }

  onRutInput(event: any, modo: 'nuevo' | 'editar' = 'nuevo') {
    let valorOriginal = event.target.value || '';
    const limpio = valorOriginal.replace(/[^0-9kK]/g, '').toUpperCase();
    
    const acotado = limpio.length > 9 ? limpio.slice(0, 9) : limpio;
    const rutFormateado = this.formatearRutChile(acotado);

    if (modo === 'nuevo') {
      this.nuevoAlumno.rut_usuario = rutFormateado;
    } else if (this.alumnoSeleccionado) {
      this.alumnoSeleccionado.rut_usuario = rutFormateado;
    }

    if (event.target) {
      event.target.value = rutFormateado;
    }

    if (acotado.length >= 8) {
      if (!this.validarRutChileno(rutFormateado)) {
        this.errores.rut = 'El RUT o dígito verificador no es válido (Módulo 11)';
      } else {
        this.errores.rut = '';
      }
    } else if (acotado.length > 0) {
      this.errores.rut = 'RUT incompleto (debe tener al menos 8 caracteres)';
    } else {
      this.errores.rut = '';
    }
  }

  private validarRutChileno(rut: string): boolean {
    if (!rut) return false;
    const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    
    if (limpio.length < 8 || limpio.length > 9) return false;

    const cuerpo = limpio.slice(0, -1);
    const dvIngresado = limpio.slice(-1);

    if (/^(\d)\1+$/.test(cuerpo)) {
      return false;
    }

    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += Number(cuerpo.charAt(i)) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const dvesperadoNum = 11 - (suma % 11);
    let dvEsperado = '';

    if (dvesperadoNum === 11) dvEsperado = '0';
    else if (dvesperadoNum === 10) dvEsperado = 'K';
    else dvEsperado = String(dvesperadoNum);

    return dvIngresado === dvEsperado;
  }

  onTelefonoInput(event: any, modo: 'nuevo' | 'editar' = 'nuevo') {
    let valor = String(event.target.value || '').replace(/\D/g, '');

    if (!valor) {
      this.errores.telefono = '';
      if (modo === 'nuevo') this.nuevoAlumno.telefono = '';
      else if (this.alumnoSeleccionado) this.alumnoSeleccionado.telefono = '';
      return;
    }

    if (!valor.startsWith('9')) {
      valor = '9' + valor;
    }

    if (valor.length > 9) {
      valor = valor.slice(0, 9);
    }

    if (modo === 'nuevo') {
      this.nuevoAlumno.telefono = valor;
    } else if (this.alumnoSeleccionado) {
      this.alumnoSeleccionado.telefono = valor;
    }

    if (event.target) {
      event.target.value = valor;
    }

    if (valor.length !== 9) {
      this.errores.telefono = 'El teléfono debe tener exactamente 9 dígitos e iniciar con 9';
    } else {
      this.errores.telefono = '';
    }
  }

  private validarTelefonoChileno(telefono: any): boolean {
    if (!telefono) return false;
    const numStr = String(telefono).replace(/\D/g, '');
    return numStr.length === 9 && numStr.startsWith('9');
  }

  private validarCorreo(correo: string): boolean {
    if (!correo) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(correo.trim());
  }

  private esCorreoDuplicado(correo: string, rutActual: string = ''): boolean {
    if (!correo || !Array.isArray(this.alumnos)) return false;
    
    const correoLimpio = correo.trim().toLowerCase();
    const rutLimpio = rutActual.replace(/[^0-9kK]/g, '').toUpperCase();

    return this.alumnos.some(alu => {
      const correoExistente = String(alu.correo || alu.email || '').trim().toLowerCase();
      const rutExistente = String(alu.rut_usuario || alu.rut || '').replace(/[^0-9kK]/g, '').toUpperCase();

      if (rutLimpio && rutExistente === rutLimpio) {
        return false;
      }

      return correoExistente === correoLimpio;
    });
  }

  onCorreoBlur(modo: 'nuevo' | 'editar' = 'nuevo') {
    const target = modo === 'nuevo' ? this.nuevoAlumno : this.alumnoSeleccionado;
    if (!target || !target.correo) return;

    let correoLimpio = target.correo.trim();

    if (correoLimpio && !correoLimpio.includes('@')) {
      correoLimpio = `${correoLimpio}@gmail.com`;
      target.correo = correoLimpio;
    }

    if (!this.validarCorreo(target.correo)) {
      this.errores.correo = 'Ingrese un correo electrónico válido';
    } else if (this.esCorreoDuplicado(target.correo, target.rut_usuario || '')) {
      this.errores.correo = 'Este correo electrónico ya se encuentra registrado en el sistema';
    } else {
      this.errores.correo = '';
    }
  }

  private validarEdadMinima(fechaNacimientoStr: string, edadMinima: number = 17): boolean {
    if (!fechaNacimientoStr) return true;

    const fechaNac = new Date(fechaNacimientoStr);
    if (isNaN(fechaNac.getTime())) return false;

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }

    return edad >= edadMinima && edad <= 90;
  }

  // ==========================================
  // OPERACIONES DE ALUMNOS Y DATOS
  // ==========================================

  private extraerArreglo(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.result)) return res.result;
    if (Array.isArray(res.datos)) return res.datos;
    return [];
  }

  obtenerTipoUsuario(alu: any): number {
    const val = alu?.id_tipo_usuario ?? 
                alu?.tipo_usuario?.id_tipo_usuario ?? 
                alu?.id_rol ?? 
                alu?.rol?.id_rol ?? 
                1;
    return Number(val);
  }

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
      error: (err: any) => {
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
      error: (err: any) => {
        console.error('Error al consultar historial del backend:', err.error || err);
        this.historialAlumno = [];
      }
    });
  }

  obtenerCatalogos() {
    this.alumnoService.getCarreras().subscribe({
      next: (res: any) => { this.carreras = this.extraerArreglo(res); },
      error: (err: any) => console.error('Error cargando carreras:', err)
    });

    this.alumnoService.getEscuelas().subscribe({ 
      next: (res: any) => { this.escuelas = this.extraerArreglo(res); },
      error: (err: any) => console.error('Error cargando escuelas:', err)
    });

    this.alumnoService.getSedes().subscribe({ 
      next: (res: any) => { this.sedes = this.extraerArreglo(res); },
      error: (err: any) => console.error('Error cargando sedes:', err)
    });

    this.alumnoService.getJornadas().subscribe({ 
      next: (res: any) => { this.jornadas = this.extraerArreglo(res); },
      error: (err: any) => console.error('Error cargando jornadas:', err)
    });

    this.alumnoService.getTiposCarrera().subscribe({ 
      next: (res: any) => { this.tiposCarrera = this.extraerArreglo(res); },
      error: (err: any) => console.error('Error cargando tipos de carrera:', err)
    });

    this.alumnoService.getEstadosMatricula().subscribe({ 
      next: (res: any) => { this.estadosMatricula = this.extraerArreglo(res); },
      error: (err: any) => console.error('Error cargando estados matrícula:', err)
    });

    this.alumnoService.getPeriodosAcademicos().subscribe({ 
      next: (res: any) => { this.periodosAcademicos = this.extraerArreglo(res); },
      error: (err: any) => console.error('Error cargando periodos:', err)
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

  agregarAlumno() {
    if (!this.nuevoAlumno.rut_usuario || !this.nuevoAlumno.nombre_completo || !this.nuevoAlumno.correo) {
      this.mostrarToast('Los campos RUT, Nombre y Correo son obligatorios', 'warning');
      return;
    }

    if (this.errores.rut || !this.validarRutChileno(this.nuevoAlumno.rut_usuario)) {
      this.mostrarToast('No se puede crear el registro: El RUT o dígito verificador ingresado no es válido (Módulo 11)', 'danger');
      return;
    }

    if (!this.validarTelefonoChileno(this.nuevoAlumno.telefono)) {
      this.mostrarToast('El teléfono debe tener exactamente 9 dígitos e iniciar con 9 (ej: 912345678)', 'warning');
      return;
    }

    if (!this.validarCorreo(this.nuevoAlumno.correo)) {
      this.mostrarToast('El correo electrónico no tiene un formato válido', 'danger');
      return;
    }

    if (this.esCorreoDuplicado(this.nuevoAlumno.correo)) {
      this.errores.correo = 'Este correo ya está registrado';
      this.mostrarToast('El correo electrónico ya pertenece a otro alumno registrado', 'danger');
      return;
    }

    if (this.nuevoAlumno.fecha_nacimiento && !this.validarEdadMinima(this.nuevoAlumno.fecha_nacimiento, 17)) {
      this.mostrarToast('El alumno debe tener al menos 17 años cumplidos', 'warning');
      return;
    }

    const {
      jornada, tipo_carrera, periodo_academico, id_jornada_carrera, id_tipo_carrera, imagen, img_usr, ...datosValidos
    } = this.nuevoAlumno;

    const payload = {
      ...datosValidos,
      correo: datosValidos.correo.trim().toLowerCase(),
      fecha_nacimiento: datosValidos.fecha_nacimiento ? datosValidos.fecha_nacimiento : null,
      direccion: datosValidos.direccion ? datosValidos.direccion : null,
      telefono: Number(datosValidos.telefono),
      id_carrera: datosValidos.id_carrera ? Number(datosValidos.id_carrera) : null,
      id_escuela: datosValidos.id_escuela ? Number(datosValidos.id_escuela) : null,
      id_sede: datosValidos.id_sede ? Number(datosValidos.id_sede) : 1,
      id_comuna: datosValidos.id_comuna ? Number(datosValidos.id_comuna) : 1,
      id_estado_matricula: datosValidos.id_estado_matricula ? Number(datosValidos.id_estado_matricula) : 1,
      id_periodo_academico: datosValidos.id_periodo_academico ? Number(datosValidos.id_periodo_academico) : 1,
      id_tipo_usuario: 1,
      puntaje_total: Number(datosValidos.puntaje_total || 0),
      actividades_inscritas: Number(datosValidos.actividades_inscritas || 0),
      historial_academico_resumen: datosValidos.historial_academico_resumen || 'Registro inicial del alumno',
      img_usr: this.nuevoAlumno.img_usr || ''
    };

    this.alumnoService.addAlumno(payload, this.archivoSeleccionado || undefined).subscribe({
      next: () => {
        this.mostrarToast('Alumno registrado con éxito. Se enviaron las credenciales por correo.', 'success');
        this.modalAgregar.dismiss();
        this.resetForm();
        this.obtenerAlumnos();
      },
      error: (err: any) => {
        console.error('ERROR DETALLADO:', err.error);
        const detalle = err.error?.error || err.error?.detail || err.error?.message || '';

        if (detalle.toLowerCase().includes('correo') || detalle.toLowerCase().includes('email') || detalle.toLowerCase().includes('unique')) {
          this.errores.correo = 'Correo ya registrado en la base de datos';
          this.mostrarToast('Error al guardar: El correo electrónico ya está registrado en el sistema.', 'danger');
        } else {
          this.mostrarToast(`Error al guardar: ${detalle || 'Error al procesar la solicitud'}`, 'danger');
        }
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
              error: (err: any) => {
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

    let telStr = String(alumno.telefono || '').replace(/\D/g, '');
    if (telStr && !telStr.startsWith('9')) {
      telStr = '9' + telStr;
    }

    this.alumnoSeleccionado = {
      ...alumno,
      telefono: telStr,
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
      historial_academico_resumen: '',
      img_usr: alumno.img_usr || alumno.imagen || ''
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

    const rut = String(this.alumnoSeleccionado.rut_usuario).replace(/\./g, '').trim();

    if (this.errores.rut || !this.validarRutChileno(rut)) {
      this.mostrarToast('No se puede actualizar: El RUT ingresado no es válido (Módulo 11)', 'danger');
      return;
    }

    if (!this.validarCorreo(this.alumnoSeleccionado.correo)) {
      this.mostrarToast('El correo electrónico ingresado no es válido', 'danger');
      return;
    }

    if (this.esCorreoDuplicado(this.alumnoSeleccionado.correo, rut)) {
      this.errores.correo = 'Este correo ya pertenece a otro usuario';
      this.mostrarToast('No se puede actualizar: El correo electrónico pertenece a otro alumno', 'danger');
      return;
    }

    if (!this.validarTelefonoChileno(this.alumnoSeleccionado.telefono)) {
      this.mostrarToast('El teléfono debe tener 9 dígitos e iniciar con 9', 'warning');
      return;
    }

    if (this.alumnoSeleccionado.fecha_nacimiento && !this.validarEdadMinima(this.alumnoSeleccionado.fecha_nacimiento, 17)) {
      this.mostrarToast('El alumno debe tener al menos 17 años cumplidos', 'warning');
      return;
    }

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
        imagen, img_usr, ...datosLimpios
      } = this.alumnoSeleccionado;

      const valorImagenFinal = this.eliminarFotoFlag 
        ? null 
        : (this.alumnoSeleccionado.imagen || this.alumnoSeleccionado.img_usr || null);

      const datosTexto = {
        ...datosLimpios,
        correo: this.alumnoSeleccionado.correo.trim().toLowerCase(),
        imagen: valorImagenFinal,
        id_tipo_usuario: Number(this.alumnoSeleccionado.id_tipo_usuario || 1),
        telefono: Number(this.alumnoSeleccionado.telefono),
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
      const detalle = err?.error?.error || err?.error?.detail || err?.error?.message || '';

      if (detalle.toLowerCase().includes('correo') || detalle.toLowerCase().includes('email') || detalle.toLowerCase().includes('unique')) {
        this.errores.correo = 'Correo ya registrado en el sistema';
        this.mostrarToast('No se puede actualizar: El correo pertenece a otro usuario registrado', 'danger');
      } else {
        this.mostrarToast(detalle || 'Error al guardar los cambios del alumno', 'danger');
      }
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
      error: (err: any) => {
        console.error('Error al eliminar hito:', err);
        this.mostrarToast('Error al eliminar registro de historial', 'danger');
      }
    });
  }

  limpiarErrores() {
    this.errores = { rut: '', correo: '', telefono: '', fecha_nacimiento: '' };
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
      telefono: '', 
      fecha_nacimiento: '',
      id_requisito: null,
      puntaje_total: 0,
      actividades_inscritas: 0,
      historial_academico_resumen: '',
      matriculado: true,
      suspension: false,
      sumario: false,
      observacion: '',
      img_usr: ''
    };
    this.historialAlumno = [];
    this.estadoPrevio = null;
    this.justificacionEstado = '';
    this.limpiarErrores();
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