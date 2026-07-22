import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlumnoService } from 'src/app/services/alumno'; // Revisa que la ruta coincida con tu proyecto

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  nombreSistema: string = 'Sistema de Gestión Académica';
  usuarioLogueado: any = null;

  constructor(
    private alumnoService: AlumnoService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargarUsuario();
  }

  // 💡 Ciclo de vida de Ionic: Se dispara CADA VEZ que la vista vuelve a estar activa
  ionViewWillEnter() {
    this.cargarUsuario();
  }

  // Carga los datos guardados en la sesión
  cargarUsuario() {
    this.usuarioLogueado = this.alumnoService.obtenerUsuarioSesion();
  }

  // Método para cerrar la sesión actual
  cerrarSesion() {
    this.alumnoService.cerrarSesion();
    this.usuarioLogueado = null; // Limpia la variable local
    this.router.navigate(['/login']); // Redirige al login
  }
}