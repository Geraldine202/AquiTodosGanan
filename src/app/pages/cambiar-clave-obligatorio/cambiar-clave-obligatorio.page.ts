import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { AlumnoService } from 'src/app/services/alumno';

@Component({
  selector: 'app-cambiar-clave-obligatorio',
  templateUrl: './cambiar-clave-obligatorio.page.html',
  styleUrls: ['./cambiar-clave-obligatorio.page.scss'],
  standalone: false
})
export class CambiarClaveObligatorioPage implements OnInit {

  datosClave = {
    nuevaPassword: '',
    confirmarPassword: ''
  };

  mostrarNuevaClave: boolean = false;
  mostrarConfirmarClave: boolean = false;
  usuarioActual: any = null;

  constructor(
    private alumnoService: AlumnoService,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.validarUsuarioYRol();
  }

  validarUsuarioYRol() {
    // Obtener el usuario directamente desde localStorage
    const usuarioLocalStr = localStorage.getItem('usuario_actual') || localStorage.getItem('usuario');
    if (usuarioLocalStr) {
      try {
        this.usuarioActual = JSON.parse(usuarioLocalStr);
      } catch (e) {
        console.error('Error al parsear usuario local:', e);
      }
    }

    // Si no hay usuario ni RUT en almacenamiento local, redirigir al Login
    const rut = this.usuarioActual?.rut_usuario || localStorage.getItem('rut_usuario');
    if (!rut) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    // EXCLUSIÓN ADMINISTRADOR: El admin (id_tipo_usuario: 2) no realiza este flujo
    if (this.usuarioActual && Number(this.usuarioActual.id_tipo_usuario) === 2) {
      this.mostrarAlerta(
        'Acceso no requerido', 
        'La cuenta de administrador no requiere cambio obligatorio de clave.'
      );
      this.navCtrl.navigateRoot('/docentes');
    }
  }

  toggleNuevaClave() {
    this.mostrarNuevaClave = !this.mostrarNuevaClave;
  }

  toggleConfirmarClave() {
    this.mostrarConfirmarClave = !this.mostrarConfirmarClave;
  }

  async guardarNuevaClave() {
    const { nuevaPassword, confirmarPassword } = this.datosClave;

    if (!nuevaPassword.trim() || !confirmarPassword.trim()) {
      this.mostrarAlerta('Campos incompletos', 'Por favor, completa ambos campos requeridos.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      this.mostrarAlerta('Error de coincidencia', 'Las contraseñas ingresadas no coinciden.');
      return;
    }

    if (nuevaPassword.length < 6) {
      this.mostrarAlerta('Contraseña débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const rutUsuario = this.usuarioActual?.rut_usuario || localStorage.getItem('rut_usuario');
    if (!rutUsuario) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando contraseña...',
      spinner: 'crescent'
    });
    await loading.present();

    // Se pasan los 2 argumentos separados como lo espera tu AlumnoService: (rut_usuario, nueva_password)
    this.alumnoService.cambiarPasswordObligatorio(rutUsuario, nuevaPassword.trim()).subscribe({
      next: async () => {
        await loading.dismiss();

        // Actualizar la bandera en localStorage para no solicitar cambio de nuevo
        if (this.usuarioActual) {
          this.usuarioActual.cambio_clave_obligatorio = false;
          localStorage.setItem('usuario_actual', JSON.stringify(this.usuarioActual));
          localStorage.setItem('usuario', JSON.stringify(this.usuarioActual));
        }

        const alert = await this.alertController.create({
          header: '¡Contraseña Actualizada!',
          message: 'Tu nueva contraseña ha sido registrada con éxito. Ya puedes acceder al sistema.',
          buttons: [{
            text: 'Continuar al Inicio',
            handler: () => {
              const rol = Number(this.usuarioActual?.id_tipo_usuario);
              // Redirección según el rol
              if (rol === 3) {
                this.navCtrl.navigateRoot('/docentes');
              } else {
                this.navCtrl.navigateRoot('/home');
              }
            }
          }]
        });
        await alert.present();
      },
      error: async (err: any) => {
        await loading.dismiss();
        console.error('Error al cambiar contraseña:', err);
        const msg = err.error?.error || 'No se pudo actualizar la contraseña. Revisa la conexión.';
        this.mostrarAlerta('Error', msg);
      }
    });
  }

  private async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['Aceptar']
    });
    await alert.present();
  }
}