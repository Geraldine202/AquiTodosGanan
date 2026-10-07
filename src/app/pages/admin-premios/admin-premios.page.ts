import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ActividadService, PremioPayload } from '../../services/actividad';

@Component({
  selector: 'app-admin-premios',
  templateUrl: './admin-premios.page.html',
  styleUrls: ['./admin-premios.page.scss'],
  standalone: false
})
export class AdminPremiosPage implements OnInit {

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
  categorias: any[] = [];
  sedes: any[] = [];
  docentes: any[] = [];

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

  ngOnInit() {
    this.cargarCatalogos();
    this.cargarPremios();
  }

  private inicializarFormulario() {
    this.premioForm = this.fb.group({
      descripcion: ['', [Validators.required]],
      id_categoria: [null, [Validators.required]],
      id_sede: [null, [Validators.required]],
      puntos_requeridos: [1, [Validators.required, Validators.min(1)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      valor: [0, [Validators.min(0)]],
      rut_usuario: ['', [Validators.required]],
      estado_visibilidad: [true],
      imagen: ['']
    });
  }

  cargarCatalogos() {
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

    this.actividadService.getCategoriasPremio().subscribe({
      next: (data: any) => {
        this.categorias = Array.isArray(data) ? data : (data?.data || []);
      },
      error: (err) => console.error('Error al cargar categorías:', err)
    });

    this.actividadService.getDocentes().subscribe({
      next: (data: any) => {
        const docentesRaw = Array.isArray(data) ? data : (data?.data || []);
        this.docentes = docentesRaw.map((doc: any) => ({
          ...doc,
          rut_usuario: doc.rut_usuario || doc.rut || doc.rut_docente || 'S/R',
          nombre_completo: doc.nombre_completo || `${doc.p_nombre || doc.nombre || ''} ${doc.p_apellido || doc.apellido || ''}`.trim()
        }));
      },
      error: (err) => console.error('Error al cargar docentes:', err)
    });
  }

  cargarPremios() {
    this.cargando = true;
    this.actividadService.getPremios().subscribe({
      next: (data) => {
        this.premios = data;
        this.filtrarPremios();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.mostrarToast('Error al cargar la lista de premios', 'danger');
      }
    });
  }

  filtrarPremios() {
    let resultado = [...this.premios];

    if (this.busquedaTexto && this.busquedaTexto.trim() !== '') {
      const texto = this.busquedaTexto.toLowerCase().trim();
      resultado = resultado.filter(p =>
        p.descripcion?.toLowerCase().includes(texto) ||
        p.categoria_premio?.descripcion?.toLowerCase().includes(texto)
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

  /**
   * Cambia la visibilidad directamente desde la tarjeta principal
   */
async cambiarVisibilidad(premio: any) {
  if (premio.actualizandoVisibilidad) return;

  const estadoAnterior = premio.estado_visibilidad;
  const nuevoEstado = !estadoAnterior;

  premio.actualizandoVisibilidad = true;
  premio.estado_visibilidad = nuevoEstado;

  // Se remueve 'valor' de este objeto
  const payload: Omit<PremioPayload, 'valor'> | any = {
    descripcion: premio.descripcion,
    id_categoria: Number(premio.id_categoria),
    id_sede: Number(premio.id_sede),
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
      puntos_requeridos: 1,
      stock: 0,
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
      puntos_requeridos: premio.puntos_requeridos || 1,
      stock: this.obtenerStock(premio),
      valor: premio.valor || 0,
      rut_usuario: premio.rut_usuario || premio.usuario?.rut_usuario || '',
      estado_visibilidad: premio.estado_visibilidad ?? true,
      imagen: premio.imagen || 'assets/logo.png'
    });

    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
  }

  async guardarPremio() {
    if (this.premioForm.invalid) {
      this.premioForm.markAllAsTouched();
      this.mostrarToast('Por favor complete los campos obligatorios (*)', 'warning');
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

      const formVal = this.premioForm.value;
      const payload: PremioPayload = {
        descripcion: formVal.descripcion.trim(),
        id_categoria: Number(formVal.id_categoria),
        id_sede: Number(formVal.id_sede),
        puntos_requeridos: Number(formVal.puntos_requeridos || 1),
        stock: Number(formVal.stock || 0),
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
      this.cargarPremios();
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
        this.cargarPremios();
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