import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  @ViewChild('fileInputAdd') fileInputAdd!: ElementRef<HTMLInputElement>;

  docentes: any[] = [];
  docentesFiltrados: any[] = [];
  sedes: any[] = [];

  nuevoDocente = {
    nombre_completo: '',
    rut_usuario: '',
    genero: '',
    correo: '',
    telefono: '',
    fecha_nacimiento: '',
    direccion: '',
    id_sede: null,
    id_tipo_usuario: 3
  };

  errores = {
    nombre: '',
    rut: '',
    correo: '',
    telefono: '',
    fecha_nacimiento: ''
  };

  // Solo se requiere para el registro
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

  private limpiarRutPuro(rut: any): string {
    if (!rut) return '';
    return String(rut).replace(/[^0-9kK]/g, '').trim().toUpperCase();
  }

  // ==========================================
  // VALIDACIONES Y CONTROL DE ENTRADA
  // ==========================================

  onNombreInput(event: any, modo: 'nuevo' | 'editar') {
    const valorOriginal = event.target.value || '';
    const soloTexto = valorOriginal.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');

    if (valorOriginal !== soloTexto) {
      this.errores.nombre = 'Solo se permiten letras y espacios en el nombre';
    } else if (soloTexto.trim().length < 3 && soloTexto.trim().length > 0) {
      this.errores.nombre = 'El nombre debe contener al menos 3 caracteres';
    } else {
      this.errores.nombre = '';
    }

    if (modo === 'nuevo') {
      this.nuevoDocente.nombre_completo = soloTexto;
    } else if (this.docenteSeleccionado) {
      this.docenteSeleccionado.nombre_completo = soloTexto;
    }
  }

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

    if (event.target) {
      event.target.value = rutFormateado;
    }

    if (acotado.length >= 8) {
      if (!this.validarRutChileno(acotado)) {
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
   * Validador estricto de RUT Chileno (Módulo 11)
   */
  private validarRutChileno(rutLimpio: string): boolean {
    if (!rutLimpio) return false;
    const limpio = rutLimpio.replace(/[^0-9kK]/g, '').toUpperCase();
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

  private esRutDuplicado(rutInput: string, rutActual: string = ''): boolean {
    if (!rutInput || !Array.isArray(this.docentes)) return false;
    
    const rutLimpioNuevo = this.limpiarRutPuro(rutInput);
    const rutLimpioActual = this.limpiarRutPuro(rutActual);

    return this.docentes.some(doc => {
      const rutExistente = this.limpiarRutPuro(doc.rut_usuario || doc.rut);
      if (rutLimpioActual && rutExistente === rutLimpioActual) {
        return false;
      }
      return rutExistente === rutLimpioNuevo;
    });
  }

  onTelefonoInput(event: any, modo: 'nuevo' | 'editar') {
    let valor = String(event.target.value || '').replace(/\D/g, '');
    
    if (!valor) {
      this.errores.telefono = '';
      if (modo === 'nuevo') this.nuevoDocente.telefono = '';
      else if (this.docenteSeleccionado) this.docenteSeleccionado.telefono = '';
      return;
    }

    if (!valor.startsWith('9')) {
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

    if (event.target) {
      event.target.value = valor;
    }

    if (valor.length !== 9) {
      this.errores.telefono = 'El teléfono debe tener exactamente 9 dígitos';
    } else {
      this.errores.telefono = '';
    }
  }

  onCorreoBlur(modo: 'nuevo' | 'editar') {
    const target = modo === 'nuevo' ? this.nuevoDocente : this.docenteSeleccionado;
    if (!target || !target.correo) {
      this.errores.correo = '';
      return;
    }

    let correoLimpio = target.correo.trim();
    if (correoLimpio && !correoLimpio.includes('@')) {
      correoLimpio = `${correoLimpio}@gmail.com`;
      target.correo = correoLimpio;
    }

    if (!this.validarCorreo(target.correo)) {
      this.errores.correo = 'Ingrese un correo electrónico válido (ej: usuario@gmail.com)';
    } else if (this.esCorreoDuplicado(target.correo, target.rut_usuario || '')) {
      this.errores.correo = 'Este correo electrónico ya se encuentra registrado en el sistema';
    } else {
      this.errores.correo = '';
    }
  }

  private validarCorreo(correo: string): boolean {
    if (!correo) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(correo.trim());
  }

  private esCorreoDuplicado(correo: string, rutActual: string = ''): boolean {
    if (!correo || !Array.isArray(this.docentes)) return false;
    
    const correoLimpio = correo.trim().toLowerCase();
    const rutLimpio = this.limpiarRutPuro(rutActual);

    return this.docentes.some(doc => {
      const correoExistente = String(doc.correo || doc.email || '').trim().toLowerCase();
      const rutExistente = this.limpiarRutPuro(doc.rut_usuario || doc.rut);

      if (rutLimpio && rutExistente === rutLimpio) {
        return false;
      }

      return correoExistente === correoLimpio;
    });
  }

  onFechaNacimientoChange(event: any) {
    const fechaStr = event.target.value;
    if (!fechaStr) {
      this.errores.fecha_nacimiento = '';
      return;
    }

    if (!this.validarMayorEdad(fechaStr)) {
      this.errores.fecha_nacimiento = 'El docente debe ser mayor de edad (mínimo 18 años)';
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
  // SELECCIÓN Y ELIMINACIÓN DE IMAGEN (SOLO AL AGREGAR)
  // ==========================================

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

  quitarImagenAgregar() {
    this.archivoSeleccionado = null;
    this.imagenPreview = null;
    if (this.fileInputAdd) {
      this.fileInputAdd.nativeElement.value = '';
    }
  }

  // ==========================================
  // OPERACIONES Y GUARDADO
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
      error: (err: any) => console.error('Error al cargar sedes:', err)
    });
  }

  obtenerDocentes() {
    this.cargando = true;
    this.alumnoService.getDocentes().subscribe({
      next: (res: any) => {
        const listaOriginal = this.extraerArreglo(res);

        const primerElem = listaOriginal[0] || {};
        const tieneIdOFecha = Boolean(
          primerElem.id_docente || 
          primerElem.id_usuario || 
          primerElem.id_persona || 
          primerElem.id || 
          primerElem.created_at || 
          primerElem.fecha_registro
        );

        if (tieneIdOFecha) {
          this.docentes = [...listaOriginal].sort((a: any, b: any) => {
            const fechaA = new Date(a.created_at || a.fecha_registro || 0).getTime();
            const fechaB = new Date(b.created_at || b.fecha_registro || 0).getTime();

            if (fechaA !== fechaB) {
              return fechaB - fechaA;
            }

            const idA = Number(a.id_docente ?? a.id_usuario ?? a.id_persona ?? a.id ?? 0);
            const idB = Number(b.id_docente ?? b.id_usuario ?? b.id_persona ?? b.id ?? 0);

            return idB - idA;
          });
        } else {
          this.docentes = [...listaOriginal].reverse();
        }

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

  agregarDocente() {
    const { nombre_completo, rut_usuario, genero, correo, telefono, fecha_nacimiento, direccion, id_sede } = this.nuevoDocente;

    if (!nombre_completo.trim() || !rut_usuario.trim() || !correo.trim() || !genero || !id_sede) {
      this.mostrarToast('Los campos Nombre, RUT, Correo, Género y Sede son obligatorios', 'warning');
      return;
    }

    if (nombre_completo.trim().length < 3) {
      this.mostrarToast('El nombre debe contener al menos 3 caracteres', 'warning');
      return;
    }

    if (this.errores.rut || !this.validarRutChileno(rut_usuario)) {
      this.mostrarToast('El RUT ingresado no es válido. Verifique número y dígito verificador.', 'danger');
      return;
    }

    if (this.esRutDuplicado(rut_usuario)) {
      this.errores.rut = 'Este RUT ya se encuentra registrado';
      this.mostrarToast('Error al guardar: El RUT ya está registrado en la base de datos.', 'danger');
      return;
    }

    if (!this.validarCorreo(correo)) {
      this.mostrarToast('El correo no tiene un formato válido (ej: usuario@gmail.com)', 'danger');
      return;
    }

    if (this.esCorreoDuplicado(correo)) {
      this.errores.correo = 'Este correo ya está registrado';
      this.mostrarToast('El correo electrónico ya pertenece a otro docente registrado', 'danger');
      return;
    }

    let telSanear = String(telefono || '').replace(/\D/g, '');
    if (telSanear) {
      if (!telSanear.startsWith('9')) telSanear = '9' + telSanear;
      if (telSanear.length !== 9) {
        this.mostrarToast('El teléfono debe tener exactamente 9 dígitos e iniciar con 9', 'warning');
        return;
      }
    }

    if (fecha_nacimiento && !this.validarMayorEdad(fecha_nacimiento)) {
      this.mostrarToast('El docente debe ser mayor de edad (mínimo 18 años)', 'danger');
      return;
    }

    const payload: any = {
      nombre_completo: nombre_completo.trim(),
      rut_usuario: rut_usuario.trim(),
      genero: genero,
      correo: correo.trim().toLowerCase(),
      telefono: telSanear || '',
      fecha_nacimiento: fecha_nacimiento || null,
      direccion: direccion ? direccion.trim() : '',
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
      error: (err: any) => {
        console.error('Error al registrar docente:', err);
        const detalle = err.error?.error || err.error?.detail || err.error?.message || err.message || '';
        const msgLower = detalle.toLowerCase();

        if (msgLower.includes('rut') || msgLower.includes('rut_usuario') || msgLower.includes('pk_usuario')) {
          this.errores.rut = 'Este RUT ya se encuentra registrado';
          this.mostrarToast('Error al guardar: El RUT ya está registrado en la base de datos.', 'danger');
        } else if (msgLower.includes('correo') || msgLower.includes('email')) {
          this.errores.correo = 'Este correo ya se encuentra registrado';
          this.mostrarToast('Error al guardar: El correo electrónico ya está registrado en el sistema.', 'danger');
        } else {
          this.mostrarToast(`Error al guardar: ${detalle || 'Error al procesar la solicitud'}`, 'danger');
        }
      }
    });
  }

  prepararEdicion(docente: any) {
    let telString = String(docente.telefono || '').replace(/\D/g, '');
    
    if (telString && !telString.startsWith('9')) {
      telString = '9' + telString;
    }

    const dirLimpia = (docente.direccion && docente.direccion !== 'Sin especificar') ? docente.direccion : '';

    this.docenteSeleccionado = {
      ...docente,
      id_sede: docente.id_sede || docente.sede?.id_sede,
      genero: docente.genero || '',
      telefono: telString,
      direccion: dirLimpia
    };

    this.limpiarErrores();
    this.modalEditar.present();
  }

  async actualizarDocente() {
    if (!this.docenteSeleccionado) return;

    const { nombre_completo, correo, genero, telefono, direccion, id_sede, rut_usuario } = this.docenteSeleccionado;
    const rutPure = this.limpiarRutPuro(rut_usuario);

    if (!nombre_completo || !nombre_completo.trim()) {
      this.mostrarToast('El campo Nombre Completo no puede quedar vacío', 'warning');
      return;
    }

    if (nombre_completo.trim().length < 3) {
      this.mostrarToast('El nombre debe contener al menos 3 caracteres', 'warning');
      return;
    }

    if (!this.validarCorreo(correo)) {
      this.mostrarToast('El correo electrónico no es válido', 'danger');
      return;
    }

    if (this.esCorreoDuplicado(correo, rutPure)) {
      this.errores.correo = 'Este correo ya pertenece a otro usuario';
      this.mostrarToast('No se puede actualizar: El correo pertenece a otro docente registrado', 'danger');
      return;
    }

    if (!genero) {
      this.mostrarToast('Debe seleccionar el Género del docente', 'warning');
      return;
    }

    if (!id_sede) {
      this.mostrarToast('Debe seleccionar una Sede asignada', 'warning');
      return;
    }

    let telSanear = String(telefono || '').replace(/\D/g, '');
    if (telSanear) {
      if (!telSanear.startsWith('9')) telSanear = '9' + telSanear;
      if (telSanear.length !== 9) {
        this.mostrarToast('El teléfono debe tener exactamente 9 dígitos e iniciar con 9', 'warning');
        return;
      }
    }

    const payload = {
      nombre_completo: nombre_completo.trim(),
      correo: correo ? correo.trim().toLowerCase() : '',
      genero: genero,
      telefono: telSanear || '',
      direccion: direccion ? direccion.trim() : '',
      id_sede: Number(id_sede)
    };

    try {
      const resUpdate = await firstValueFrom(this.alumnoService.editDocente(rutPure, payload));

      // Sincronizar sesión del usuario si se está editando a sí mismo
      const sesionActual = this.alumnoService.obtenerUsuarioSesion();
      if (sesionActual) {
        const rutSesionPuro = this.limpiarRutPuro(sesionActual.rut_usuario || sesionActual.rut);
        if (rutSesionPuro === rutPure) {
          const devuelto = resUpdate?.usuario || resUpdate?.docente || resUpdate?.data || resUpdate;
          const usuarioActualizado = {
            ...sesionActual,
            ...devuelto,
            ...payload
          };
          this.alumnoService.notificarCambioUsuario(usuarioActualizado);
        }
      }

      this.mostrarToast('Datos del docente actualizados correctamente', 'success');
      this.modalEditar.dismiss();
      this.obtenerDocentes();
    } catch (err: any) {
      console.error('Error al actualizar docente:', err);
      const detalle = err?.error?.error || err?.error?.detail || err?.error?.message || err?.message || '';

      if (detalle.toLowerCase().includes('correo') || detalle.toLowerCase().includes('email')) {
        this.errores.correo = 'Correo ya registrado en el sistema';
        this.mostrarToast('No se puede actualizar: El correo pertenece a otro usuario registrado', 'danger');
      } else {
        this.mostrarToast(detalle || 'Error al actualizar el docente', 'danger');
      }
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
            this.alumnoService.cambiarEstadoDocente(this.limpiarRutPuro(docente.rut_usuario), nuevoEstado).subscribe({
              next: () => {
                this.mostrarToast(`Docente ${esDeshabilitar ? 'deshabilitado' : 'habilitado'} correctamente`, 'success');
                this.obtenerDocentes();
              },
              error: (err: any) => {
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
      genero: '',
      correo: '',
      telefono: '',
      fecha_nacimiento: '',
      direccion: '',
      id_sede: null,
      id_tipo_usuario: 3
    };
    this.limpiarErrores();
    this.quitarImagenAgregar();
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