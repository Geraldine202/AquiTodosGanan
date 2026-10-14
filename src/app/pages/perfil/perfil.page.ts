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

  // Variables para el cambio de contraseña
  mostrarCambiarPassword: boolean = false;
  cambiandoPassword: boolean = false;
  
  verNuevaPassword: boolean = false;
  verConfirmarPassword: boolean = false;

  passwordForm = {
    nueva_password: '',
    confirmar_password: ''
  };

  // Errores e indicadores visuales de requisitos
  errorPassword: string = '';
  requisitosPass = {
    longitud: false,
    mayuscula: false,
    minuscula: false,
    numero: false,
    especial: false
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
                      sessionStorage.getItem('usuarioLogueado');

  if (!sessionData) {
    this.router.navigate(['/login']);
    return;
  }

  try {
    const usuarioSesion = JSON.parse(sessionData);
    this.usuario = this.normalizarUsuario(usuarioSesion);

    const tipoUser = Number(this.usuario?.id_tipo_usuario);
    const esEstudiante = tipoUser === 1; // Solo ID 1 es Estudiante

    const rutReal = this.usuario?.rut_usuario;

    // Solo si es Estudiante (1) busca datos adicionales en la API de alumnos
    if (esEstudiante && rutReal) {
      this.alumnoService.getAlumnoByRut(rutReal).subscribe({
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
          console.warn('Error al cargar datos del alumno:', err);
          this.cargando = false;
          this.cdRef.detectChanges();
        }
      });
    } else {
      // Para Administrador (2), Docente (3) y Consejero (4), usa la sesión activa
      this.cargando = false;
      this.cdRef.detectChanges();
    }
  } catch (e) {
    console.error('Error parseando sesión:', e);
    this.cargando = false;
    this.router.navigate(['/login']);
  }
}

  /**
   * Métodos para alternar la visibilidad de los campos (ojito)
   */
  toggleVerNuevaPassword() {
    this.verNuevaPassword = !this.verNuevaPassword;
  }

  toggleVerConfirmarPassword() {
    this.verConfirmarPassword = !this.verConfirmarPassword;
  }

  /**
   * Evalúa la contraseña en tiempo real mientras el usuario escribe
   */
  validarPasswordEnVivo() {
    const pass = this.passwordForm.nueva_password || '';

    // Evaluar cada regla de seguridad (incluyendo Mayúscula y Minúscula)
    this.requisitosPass.longitud = pass.length >= 8;
    this.requisitosPass.mayuscula = /[A-Z]/.test(pass);
    this.requisitosPass.minuscula = /[a-z]/.test(pass);
    this.requisitosPass.numero = /\d/.test(pass);
    this.requisitosPass.especial = /[@$!%*?&#.\-_/*+]/.test(pass);

    if (!pass) {
      this.errorPassword = '';
      return;
    }

    if (!this.requisitosPass.longitud || !this.requisitosPass.mayuscula || !this.requisitosPass.minuscula || !this.requisitosPass.numero || !this.requisitosPass.especial) {
      this.errorPassword = 'La contraseña no cumple con los requisitos mínimos de seguridad.';
    } else {
      this.errorPassword = '';
    }
  }

  /**
   * Valida completamente la contraseña antes de hacer el envío
   */
  private esPasswordValida(pass: string): boolean {
    if (!pass || pass.length < 8) return false;
    const tieneMayuscula = /[A-Z]/.test(pass);
    const tieneMinuscula = /[a-z]/.test(pass);
    const tieneNumero = /\d/.test(pass);
    const tieneEspecial = /[@$!%*?&#.\-_/*+]/.test(pass);

    return tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial;
  }

  /**
   * Método de cambio de contraseña con validación fuerte
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

    // 1. Validación de reglas de seguridad
    if (!this.esPasswordValida(nueva_password)) {
      this.mostrarToast('La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.', 'danger');
      return;
    }

    // 2. Coincidencia de contraseñas
    if (nueva_password !== confirmar_password) {
      this.mostrarToast('Las contraseñas no coinciden', 'warning');
      return;
    }

    this.cambiandoPassword = true;

    this.alumnoService.cambiarPasswordPerfil(rut, nueva_password).subscribe({
      next: (res: any) => {
        this.cambiandoPassword = false;
        this.mostrarToast(res.mensaje || 'Contraseña actualizada con éxito', 'success');
        
        // Limpiar formulario, ojitos y cerrar sección
        this.resetPasswordForm();
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        this.cambiandoPassword = false;
        const msg = err.error?.error || err.error?.message || 'Error al cambiar la contraseña';
        this.mostrarToast(msg, 'danger');
        this.cdRef.detectChanges();
      }
    });
  }

  resetPasswordForm() {
    this.passwordForm = {
      nueva_password: '',
      confirmar_password: ''
    };
    this.verNuevaPassword = false;
    this.verConfirmarPassword = false;
    this.mostrarCambiarPassword = false;
    this.errorPassword = '';
    this.requisitosPass = { longitud: false, mayuscula: false, minuscula: false, numero: false, especial: false };
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