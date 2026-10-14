import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AlumnoService } from 'src/app/services/alumno';
import { Clima } from 'src/app/services/clima';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class HeaderComponent implements OnInit {

  usuarioLogueado: any = null;

  // Variables para el clima dinámico
  temperatura: string = '--';
  iconoClima: string = 'partly-sunny-outline';
  cargandoClima: boolean = true;

  constructor(
    private alumnoService: AlumnoService,
    private climaService: Clima,
    public router: Router 
  ) {}

  ngOnInit() {
    // Escuchar cambios de sesión del usuario en tiempo real
    this.alumnoService.usuario$.subscribe(usuario => {
      this.usuarioLogueado = usuario;
    });

    // Cargar el clima actual de Puente Alto
    this.obtenerClimaHeader();
  }

  obtenerClimaHeader() {
    // Coordenadas de Puente Alto: -33.6117, -70.5758
    this.climaService.obtenerClimaActual(-33.6117, -70.5758).subscribe({
      next: (data) => {
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          this.temperatura = `${temp}°C`;
          this.iconoClima = this.mapearIconoClima(data.current_weather.weathercode);
        }
        this.cargandoClima = false;
      },
      error: (err) => {
        console.error('Error al obtener el clima:', err);
        this.temperatura = '18°C'; // Valor de respaldo si falla la red
        this.cargandoClima = false;
      }
    });
  }

  /**
   * Mapea el código meteorológico WMO a un ícono de Ionic
   */
  private mapearIconoClima(code: number): string {
    if (code === 0) return 'sunny-outline';
    if (code >= 1 && code <= 3) return 'partly-sunny-outline';
    if (code >= 45 && code <= 48) return 'cloudy-outline';
    if (code >= 51 && code <= 67) return 'rainy-outline';
    if (code >= 80 && code <= 82) return 'thunderstorm-outline';
    return 'partly-sunny-outline';
  }

  cerrarSesion() {
    this.alumnoService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}