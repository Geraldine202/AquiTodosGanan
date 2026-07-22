import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AlumnoService } from 'src/app/services/alumno';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class HeaderComponent implements OnInit {

  usuarioLogueado: any = null;

  constructor(
    private alumnoService: AlumnoService,
    private router: Router
  ) {}

  ngOnInit() {
    // Se suscribe para escuchar en tiempo real cuando alguien inicia/cierra sesión
    this.alumnoService.usuario$.subscribe(usuario => {
      this.usuarioLogueado = usuario;
    });
  }

  cerrarSesion() {
    this.alumnoService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}