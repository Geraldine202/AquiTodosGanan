import { Component, OnInit, ViewChild } from '@angular/core';
import { AlumnoService } from 'src/app/services/alumno';
import { AlertController, ToastController, IonModal, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-docentes',
  templateUrl: './docentes.page.html',
  styleUrls: ['./docentes.page.scss'],
  standalone: false
})
export class DocentesPage implements OnInit, ViewWillEnter {
  @ViewChild('modalAgregar') modalAgregar!: IonModal;
  @ViewChild('modalEditar') modalEditar!: IonModal;

  docentes: any[] = [];
  docentesFiltrados: any[] = [];
  sedes: any[] = [];

  nuevoDocente = {
    nombre_completo: '',
    rut_usuario: '',
    genero: 'Masculino',
    correo: '',
    telefono: '',
    fecha_nacimiento: '',
    direccion: 'Sin especificar',
    id_sede: null,
    id_tipo_usuario: 3
  };

  // Mensajes de error específicos para feedback visual
  errores = {
    nombre: '',
    rut: '',
    correo: '',
    telefono: '',
    fecha_nacimiento: ''
  };

  archivoSeleccionado: File | null = null;
  imagenPreview: string | null = null;

  docenteSeleccionado: any = null;
  textoBuscar: string = '';
  cargando: boolean = false;

  constructor(
    private alumnoService: AlumnoService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.obtenerDocentes();
    this.obtenerCatalogos();
  }

  // ==========================================
  // VALIDACIONES Y MENSAJES DE ERROR EN VIVO
  // ==========================================

  /**
   * Valida que el nombre contenga solo letras y espacios
   */
  onNombreInput(event: any, modo: 'nuevo' | 'editar') {
    const valorOriginal = event.target.value || '';
    const soloTexto = valorOriginal.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');

    if (valorOriginal !== soloTexto) {
      this.errores.nombre = 'Solo se permiten letras y espacios en el nombre';
    } else {
      this.errores.nombre = '';
    }

    if (modo === 'nuevo') {
      this.nuevoDocente.nombre_completo = soloTexto;
    } else if (this.docenteSeleccionado) {
      this.docenteSeleccionado.nombre_completo = soloTexto;
    }
  }

  /**
   * Formatea el RUT en vivo con puntos y guion (XX.XXX.XXX-X)
   */
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

  /**
   * Evento input para formatear RUT y limitar extensión
   */
  onRutInput(event: any, modo: 'nuevo' | 'editar') {
    let valorOriginal = event.target.value || '';
    const limpio = valorOriginal.replace(/[^0-9kK]/g, '').toUpperCase();
    
    const acotado = limpio.length > 9 ? limpio.slice(0, 9) : limpio;
    const rutFormateado = this.formatearRutChile(acotado);

    if (modo === 'nuevo') {
      this.nuevoDocente.rut_usuario = rutFormateado;
    } else if (this.docenteSeleccionado) {
      this.docenteSeleccionado.rut_usuario = rutFormateado;
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

  /**
   * Algoritmo Módulo 11 para RUT
   */
  private validarRutChileno(rut: string): boolean {
    if (!rut) return false;
    const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (limpio.length < 8) return false;

    const cuerpo = limpio.slice(0, -1);
    const dvIngresado = limpio.slice(-1);

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

  /**
   * Formatea teléfono chileno (9 dígitos iniciando con 9)
   */
  onTelefonoInput(event: any, modo: 'nuevo' | 'editar') {
    let valor = String(event.target.value || '').replace(/\D/g, '');
    if (!valor) {
      this.errores.telefono = '';
      return;
    }

    if (valor.length === 8 && !valor.startsWith('9')) {
      valor = '9' + valor;
    }

    if (valor.length > 9) {
      valor = valor.slice(0, 9);
    }

    if (modo === 'nuevo') {
      this.nuevoDocente.telefono = valor;
    } else if (this.docenteSeleccionado) {
      this.docenteSeleccionado.telefono = valor;
    }

    if (valor.length !== 9 || !valor.startsWith('9')) {
      this.errores.telefono = 'El teléfono debe tener exactamente 9 dígitos e iniciar con 9';
    } else {
      this.errores.telefono = '';
    }
  }

  /**
   * Autocompleta @gmail.com si no se especificó un dominio
   */
  onCorreoBlur(modo: 'nuevo' | 'editar') {
    const target = modo === 'nuevo' ? this.nuevoDocente : this.docenteSeleccionado;
    if (!target || !target.correo) {
      this.errores.correo = '';
      return;
    }

    let correoLimpio = target.correo.trim();
    if (correoLimpio && !correoLimpio.includes('@')) {
      target.correo = `${correoLimpio}@gmail.com`;
    }

    if (!this.validarCorreo(target.correo)) {
      this.errores.correo = 'Ingrese un correo electrónico válido (ej: usuario@gmail.com)';
    } else {
      this.errores.correo = '';
    }
  }

  private validarCorreo(correo: string): boolean {
    if (!correo) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(correo.trim());
  }

  /**
   * Valida la edad mínima para docentes (18 años)
   */
  onFechaNacimientoChange(event: any) {
    const fechaStr = event.target.value;
    if (!fechaStr) {
      this.errores.fecha_nacimiento = '';
      return;
    }

    if (!this.validarMayorEdad(fechaStr)) {
      this.errores.fecha_nacimiento = 'El docente debe ser mayor de edad (al menos 18 años cumplidos)';
    } else {
      this.errores.fecha_nacimiento = '';
    }
  }

  private validarMayorEdad(fechaNacimientoStr: string): boolean {
    if (!fechaNacimientoStr) return true;

    const fechaNac = new Date(fechaNacimientoStr);
    if (isNaN(fechaNac.getTime())) return false;

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }

    return edad >= 18 && edad <= 85;
  }

  // ==========================================
  // OPERACIONES DE GUARDADO Y EDICIÓN
  // ==========================================

  extraerArreglo(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.result)) return res.result;
    return [];
  }

  obtenerCatalogos() {
    this.alumnoService.getSedes().subscribe({
      next: (res: any) => { this.sedes = this.extraerArreglo(res); },
      error: (err) => console.error('Error al cargar sedes:', err)
    });
  }

  obtenerDocentes() {
    this.cargando = true;
    this.alumnoService.getDocentes().subscribe({
      next: (res: any) => {
        this.docentes = this.extraerArreglo(res);
        this.filtrarDocentes();
        this.cargando = false;
      },
      error: (err: any) => {
        console.error('Error al cargar docentes:', err);
        this.mostrarToast('Error al obtener la lista de docentes', 'danger');
        this.cargando = false;
      }
    });
  }

  filtrarDocentes() {
    const texto = (this.textoBuscar || '').trim().toLowerCase();

    if (!texto) {
      this.docentesFiltrados = [...this.docentes];
      return;
    }

    this.docentesFiltrados = this.docentes.filter(doc => {
      const nombre = (doc.nombre_completo || '').toLowerCase();
      const rut = (doc.rut_usuario || '').toLowerCase();
      const correo = (doc.correo || '').toLowerCase();

      return nombre.includes(texto) || rut.includes(texto) || correo.includes(texto);
    });
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

  agregarDocente() {
    const { nombre_completo, rut_usuario, genero, correo, telefono, fecha_nacimiento, direccion, id_sede } = this.nuevoDocente;

    // Validaciones estrictas con mensajes descriptivos
    if (!nombre_completo || !rut_usuario || !correo || !id_sede) {
      this.mostrarToast('Los campos Nombre, RUT, Correo y Sede son obligatorios', 'warning');
      return;
    }

    if (!this.validarRutChileno(rut_usuario)) {
      this.mostrarToast('El RUT ingresado no es válido. Solo se permiten RUTs chilenos reales.', 'danger');
      return;
    }

    if (!this.validarCorreo(correo)) {
      this.mostrarToast('El correo no tiene un formato válido (debe incluir @)', 'danger');
      return;
    }

    if (telefono && (telefono.length !== 9 || !telefono.startsWith('9'))) {
      this.mostrarToast('El teléfono debe tener exactamente 9 dígitos e iniciar con 9', 'warning');
      return;
    }

    if (fecha_nacimiento && !this.validarMayorEdad(fecha_nacimiento)) {
      this.mostrarToast('El docente debe ser mayor de edad (mínimo 18 años)', 'danger');
      return;
    }

    const payload: any = {
      nombre_completo,
      rut_usuario,
      genero: genero || 'Masculino',
      correo,
      telefono: telefono || 'Sin especificar',
      fecha_nacimiento: fecha_nacimiento || null,
      direccion: direccion || 'Sin especificar',
      id_sede: Number(id_sede),
      id_tipo_usuario: 3
    };

    this.alumnoService.addDocente(payload, this.archivoSeleccionado || undefined).subscribe({
      next: () => {
        this.mostrarToast('Docente registrado con éxito. Credenciales enviadas por correo.', 'success');
        this.modalAgregar.dismiss();
        this.resetForm();
        this.obtenerDocentes();
      },
      error: (err) => {
        console.error('Error al registrar docente:', err);
        const detalle = err.error?.error || err.error?.message || 'Error al procesar la solicitud';
        this.mostrarToast(`Error: ${detalle}`, 'danger');
      }
    });
  }

  prepararEdicion(docente: any) {
    this.docenteSeleccionado = {
      ...docente,
      id_sede: docente.id_sede || docente.sede?.id_sede
    };
    this.limpiarErrores();
    this.modalEditar.present();
  }

  async actualizarDocente() {
    if (!this.docenteSeleccionado) return;

    const rut = this.docenteSeleccionado.rut_usuario;

    if (!this.validarCorreo(this.docenteSeleccionado.correo)) {
      this.mostrarToast('El correo electrónico ingresado no es válido', 'danger');
      return;
    }

    if (this.docenteSeleccionado.telefono && (this.docenteSeleccionado.telefono.length !== 9 || !this.docenteSeleccionado.telefono.startsWith('9'))) {
      this.mostrarToast('El teléfono debe contener 9 dígitos e iniciar con 9', 'warning');
      return;
    }

    const payload = {
      nombre_completo: this.docenteSeleccionado.nombre_completo,
      correo: this.docenteSeleccionado.correo,
      genero: this.docenteSeleccionado.genero,
      telefono: this.docenteSeleccionado.telefono,
      id_sede: Number(this.docenteSeleccionado.id_sede)
    };

    try {
      await firstValueFrom(this.alumnoService.editDocente(rut, payload));
      this.mostrarToast('Datos del docente actualizados correctamente', 'success');
      this.modalEditar.dismiss();
      this.obtenerDocentes();
    } catch (err: any) {
      console.error('Error al actualizar docente:', err);
      const msg = err?.error?.error || 'Error al actualizar el docente';
      this.mostrarToast(msg, 'danger');
    }
  }

  async cambiarEstadoDocente(docente: any, nuevoEstado: number) {
    const esDeshabilitar = nuevoEstado === 3;
    const accionTexto = esDeshabilitar ? 'deshabilitar (marcar como retirado)' : 'habilitar';

    const alert = await this.alertController.create({
      header: `Confirmar acción`,
      message: `¿Está seguro de que desea ${accionTexto} al docente ${docente.nombre_completo}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: esDeshabilitar ? 'Deshabilitar' : 'Habilitar',
          role: esDeshabilitar ? 'destructive' : 'confirm',
          handler: () => {
            this.alumnoService.cambiarEstadoDocente(docente.rut_usuario, nuevoEstado).subscribe({
              next: () => {
                this.mostrarToast(`Docente ${esDeshabilitar ? 'deshabilitado' : 'habilitado'} correctamente`, 'success');
                this.obtenerDocentes();
              },
              error: (err) => {
                console.error(`Error al cambiar estado:`, err);
                this.mostrarToast(`Error al cambiar el estado del docente`, 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  limpiarErrores() {
    this.errores = { nombre: '', rut: '', correo: '', telefono: '', fecha_nacimiento: '' };
  }

  resetForm() {
    this.nuevoDocente = {
      nombre_completo: '',
      rut_usuario: '',
      genero: 'Masculino',
      correo: '',
      telefono: '',
      fecha_nacimiento: '',
      direccion: 'Sin especificar',
      id_sede: null,
      id_tipo_usuario: 3
    };
    this.limpiarErrores();
    this.archivoSeleccionado = null;
    this.imagenPreview = null;
    this.docenteSeleccionado = null;
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}