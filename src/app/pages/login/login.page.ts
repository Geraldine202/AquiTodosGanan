import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, NavController, ViewWillEnter } from '@ionic/angular';

import { AlumnoService } from '../../services/alumno'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit, ViewWillEnter {

  credenciales = {
    correo: '',
    password: ''
  };

  mostrarPassword: boolean = false;

  constructor(
    private alumnoService: AlumnoService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navCtrl: NavController
  ) { }

  ngOnInit() { }

  /**
   * Al entrar a la página de login administrativo, fuerza la desautenticación limpia
   * para asegurar que NINGÚN usuario quede precargado sin ingresar credenciales reales.
   */
  ionViewWillEnter() {
    this.limpiarSesion();
  }

  private limpiarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    this.credenciales = { correo: '', password: '' };
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  async iniciarSesion() {
    if (!this.credenciales.correo.trim() || !this.credenciales.password.trim()) {
      this.mostrarAlerta('Campos Vacíos', 'Por favor, ingresa tu correo institucional y contraseña de Administrador.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Verificando credenciales de administración...',
      spinner: 'crescent'
    });
    await loading.present();

    this.alumnoService.login(this.credenciales).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        const usuario = res.usuario;
        const rol = Number(usuario?.id_tipo_usuario);

        // =========================================================================
        // CONTROL DE ACCESO EXCLUSIVO PARA ADMINISTRADORES (id_tipo_usuario === 2)
        // =========================================================================
        if (rol !== 2) {
          // Si el usuario es Alumno (1) o Docente (3), no se le permite ingresar a esta plataforma
          this.limpiarSesion();
          this.mostrarAlerta(
            'Acceso Restringido', 
            'Esta plataforma es de uso exclusivo para Administradores. Tu cuenta no cuenta con permisos para acceder.'
          );
          return;
        }

        // Si es Administrador (rol === 2), guardar sesión y token limpio
        localStorage.clear();
        sessionStorage.clear();

        if (usuario && usuario.rut_usuario) {
          localStorage.setItem('rut_usuario', usuario.rut_usuario);
          localStorage.setItem('usuario', JSON.stringify(usuario));
          localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
          localStorage.setItem('usuario_actual', JSON.stringify(usuario));
        }
        
        if (res.token_acceso) {
          localStorage.setItem('token_acceso', res.token_acceso);
        }

        this.alumnoService.guardarSesion(usuario);

        // Redireccionar al panel/home de administración
        this.navCtrl.navigateRoot('/home');
      },
      error: async (err: any) => {
        await loading.dismiss();
        console.error('Error de autenticación:', err);
        const mensajeError = err.error?.error || 'Credenciales administrativas incorrectas.';
        this.mostrarAlerta('Error de Acceso', mensajeError);
      }
    });
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['Aceptar']
    });
    await alert.present();
  }
}