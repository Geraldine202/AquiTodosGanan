import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { IonicModule, MenuController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AlumnoService } from 'src/app/services/alumno';
import { ActividadService } from 'src/app/services/actividad';
import { Clima } from 'src/app/services/clima';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class HeaderComponent implements OnInit, OnDestroy {

  usuarioLogueado: any = null;
  nombreMostrar: string = 'Usuario';

  // Clima dinámico
  temperatura: string = '--';
  iconoClima: string = 'partly-sunny-outline';
  cargandoClima: boolean = true;

  private subUsuario!: Subscription;
  private subRouter!: Subscription;

  constructor(
    private alumnoService: AlumnoService,
    private actividadService: ActividadService,
    private climaService: Clima,
    public router: Router,
    private cdRef: ChangeDetectorRef,
    private menuCtrl: MenuController
  ) {}

  ngOnInit() {
    // 1. Verificar inmediatamente la ruta actual
    this.validarRutaYSincronizar(this.router.url);

    // 2. Escuchar cambios de sesión en tiempo real desde AlumnoService
    this.subUsuario = this.alumnoService.usuario$.subscribe(usuario => {
      if (this.esRutaLogin(this.router.url)) {
        this.limpiarEstadoUsuario();
      } else if (usuario) {
        this.procesarUsuario(usuario);
      } else {
        this.obtenerUsuarioDesdeSesion();
      }
    });

    // 3. Sincronizar en cada cambio de navegación
    this.subRouter = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const urlActual = event.urlAfterRedirects || event.url;
      this.validarRutaYSincronizar(urlActual);
    });

    // 4. Clima Puente Alto
    this.obtenerClimaHeader();
  }

  ngOnDestroy() {
    if (this.subUsuario) this.subUsuario.unsubscribe();
    if (this.subRouter) this.subRouter.unsubscribe();
  }

  /**
   * Identifica de forma exacta únicamente las páginas de Formulario de Login
   */
  private esRutaLogin(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase().trim();
    
    // Solo debe dar true para los formularios de login
    return cleanUrl === '/login' || 
           cleanUrl === '/admin-login' || 
           cleanUrl.endsWith('/login') ||
           cleanUrl.endsWith('/admin-login');
  }

  private validarRutaYSincronizar(url: string) {
    if (this.esRutaLogin(url)) {
      this.limpiarEstadoUsuario();
    } else {
      this.obtenerUsuarioDesdeSesion();
    }
  }

  limpiarEstadoUsuario() {
    this.usuarioLogueado = null;
    this.nombreMostrar = 'Usuario';
    this.menuCtrl.enable(false);
    this.cdRef.detectChanges();
  }

  estaLogueado(): boolean {
    return !!this.usuarioLogueado && !this.esRutaLogin(this.router.url);
  }

  /**
   * Revisa sessionStorage para obtener al usuario activo de la app
   */
  obtenerUsuarioDesdeSesion() {
    if (this.esRutaLogin(this.router.url)) {
      this.limpiarEstadoUsuario();
      return;
    }

    const possibleKeys = [
      'usuarioLogueado', 'usuario', 'user', 
      'currentUser', 'admin', 'usuario_admin', 'session'
    ];

    let sessionData: any = null;

    for (const key of possibleKeys) {
      const val = sessionStorage.getItem(key);
      if (val) {
        sessionData = val;
        break;
      }
    }

    if (!sessionData) {
      this.limpiarEstadoUsuario();
      return;
    }

    try {
      const objeto = typeof sessionData === 'string' && sessionData.trim().startsWith('{')
        ? JSON.parse(sessionData)
        : sessionData;

      if (typeof objeto === 'object' && objeto !== null) {
        this.procesarUsuario(objeto);
      } else {
        this.consultarBDyActualizar(sessionData);
      }
    } catch (e) {
      console.error('Error parseando datos de sesión en Header:', e);
      this.limpiarEstadoUsuario();
    }
  }

  private consultarBDyActualizar(identificador: string) {
    const servicioAny: any = this.alumnoService;
    if (typeof servicioAny.getUsuarioSesion === 'function') {
      servicioAny.getUsuarioSesion(identificador).subscribe({
        next: (userBD: any) => {
          if (userBD && !this.esRutaLogin(this.router.url)) {
            this.procesarUsuario(userBD);
            sessionStorage.setItem('usuarioLogueado', JSON.stringify(userBD));
          }
        },
        error: () => {}
      });
    }
  }

  procesarUsuario(data: any) {
    if (!data || this.esRutaLogin(this.router.url)) {
      this.limpiarEstadoUsuario();
      return;
    }

    this.usuarioLogueado = data;
    this.menuCtrl.enable(true);

    const subObj = data.alumno || data.docente || data.datos_alumno || data.datos_docente || data.persona || {};

    let rawNombre: string = data.nombre_completo || 
                            data.nombre || 
                            subObj.nombre_completo || 
                            subObj.nombre || 
                            data.nombres ||
                            subObj.nombres ||
                            '';

    rawNombre = rawNombre.trim();

    const rolesProhibidos = ['docente', 'estudiante', 'administrador', 'consejero de carrera', 'consejero', 'alumno'];

    if (!rawNombre || rolesProhibidos.includes(rawNombre.toLowerCase())) {
      const correo = data.correo || data.email || subObj.correo || '';
      if (correo && correo.includes('@')) {
        this.nombreMostrar = correo.split('@')[0];
      } else {
        this.nombreMostrar = 'Admin';
      }
    } else {
      this.nombreMostrar = rawNombre.split(' ')[0];
    }

    this.cdRef.detectChanges();
  }

  obtenerClimaHeader() {
    this.climaService.obtenerClimaActual(-33.6117, -70.5758).subscribe({
      next: (data) => {
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          this.temperatura = `${temp}°C`;
          this.iconoClima = this.mapearIconoClima(data.current_weather.weathercode);
        }
        this.cargandoClima = false;
        this.cdRef.detectChanges();
      },
      error: () => {
        this.temperatura = '18°C';
        this.cargandoClima = false;
        this.cdRef.detectChanges();
      }
    });
  }

  private mapearIconoClima(code: number): string {
    if (code === 0) return 'sunny-outline';
    if (code >= 1 && code <= 3) return 'partly-sunny-outline';
    if (code >= 45 && code <= 48) return 'cloudy-outline';
    if (code >= 51 && code <= 67) return 'rainy-outline';
    if (code >= 80 && code <= 82) return 'thunderstorm-outline';
    return 'partly-sunny-outline';
  }

  cerrarSesion() {
    this.limpiarEstadoUsuario();
    sessionStorage.clear();
    localStorage.clear();
    this.alumnoService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}