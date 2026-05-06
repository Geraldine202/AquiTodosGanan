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

  constructor(private alumnoService: AlumnoService, private alertController: AlertController) { }

  ngOnInit() { this.obtenerAlumnos(); }

  obtenerAlumnos() {
    this.alumnoService.getAlumnos().subscribe({
      next: (res: any) => this.alumnos = res,
      error: (err) => console.error('Error al cargar:', err)
    });
  }

  agregarAlumno() {
    // Limpieza de tipos de datos
    const dataPost = {
      ...this.nuevoAlumno,
      telefono: Number(this.nuevoAlumno.telefono),
      id_sede: Number(this.nuevoAlumno.id_sede),
      id_comuna: Number(this.nuevoAlumno.id_comuna)
    };

    this.alumnoService.addAlumno(dataPost).subscribe({
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
    this.alumnoService.editAlumno(rut, this.alumnoSeleccionado).subscribe({
      next: () => {
        this.obtenerAlumnos();
        this.modalEditar1.dismiss();
      },
      error: (err) => console.error('Error al actualizar:', err)
    });
  }

  prepararEdicion(alumno: any) {
    this.alumnoSeleccionado = { ...alumno };
    this.modalEditar1.present();
  }

  resetForm() {
    this.nuevoAlumno = { 
      rut_usuario: '', nombre_completo: '', genero: '', correo: '',
      direccion: '', telefono: null, fecha_nacimiento: '',
      id_tipo_usuario: 1, id_periodo_academico: 1, id_estado_matricula: 1,
      id_comuna: 1, id_sede: 1
    };
  }
}