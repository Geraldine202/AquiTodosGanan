import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';

// CORREGIDO: Importamos AlumnoService que es donde unificamos los métodos del login
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

  constructor(
    // CORREGIDO: Inyectamos alumnoService en lugar de authService
    private alumnoService: AlumnoService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
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

    // CORREGIDO: Llamamos a alumnoService para procesar la autenticación
    this.alumnoService.login(this.credenciales).subscribe({
      next: (res: any) => {
        loading.dismiss();
        
        // CORREGIDO: Guardamos la sesión usando el método del nuevo servicio
        this.alumnoService.guardarSesion(res.usuario);
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        loading.dismiss();
        console.error('Error en el login:', err);
        this.mostrarAlerta(
          'Error de Acceso', 
          'Las credenciales ingresadas no coinciden con nuestros registros.'
        );
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