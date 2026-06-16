import { Component, OnInit, ViewChild } from '@angular/core';
import { AlumnoService } from 'src/app/services/alumno'; 
import { AlertController, IonModal } from '@ionic/angular';

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
  alumnoSeleccionado: any = null; 
  
  nuevoAlumno: any = {
    rut_usuario: '', nombre_completo: '', genero: '', correo: '',
    direccion: '', telefono: null, fecha_nacimiento: '',
    id_tipo_usuario: 1, id_periodo_academico: 1, id_estado_matricula: 1,
    id_comuna: 1, id_sede: 1
  };

  // PROPIEDADES PARA IMÁGENES: Archivo binario y previsualización
  archivoSeleccionado: File | null = null;
  imagenPreview: string | null = null;

  // NUEVAS PROPIEDADES PARA EL BUSCADOR
  textoBuscar: string = '';
  alumnosFiltrados: any[] = []; // Es la lista vinculada al *ngFor del HTML

  constructor(private alumnoService: AlumnoService, private alertController: AlertController) { }

  ngOnInit() { 
    this.obtenerAlumnos(); 
  }

  obtenerAlumnos() {
    this.alumnoService.getAlumnos().subscribe({
      next: (res: any) => {
        this.alumnos = res;
        this.filtrarAlumnos(); // Mantiene sincronizada la búsqueda al recargar la lista
      },
      error: (err) => console.error('Error al cargar:', err)
    });
  }

  // MÉTODO DEL BUSCADOR: Filtra localmente por Nombre o RUT de manera instantánea
  filtrarAlumnos() {
    const texto = this.textoBuscar.trim().toLowerCase();

    if (texto === '') {
      this.alumnosFiltrados = [...this.alumnos];
    } else {
      this.alumnosFiltrados = this.alumnos.filter(alu => {
        const nombre = alu.nombre_completo ? alu.nombre_completo.toLowerCase() : '';
        const rut = alu.rut_usuario ? alu.rut_usuario.toLowerCase() : '';
        
        return nombre.includes(texto) || rut.includes(texto);
      });
    }
  }

  // MÉTODO: Captura el archivo binario y genera la previsualización en tiempo real
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoSeleccionado = file;

      // Generar base64 para mostrar la imagen en el HTML antes de subirla
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  agregarAlumno() {
    const datosTexto = {
      ...this.nuevoAlumno,
      telefono: Number(this.nuevoAlumno.telefono),
      id_sede: Number(this.nuevoAlumno.id_sede),
      id_comuna: Number(this.nuevoAlumno.id_comuna)
    };

    const formData = new FormData();

    if (this.archivoSeleccionado) {
      formData.append('foto', this.archivoSeleccionado);
      formData.append('datos', JSON.stringify(datosTexto));
    } else {
      Object.keys(datosTexto).forEach(key => {
        formData.append(key, datosTexto[key]);
      });
    }

    this.alumnoService.addAlumno(formData).subscribe({
      next: () => {
        this.obtenerAlumnos();
        this.modalAgregar.dismiss();
        this.resetForm();
      },
      error: (err) => console.error('Error 400 - Revisa los datos:', err)
    });
  }

  async eliminarAlumno(rut: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: `¿Eliminar RUT ${rut}?`,
      buttons: [
        { text: 'No' },
        {
          text: 'Sí, eliminar',
          handler: () => {
            this.alumnoService.deleteAlumno(rut).subscribe({
              next: () => this.obtenerAlumnos(),
              error: (err) => console.error('Error al eliminar:', err)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  actualizarAlumno() {
    const rut = this.alumnoSeleccionado.rut_usuario;

    const datosTexto = {
      ...this.alumnoSeleccionado,
      telefono: this.alumnoSeleccionado.telefono ? Number(this.alumnoSeleccionado.telefono) : null,
      id_sede: Number(this.alumnoSeleccionado.id_sede),
      id_comuna: Number(this.alumnoSeleccionado.id_comuna),
      id_estado_matricula: Number(this.alumnoSeleccionado.id_estado_matricula)
    };

    // Quitamos llaves relacionales que pudieran venir de Supabase (Evita errores en cascada del backend)
    delete (datosTexto as any).sede;
    delete (datosTexto as any).comuna;
    delete (datosTexto as any).estado_matricula;
    delete (datosTexto as any).carrera;

    const formData = new FormData();

    if (this.archivoSeleccionado) {
      formData.append('foto', this.archivoSeleccionado);
      formData.append('datos', JSON.stringify(datosTexto));
    } else {
      Object.keys(datosTexto).forEach(key => {
        if (datosTexto[key] !== null && datosTexto[key] !== undefined) {
          formData.append(key, datosTexto[key]);
        }
      });
    }

    this.alumnoService.editAlumno(rut, formData).subscribe({
      next: () => {
        this.obtenerAlumnos();
        this.modalEditar1.dismiss();
        this.limpiarImagenes(); 
      },
      error: (err) => console.error('Error al actualizar:', err)
    });
  }

  prepararEdicion(alumno: any) {
    this.limpiarImagenes();
    this.alumnoSeleccionado = { ...alumno };
    this.modalEditar1.present();
  }

  limpiarImagenes() {
    this.archivoSeleccionado = null;
    this.imagenPreview = null;
  }

  resetForm() {
    this.nuevoAlumno = { 
      rut_usuario: '', nombre_completo: '', genero: '', correo: '',
      direccion: '', telefono: null, fecha_nacimiento: '',
      id_tipo_usuario: 1, id_periodo_academico: 1, id_estado_matricula: 1,
      id_comuna: 1, id_sede: 1
    };
    this.limpiarImagenes();
  }
}