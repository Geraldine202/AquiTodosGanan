import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ActividadService } from 'src/app/services/actividad';
import { AlumnoService } from 'src/app/services/alumno';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false
})
export class PerfilPage implements OnInit {

  usuario: any = null;
  cargando: boolean = true;

  // Variables para el cambio de contraseña (exactamente iguales)
  mostrarCambiarPassword: boolean = false;
  cambiandoPassword: boolean = false;
  
  verNuevaPassword: boolean = false;
  verConfirmarPassword: boolean = false;

  passwordForm = {
    nueva_password: '',
    confirmar_password: ''
  };

  constructor(
    private alumnoService: AlumnoService,
    private toastController: ToastController,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cargarPerfil();
  }

  ionViewWillEnter() {
    this.cargarPerfil();
  }

  /**
   * Método de normalización idéntico al de la App Alumno
   */
  normalizarUsuario(data: any): any {
    if (!data) return null;

    const u = { ...data };
    const alumnoObj = data.alumno || data.datos_alumno || {};

    u.rut_usuario = u.rut_usuario || u.rut || alumnoObj.rut_usuario || alumnoObj.rut || '';
    u.nombre_completo = u.nombre_completo || u.nombre || alumnoObj.nombre_completo || '';
    u.correo = u.correo || u.email || alumnoObj.correo || '';
    u.direccion = u.direccion || alumnoObj.direccion || u.direccion_usuario || '';
    u.telefono = u.telefono || alumnoObj.telefono || u.telefono_usuario || '';
    u.imagen = u.imagen || u.foto || u.url_foto || alumnoObj.imagen || alumnoObj.foto || null;

    return u;
  }

  /**
   * Carga los datos del perfil utilizando getAlumnoByRut
   */
  cargarPerfil() {
    this.cargando = true;

    const sessionData = localStorage.getItem('usuarioLogueado') || 
                        localStorage.getItem('usuario') || 
                        localStorage.getItem('user') ||
                        sessionStorage.getItem('usuarioLogueado');

    if (sessionData) {
      try {
        let objetoLocal: any = null;

        if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
          objetoLocal = JSON.parse(sessionData);
          this.usuario = this.normalizarUsuario(objetoLocal);
        }

        const rut = this.usuario?.rut_usuario || objetoLocal?.rut || objetoLocal?.rut_usuario;

        if (rut) {
          this.alumnoService.getAlumnoByRut(rut).subscribe({
            next: (res: any) => {
              const alumnoBD = res?.data || res?.alumno || res;

              if (alumnoBD) {
                this.usuario = this.normalizarUsuario({ ...this.usuario, ...alumnoBD });
                localStorage.setItem('usuarioLogueado', JSON.stringify(this.usuario));
              }
              this.cargando = false;
              this.cdRef.detectChanges();
            },
            error: (err: any) => {
              console.warn('Error al obtener usuario por RUT desde la API:', err);
              this.cargando = false;
              this.cdRef.detectChanges();
            }
          });
        } else {
          this.cargando = false;
        }
      } catch (e) {
        console.error('Error parseando datos de sesión local:', e);
        this.cargando = false;
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Métodos idénticos para alternar la visibilidad de los campos (ojito)
   */
  toggleVerNuevaPassword() {
    this.verNuevaPassword = !this.verNuevaPassword;
  }

  toggleVerConfirmarPassword() {
    this.verConfirmarPassword = !this.verConfirmarPassword;
  }

  /**
   * Método de cambio de contraseña idéntico al perfil de alumnos
   */
  cambiarPassword() {
    const rut = this.usuario?.rut_usuario;
    if (!rut) {
      this.mostrarToast('No se encontró el RUT del usuario', 'danger');
      return;
    }

    const { nueva_password, confirmar_password } = this.passwordForm;

    if (!nueva_password || !confirmar_password) {
      this.mostrarToast('Debes ingresar la nueva contraseña y su confirmación', 'warning');
      return;
    }

    if (nueva_password !== confirmar_password) {
      this.mostrarToast('Las contraseñas no coinciden', 'warning');
      return;
    }

    if (nueva_password.length < 6) {
      this.mostrarToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    this.cambiandoPassword = true;

    this.alumnoService.cambiarPasswordPerfil(rut, nueva_password).subscribe({
      next: (res: any) => {
        this.cambiandoPassword = false;
        this.mostrarToast(res.mensaje || 'Contraseña actualizada con éxito', 'success');
        
        // Limpiar formulario, ojitos y cerrar sección
        this.passwordForm = {
          nueva_password: '',
          confirmar_password: ''
        };
        this.verNuevaPassword = false;
        this.verConfirmarPassword = false;
        this.mostrarCambiarPassword = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        this.cambiandoPassword = false;
        const msg = err.error?.error || 'Error al cambiar la contraseña';
        this.mostrarToast(msg, 'danger');
        this.cdRef.detectChanges();
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}