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

  // Lógica para Intentos Máximos y Bloqueo
  intentosFallidos: number = 0;
  maxIntentos: number = 3;
  bloqueadoTemporalmente: boolean = false;
  segundosRestantes: number = 0;
  private timerBloqueo: any = null;
  private ultimoCorreoIntento: string = '';

  constructor(
    private alumnoService: AlumnoService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navCtrl: NavController
  ) { }

  ngOnInit() { }

  /**
   * Al entrar a la página de login, fuerza la desautenticación limpia
   * borrando sessionStorage y localStorage para evitar datos residuales.
   */
  ionViewWillEnter() {
    this.limpiarSesion();
  }

  private limpiarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    this.alumnoService.cerrarSesion();
    this.credenciales = { correo: '', password: '' };
    this.mostrarPassword = false;
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  async iniciarSesion() {
    if (this.bloqueadoTemporalmente) {
      this.mostrarAlerta(
        'Acceso Bloqueado', 
        `Has superado el límite de intentos. Por favor espera ${this.segundosRestantes} segundos antes de reintentar.`
      );
      return;
    }

    const correoLimpio = this.credenciales.correo.trim().toLowerCase();
    const passLimpia = this.credenciales.password.trim();

    if (!correoLimpio || !passLimpia) {
      this.mostrarAlerta('Campos Vacíos', 'Por favor, ingresa tu correo institucional y contraseña de Administrador.');
      return;
    }

    // Reiniciar contador si el correo de intento cambia
    if (this.ultimoCorreoIntento !== correoLimpio) {
      this.intentosFallidos = 0;
      this.ultimoCorreoIntento = correoLimpio;
    }

    const loading = await this.loadingController.create({
      message: 'Verificando credenciales de administración...',
      spinner: 'crescent'
    });
    await loading.present();

    this.alumnoService.login({ correo: correoLimpio, password: passLimpia }).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        // Éxito: reiniciar contador de fallos
        this.intentosFallidos = 0;

        const usuario = res.usuario;
        const rol = Number(usuario?.id_tipo_usuario);

        // =========================================================================
        // CONTROL DE ACCESO EXCLUSIVO PARA ADMINISTRADORES (id_tipo_usuario === 2)
        // =========================================================================
        if (rol !== 2) {
          this.limpiarSesion();
          this.mostrarAlerta(
            'Acceso Restringido', 
            'Esta plataforma es de uso exclusivo para Administradores. Tu cuenta no cuenta con permisos para acceder.'
          );
          return;
        }

        // Limpiar almacenamiento antes de establecer nueva sesión activa
        localStorage.clear();
        sessionStorage.clear();

        // GUARDAR ÚNICAMENTE EN sessionStorage PARA EXPIRAR AL CERRAR PESTAÑA
        if (usuario && usuario.rut_usuario) {
          sessionStorage.setItem('rut_usuario', usuario.rut_usuario);
          sessionStorage.setItem('usuario', JSON.stringify(usuario));
          sessionStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
          sessionStorage.setItem('usuario_actual', JSON.stringify(usuario));
        }
        
        if (res.token_acceso) {
          sessionStorage.setItem('token_acceso', res.token_acceso);
        }

        // Notificar al servicio la nueva sesión activa
        this.alumnoService.guardarSesion(usuario);

        // Validar si requiere cambio obligatorio de contraseña en el primer ingreso
        if (usuario.cambio_clave_obligatorio) {
          this.navCtrl.navigateRoot('/cambiar-clave-primer-login');
        } else {
          this.navCtrl.navigateRoot('/home');
        }
      },
      error: async (err: any) => {
        await loading.dismiss();
        console.error('Error de autenticación:', err);

        this.intentosFallidos++;
        const mensajeError = err.error?.error || err.error?.detail || 'Credenciales administrativas incorrectas.';

        if (this.intentosFallidos >= this.maxIntentos) {
          this.iniciarBloqueoTemporal();
          this.mostrarAlerta(
            'Acceso Bloqueado Temporalmente', 
            `Has fallado ${this.maxIntentos} intentos consecutivos. Por seguridad, la interfaz de administración ha sido bloqueada por 5 segundos.`
          );
        } else {
          const restantes = this.maxIntentos - this.intentosFallidos;
          this.mostrarAlerta(
            'Error de Acceso', 
            `${mensajeError}\n\nTe quedan ${restantes} intento(s) antes del bloqueo temporal.`
          );
        }
      }
    });
  }

  private iniciarBloqueoTemporal() {
    this.bloqueadoTemporalmente = true;
    this.segundosRestantes = 5;

    if (this.timerBloqueo) {
      clearInterval(this.timerBloqueo);
    }

    this.timerBloqueo = setInterval(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) {
        clearInterval(this.timerBloqueo);
        this.bloqueadoTemporalmente = false;
        this.intentosFallidos = 0;
      }
    }, 1000);
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