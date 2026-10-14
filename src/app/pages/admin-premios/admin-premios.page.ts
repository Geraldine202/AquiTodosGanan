import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, AlertController, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ActividadService, PremioPayload } from '../../services/actividad';

@Component({
  selector: 'app-admin-premios',
  templateUrl: './admin-premios.page.html',
  styleUrls: ['./admin-premios.page.scss'],
  standalone: false
})
export class AdminPremiosPage implements OnInit, ViewWillEnter {

  cargando: boolean = false;
  guardando: boolean = false;
  modalAbierto: boolean = false;
  esEdicion: boolean = false;
  idPremioSeleccionado: number | null = null;

  // Variables de Búsqueda y Filtro
  busquedaTexto: string = '';
  categoriaFiltro: number = 0;

  premios: any[] = [];
  premiosFiltrados: any[] = [];
  premiosStockBajo: any[] = [];
  categorias: any[] = [];
  sedes: any[] = [];
  docentes: any[] = []; // Almacena únicamente los responsables activos
  niveles: any[] = [];

  premioForm!: FormGroup;
  imagenPreview: string | null = null;
  archivoImagen: File | null = null;

  constructor(
    private fb: FormBuilder,
    private actividadService: ActividadService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.inicializarFormulario();
  }

  ngOnInit() { }

  /**
   * Ciclo de vida de Ionic: Se ejecuta CADA VEZ que el usuario ingresa a esta vista.
   * Evita tener que presionar F5 o recargar manualmente la página.
   */
  ionViewWillEnter() {
    this.cargarCatalogos();
    this.cargarPremios();
  }

  private inicializarFormulario() {
    this.premioForm = this.fb.group({
      descripcion: ['', [Validators.required]],
      id_categoria: [null, [Validators.required]],
      id_sede: [null, [Validators.required]],
      id_nivel: [1, [Validators.required]], // Nivel 1 (Bronce) por defecto
      puntos_requeridos: [1, [Validators.required, Validators.min(1)]], // Puntos > 0
      stock: [1, [Validators.required, Validators.min(1)]], // Stock > 0 (ningún valor puede ser 0)
      valor: [0, [Validators.min(0)]],
      rut_usuario: ['', [Validators.required]],
      estado_visibilidad: [true],
      imagen: ['']
    });
  }

  obtenerTipoUsuario(u: any): number {
    const val = u?.id_tipo_usuario ?? u?.tipo_usuario?.id_tipo_usuario ?? u?.id_rol ?? u?.rol?.id_rol ?? 1;
    return Number(val);
  }

  cargarCatalogos() {
    // Cargar Sedes
    this.actividadService.getSedes().subscribe({
      next: (data: any) => {
        const sedesRaw = Array.isArray(data) ? data : (data?.data || []);
        this.sedes = sedesRaw.map((s: any) => ({
          id_sede: Number(s.id_sede ?? s.id ?? s.id_sede_act),
          descripcion: s.descripcion || s.nombre_sede || s.nombre || 'Sede sin nombre'
        }));
      },
      error: (err) => console.error('Error al cargar sedes:', err)
    });

    // Cargar Categorías
    this.actividadService.getCategoriasPremio().subscribe({
      next: (data: any) => {
        this.categorias = Array.isArray(data) ? data : (data?.data || []);
      },
      error: (err) => console.error('Error al cargar categorías:', err)
    });

    // Cargar Niveles con mapeo seguro y respaldo
    this.actividadService.getNiveles().subscribe({
      next: (data: any) => {
        const nivelesRaw = Array.isArray(data) ? data : (data?.data || []);
        if (nivelesRaw.length > 0) {
          this.niveles = nivelesRaw.map((n: any) => ({
            id_nivel: Number(n.id_nivel),
            nombre_nivel: n.nombre_nivel,
            min_actividades: Number(n.min_actividades || 0)
          }));
        } else {
          this.usarNivelesPorDefecto();
        }
      },
      error: (err) => {
        console.error('Error al cargar niveles desde la API, usando respaldo:', err);
        this.usarNivelesPorDefecto();
      }
    });

    // Cargar Responsables Activos directamente desde el endpoint /responsables-activos
    this.actividadService.getResponsablesActivos().subscribe({
      next: (data: any) => {
        const responsablesRaw = Array.isArray(data) ? data : (data?.data || []);
        this.docentes = responsablesRaw.map((resp: any) => ({
          ...resp,
          rut_usuario: resp.rut_usuario || '',
          nombre_completo: resp.nombre_completo || 'Responsable sin nombre'
        }));
      },
      error: (err) => console.error('Error al cargar responsables activos:', err)
    });
  }

  /** Método de respaldo para asegurar que el selector de nivel nunca quede vacío */
  private usarNivelesPorDefecto() {
    this.niveles = [
      { id_nivel: 1, nombre_nivel: 'Bronce', min_actividades: 0 },
      { id_nivel: 2, nombre_nivel: 'Oro', min_actividades: 4 },
      { id_nivel: 3, nombre_nivel: 'Platino', min_actividades: 7 }
    ];
  }

  cargarPremios() {
    this.cargando = true;
    this.actividadService.getPremios().subscribe({
      next: (data) => {
        this.premios = data || [];
        this.evaluarStockBajo();
        this.filtrarPremios();
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando premios:', err);
        this.cargando = false;
        this.mostrarToast('Error al cargar la lista de premios', 'danger');
      }
    });
  }

  evaluarStockBajo() {
    this.premiosStockBajo = (this.premios || []).filter(p => this.obtenerStock(p) <= 3);
  }

  filtrarPremios() {
    let resultado = [...this.premios];

    if (this.busquedaTexto && this.busquedaTexto.trim() !== '') {
      const texto = this.busquedaTexto.toLowerCase().trim();
      resultado = resultado.filter(p =>
        p.descripcion?.toLowerCase().includes(texto) ||
        p.categoria_premio?.descripcion?.toLowerCase().includes(texto) ||
        p.nivel?.nombre_nivel?.toLowerCase().includes(texto)
      );
    }

    if (this.categoriaFiltro && Number(this.categoriaFiltro) !== 0) {
      resultado = resultado.filter(p =>
        Number(p.id_categoria) === Number(this.categoriaFiltro)
      );
    }

    this.premiosFiltrados = resultado;
  }

  obtenerStock(premio: any): number {
    if (premio.stock !== undefined && premio.stock !== null) {
      return Number(premio.stock);
    }
    if (premio.stock_sede && Array.isArray(premio.stock_sede) && premio.stock_sede.length > 0) {
      return Number(premio.stock_sede[0].cantidad || 0);
    }
    return 0;
  }

  async cambiarVisibilidad(premio: any) {
    if (premio.actualizandoVisibilidad) return;

    const estadoAnterior = premio.estado_visibilidad;
    const nuevoEstado = !estadoAnterior;

    premio.actualizandoVisibilidad = true;
    premio.estado_visibilidad = nuevoEstado;

    const payload: Omit<PremioPayload, 'valor'> | any = {
      descripcion: premio.descripcion,
      id_categoria: Number(premio.id_categoria),
      id_sede: Number(premio.id_sede),
      id_nivel: Number(premio.id_nivel || 1),
      puntos_requeridos: Number(premio.puntos_requeridos || 1),
      stock: Number(this.obtenerStock(premio)),
      rut_usuario: premio.rut_usuario || premio.usuario?.rut_usuario || '',
      estado_visibilidad: nuevoEstado,
      imagen: premio.imagen || ''
    };

    try {
      await firstValueFrom(
        this.actividadService.actualizarPremio(premio.id_premio, payload)
      );

      const mensaje = nuevoEstado 
        ? 'Premio visible para estudiantes' 
        : 'Premio ocultado para estudiantes';
      this.mostrarToast(mensaje, 'success');

    } catch (err: any) {
      premio.estado_visibilidad = estadoAnterior;
      console.error('Error al cambiar visibilidad:', err);
      const mensajeError = err.error?.detail || 'Error al cambiar la visibilidad';
      this.mostrarToast(mensajeError, 'danger');
    } finally {
      premio.actualizandoVisibilidad = false;
    }
  }

  campoInvalido(campo: string): boolean {
    const control = this.premioForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  seleccionarImagen(event: any) {
    const file: File = event.target.files?.[0];
    if (!file) return;

    this.archivoImagen = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagenPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  quitarImagen() {
    this.imagenPreview = null;
    this.archivoImagen = null;
    this.premioForm.patchValue({ imagen: '' });
  }

  abrirModalCrear() {
    this.esEdicion = false;
    this.idPremioSeleccionado = null;
    this.imagenPreview = null;
    this.archivoImagen = null;
    this.premioForm.reset({
      id_nivel: 1, // Default: Bronce
      puntos_requeridos: 1, // Mínimo 1
      stock: 1, // Mínimo 1
      valor: 0,
      estado_visibilidad: true,
      imagen: ''
    });
    this.modalAbierto = true;
  }

  abrirModalEditar(premio: any) {
    this.esEdicion = true;
    this.idPremioSeleccionado = premio.id_premio;
    this.imagenPreview = premio.imagen || null;
    this.archivoImagen = null;

    this.premioForm.patchValue({
      descripcion: premio.descripcion || '',
      id_categoria: premio.id_categoria || null,
      id_sede: premio.id_sede || null,
      id_nivel: premio.id_nivel || 1,
      puntos_requeridos: premio.puntos_requeridos || 1,
      stock: this.obtenerStock(premio) || 1,
      valor: premio.valor || 0,
      rut_usuario: premio.rut_usuario || premio.usuario?.rut_usuario || '',
      estado_visibilidad: premio.estado_visibilidad ?? true,
      imagen: premio.imagen || ''
    });

    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
  }

  async guardarPremio() {
    // 1. Comprobar validez general del formulario
    if (this.premioForm.invalid) {
      this.premioForm.markAllAsTouched();
      this.mostrarToast('Por favor complete los campos obligatorios (*)', 'warning');
      return;
    }

    const formVal = this.premioForm.value;

    // 2. Validación explícita: Puntos Requeridos debe ser estrictamente > 0
    if (Number(formVal.puntos_requeridos) <= 0) {
      this.mostrarToast('Los puntos requeridos deben ser mayores a 0', 'warning');
      return;
    }

    // 3. Validación explícita: Stock debe ser estrictamente > 0
    if (Number(formVal.stock) <= 0) {
      this.mostrarToast('El stock disponible debe ser mayor a 0', 'warning');
      return;
    }

    this.guardando = true;

    try {
      let urlImagen = this.premioForm.get('imagen')?.value || '';

      if (this.archivoImagen) {
        const res = await firstValueFrom(
          this.actividadService.subirImagen(this.archivoImagen, 'premios')
        );
        if (res && res.url) {
          urlImagen = res.url;
        }
      }

      const payload: PremioPayload = {
        descripcion: formVal.descripcion.trim(),
        id_categoria: Number(formVal.id_categoria),
        id_sede: Number(formVal.id_sede),
        id_nivel: Number(formVal.id_nivel || 1),
        puntos_requeridos: Number(formVal.puntos_requeridos),
        stock: Number(formVal.stock),
        rut_usuario: formVal.rut_usuario,
        estado_visibilidad: Boolean(formVal.estado_visibilidad),
        imagen: urlImagen
      };

      if (this.esEdicion && this.idPremioSeleccionado) {
        await firstValueFrom(
          this.actividadService.actualizarPremio(this.idPremioSeleccionado, payload)
        );
        this.mostrarToast('Premio actualizado exitosamente', 'success');
      } else {
        await firstValueFrom(
          this.actividadService.crearPremio(payload)
        );
        this.mostrarToast('Premio creado exitosamente', 'success');
      }

      this.cerrarModal();
      this.cargarPremios(); // Recarga la lista en pantalla automáticamente
    } catch (err: any) {
      console.error('Error al guardar premio:', err);
      const mensaje = err.error?.detail || 'Error al procesar la solicitud';
      this.mostrarToast(mensaje, 'danger');
    } finally {
      this.guardando = false;
    }
  }

  async confirmarEliminacion(premio: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Está seguro de que desea eliminar "${premio.descripcion}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.eliminarPremio(premio.id_premio);
          }
        }
      ]
    });
    await alert.present();
  }

  eliminarPremio(id: number) {
    this.actividadService.eliminarPremio(id).subscribe({
      next: () => {
        this.mostrarToast('Premio eliminado correctamente', 'success');
        this.cargarPremios(); // Recarga la lista automáticamente
      },
      error: (err) => {
        const mensaje = err.error?.detail || 'Error al eliminar el premio';
        this.mostrarToast(mensaje, 'danger');
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}