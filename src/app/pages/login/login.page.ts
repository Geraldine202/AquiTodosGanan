import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';

import { AlumnoService } from '../../services/alumno'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

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

  ngOnInit() {
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  async iniciarSesion() {
    if (!this.credenciales.correo.trim() || !this.credenciales.password.trim()) {
      this.mostrarAlerta('Campos Vacíos', 'Por favor, ingresa tu correo institucional y contraseña.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Autenticando usuario...',
      spinner: 'crescent'
    });
    await loading.present();

    this.alumnoService.login(this.credenciales).subscribe({
      next: async (res: any) => {
        await loading.dismiss();
        
        const usuario = res.usuario;

        if (usuario && usuario.rut_usuario) {
          // Guardar información del usuario de manera consistente
          localStorage.setItem('rut_usuario', usuario.rut_usuario);
          localStorage.setItem('usuario', JSON.stringify(usuario));
          localStorage.setItem('usuario_actual', JSON.stringify(usuario));
        }
        
        if (res.token_acceso) {
          localStorage.setItem('token_acceso', res.token_acceso);
        }

        this.alumnoService.guardarSesion(usuario);

        const rol = Number(usuario?.id_tipo_usuario);

        // 1. VERIFICAR SI DEBE CAMBIAR SU CONTRASEÑA OBLIGATORIAMENTE
        // (Aplica a Alumnos: 1 y Docentes: 3; el Admin: 2 no realiza este flujo)
        if (usuario.cambio_clave_obligatorio && rol !== 2) {
          // Redirige a la ruta exacta de la nueva página
          this.navCtrl.navigateRoot('/cambiar-clave-obligatorio');
          return;
        }

        // 2. REDIRECCIÓN SEGÚN ROL SI NO REQUIERE CAMBIO DE CLAVE
        if (rol === 3) {
          // Docentes van a su panel
          this.navCtrl.navigateRoot('/docentes');
        } else {
          // Alumnos (o cualquier otro rol regular) van a Home
          this.navCtrl.navigateRoot('/home');
        }
      },
      error: async (err: any) => {
        await loading.dismiss();
        console.error('Error de autenticación:', err);
        const mensajeError = err.error?.error || 'Las credenciales ingresadas no coinciden.';
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