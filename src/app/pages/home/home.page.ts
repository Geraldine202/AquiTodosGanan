import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AlumnoService } from 'src/app/services/alumno';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, ViewWillEnter {

  totalAlumnos: number = 0;
  actividadesActivas: number = 0;
  premiosCatalogo: number = 0;
  canjesPendientes: number = 0;

  solicitudesRecientes: any[] = [];

  constructor(
    private alumnoService: AlumnoService,
    private actividadService: ActividadService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarDashboard();
  }

  /**
   * Ciclo de vida de Ionic que recarga automáticamente los contadores y las 
   * solicitudes pendientes cada vez que vuelves a la vista sin presionar F5
   */
  ionViewWillEnter() {
    this.cargarDashboard();
  }

  /**
   * Redirección directa hacia la pantalla de reportes/solicitudes de canje
   */
  irASolicitudes() {
    this.router.navigate(['/reportes']);
  }

  private extraerArreglo(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.result)) return res.result;
    if (Array.isArray(res.datos)) return res.datos;
    return [];
  }

  cargarDashboard() {
    // 1. Alumnos registrados
    this.alumnoService.getAlumnos().subscribe({
      next: (res: any) => {
        const alumnos = this.extraerArreglo(res);
        this.totalAlumnos = alumnos.length;
      },
      error: (err) => console.error('Error al cargar alumnos:', err)
    });

    // 2. Actividades en curso (id_estado_actividad === 2)
    this.actividadService.getActividades().subscribe({
      next: (res: any) => {
        const actividades = this.extraerArreglo(res);
        const enCurso = actividades.filter(act => Number(act.id_estado_actividad) === 2);
        
        this.actividadesActivas = enCurso.length;
      },
      error: (err) => console.error('Error al cargar actividades:', err)
    });

    // 3. Premios registrados desde ActividadService
// 3. Premios en catálogo visibles (estado_visibilidad === true o 1)
    this.actividadService.getPremios().subscribe({
      next: (res: any) => {
        const premios = this.extraerArreglo(res);

        // Filtrar solo los premios que están marcados como visibles
        const premiosVisibles = premios.filter(p => p.estado_visibilidad === true || Number(p.estado_visibilidad) === 1);

        this.premiosCatalogo = premiosVisibles.length;
      },
      error: (err) => console.error('Error al cargar premios:', err)
    });

    // 4. Canjes pendientes desde ActividadService (id_estado_canje = 1)
    this.actividadService.getSolicitudesCanje().subscribe({
      next: (res: any) => {
        const canjes = this.extraerArreglo(res);
        const pendientes = canjes.filter(c => Number(c.id_estado_canje) === 1);
        
        this.canjesPendientes = pendientes.length;
        this.solicitudesRecientes = pendientes;
      },
      error: (err) => console.error('Error al cargar solicitudes de canje:', err)
    });
  }
}