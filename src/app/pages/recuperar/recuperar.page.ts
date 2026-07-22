import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-recuperar',
  templateUrl: './recuperar.page.html',
  styleUrls: ['./recuperar.page.scss'],
  standalone: false
})
export class RecuperarPage {
  paso: number = 1;
  correo: string = '';
  token: string = '';
  nuevaContrasenia: string = '';

  // Asegúrate de usar la IP/puerto correcto de tu servidor Node.js
  private apiUrl = 'http://localhost:3000/auth'; 

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  // 1. Enviar correo para solicitar el token
  solicitarCodigo() {
    if (!this.correo) {
      this.mostrarToast('Por favor, ingresa tu correo institucional.');
      return;
    }

    this.http.post<any>(`${this.apiUrl}/solicitar-recuperacion`, { correo: this.correo }).subscribe({
      next: (res) => {
        // En etapa de pruebas te mostrará el token generado en pantalla/consola
        this.mostrarToast(res.mensaje || 'Código generado correctamente.');
        if (res.token) {
          console.log('🔑 Token de pruebas:', res.token);
        }
        this.paso = 2; // Avanza al paso de ingresar el código
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.mensaje || 'Error al procesar la solicitud.';
        this.mostrarToast(msg);
      }
    });
  }

  // 2. Validar token y actualizar la clave
  cambiarContrasenia() {
    if (!this.token || !this.nuevaContrasenia) {
      this.mostrarToast('Por favor, completa todos los campos.');
      return;
    }

    const payload = {
      token: this.token,
      nuevaContrasenia: this.nuevaContrasenia
    };

    this.http.post<any>(`${this.apiUrl}/restablecer-password`, payload).subscribe({
      next: (res) => {
        this.mostrarToast(res.mensaje || '¡Contraseña actualizada con éxito!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.mensaje || 'Código inválido o expirado.';
        this.mostrarToast(msg);
      }
    });
  }

  async mostrarToast(msj: string) {
    const toast = await this.toastCtrl.create({
      message: msj,
      duration: 3000,
      position: 'bottom'
    });
    toast.present();
  }
}