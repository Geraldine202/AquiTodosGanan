import { Component, OnInit, ViewChild } from '@angular/core';
import { AlumnoService } from 'src/app/services/alumno';
import { AlertController, ToastController, IonModal } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-docentes',
  templateUrl: './docentes.page.html',
  styleUrls: ['./docentes.page.scss'],
  standalone: false
})
export class DocentesPage implements OnInit {
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

  ngOnInit() {
    this.obtenerDocentes();
    this.obtenerCatalogos();
  }

  private extraerArreglo(res: any): any[] {
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

    if (!nombre_completo || !rut_usuario || !correo || !id_sede) {
      this.mostrarToast('Nombre, RUT, Correo y Sede son obligatorios', 'warning');
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
    this.modalEditar.present();
  }

async actualizarDocente() {
  if (!this.docenteSeleccionado) return;

  const rut = this.docenteSeleccionado.rut_usuario;
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
    
    // Recargar la lista para reflejar los cambios en pantalla inmediatamente
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