import { Component, OnInit } from '@angular/core';
import { AlumnoService } from 'src/app/services/alumno';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  totalAlumnos: number = 0;
  actividadesActivas: number = 0;
  premiosCatalogo: number = 0;
  canjesPendientes: number = 0;

  solicitudesRecientes: any[] = [];

  constructor(
    private alumnoService: AlumnoService,
    private actividadService: ActividadService
  ) {}

  ngOnInit() {
    this.cargarDashboard();
  }

  ionViewWillEnter() {
    this.cargarDashboard();
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
    this.actividadService.getPremios().subscribe({
      next: (res: any) => {
        const premios = this.extraerArreglo(res);
        this.premiosCatalogo = premios.length;
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