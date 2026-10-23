import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController, LoadingController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { ActividadService, SolicitudCanje, InfoNivelUsuario } from 'src/app/services/actividad';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-admin-canjes',
  templateUrl: './admin-canjes.page.html',
  styleUrls: ['./admin-canjes.page.scss'],
  standalone: false
})
export class AdminCanjesPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  solicitudes: SolicitudCanje[] = [];
  solicitudesFiltradas: SolicitudCanje[] = [];
  
  filtroEstado: string = 'todos';
  busqueda: string = '';
  cargando: boolean = false;

  private autoRefreshInterval: any = null;
  // Cache persistente de niveles por RUT para erradicar el parpadeo visual
  private mapaNivelesCache: { [rut: string]: InfoNivelUsuario } = {};

  constructor(
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() { }

  ionViewWillEnter() {
    this.cargarSolicitudes();
    this.iniciarAutoRefresh();
  }

  ionViewWillLeave() {
    this.detenerAutoRefresh();
  }

  ngOnDestroy() {
    this.detenerAutoRefresh();
  }

  private limpiarRut(rut: any): string {
    if (!rut) return '';
    return String(rut).replace(/[^0-9kK]/g, '').trim();
  }

  private iniciarAutoRefresh() {
    this.detenerAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      this.cargarSolicitudes(null, true);
    }, 20000);
  }

  private detenerAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  cargarSolicitudes(event?: any, esSilencioso: boolean = false) {
    if (!esSilencioso && !event && this.solicitudes.length === 0) {
      this.cargando = true;
    }

    this.actividadService.obtenerCanjes().subscribe({
      next: (data: any[]) => {
        const listaCanjes = data || [];

        if (listaCanjes.length === 0) {
          this.solicitudes = [];
          this.aplicarFiltros();
          this.cargando = false;
          if (event) event.target.complete();
          return;
        }

        // 1. MAPEADO CON NIVELES PERSISTENTES EN CACHÉ (Evita salta/parpadeo a Bronce)
        this.solicitudes = listaCanjes.map((item) => this.procesarItemCanje(item));
        this.aplicarFiltros();
        this.cargando = false;
        if (event) event.target.complete();

        // 2. OBTENER RUTS ÚNICOS
        const rutsUnicos = Array.from(new Set(
          listaCanjes
            .map(item => {
              const usr = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
              return this.limpiarRut(item.rut_usuario || usr?.rut_usuario || usr?.rut);
            })
            .filter(rut => !!rut)
        ));

        if (rutsUnicos.length === 0) return;

        // 3. CONSULTAR NIVELES DE FONDO EN PARALELO
        const peticionesNivel = rutsUnicos.map(rut => 
          this.actividadService.getNivelUsuario(rut).pipe(
            catchError(() => of(null))
          )
        );

        forkJoin(peticionesNivel).subscribe({
          next: (nivelesRes: any[]) => {
            let hubocambios = false;

            rutsUnicos.forEach((rut, idx) => {
              if (nivelesRes[idx]) {
                const infoNueva = nivelesRes[idx];
                const infoAnterior = this.mapaNivelesCache[rut];

                // Verificar si cambió el nivel para actualizar suavemente
                if (!infoAnterior || infoAnterior.id_nivel !== infoNueva.id_nivel) {
                  this.mapaNivelesCache[rut] = infoNueva;
                  hubocambios = true;
                }
              }
            });

            // 4. ACTUALIZACIÓN SILENCIOSA DE UI SOLO SI HUBO CAMBIO REAL DE NIVEL
            if (hubocambios) {
              this.solicitudes = this.solicitudes.map(sol => {
                const rutSol = this.limpiarRut(sol.rut_usuario || sol.usuario?.rut_usuario);
                if (rutSol && this.mapaNivelesCache[rutSol]) {
                  const infoReal = this.mapaNivelesCache[rutSol];
                  const idNivel = Number(infoReal.id_nivel ?? 1);
                  sol.info_nivel_usuario = infoReal;
                  (sol as any).color_nivel_alumno = idNivel === 3 ? 'medium' : idNivel === 2 ? 'warning' : 'tertiary';
                }
                return sol;
              });

              this.aplicarFiltros();
            }
          }
        });
      },
      error: (err) => {
        console.error('[ERROR CARGAR CANJES]:', err);
        if (!esSilencioso) {
          const msg = err.error?.detail || 'Error al cargar las solicitudes de canje';
          this.mostrarToast(msg, 'danger');
        }
        this.cargando = false;
        if (event) event.target.complete();
      }
    });
  }

  private procesarItemCanje(item: any): SolicitudCanje {
    const usr = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
    const idSedeUsuario = usr?.id_sede ? Number(usr.id_sede) : null;

    let nombreSedeUsuario = '';
    if (usr?.sede) {
      const sObj = Array.isArray(usr.sede) ? usr.sede[0] : usr.sede;
      nombreSedeUsuario = sObj?.descripcion || '';
    }

    const rutActual = this.limpiarRut(item.rut_usuario || usr?.rut_usuario || usr?.rut);

    // BÚSQUEDA PRIORITARIA: Usamos primero la caché persistente para mantener el nivel real conocido
    const infoNivelAlumno: InfoNivelUsuario = 
      this.mapaNivelesCache[rutActual] ||
      item.info_nivel_usuario || 
      {
        id_nivel: 1,
        nombre_nivel: 'Bronce',
        total_actividades: 0,
        faltantes_siguiente: 4
      };

    // Almacenar en la caché si no existía
    if (rutActual && item.info_nivel_usuario) {
      this.mapaNivelesCache[rutActual] = item.info_nivel_usuario;
    }

    const idNivelAlumno = Number(infoNivelAlumno.id_nivel ?? 1);
    const colorNivelAlumno = idNivelAlumno === 3 ? 'medium' : idNivelAlumno === 2 ? 'warning' : 'tertiary';

    const premioObj = Array.isArray(item.premio) ? item.premio[0] : item.premio;
    const nivelObj = Array.isArray(premioObj?.nivel) ? premioObj.nivel[0] : premioObj?.nivel;
    
    const idNivelPremio = premioObj?.id_nivel ? Number(premioObj.id_nivel) : (nivelObj?.id_nivel ? Number(nivelObj.id_nivel) : 1);
    const nombreNivelPremio = nivelObj?.nombre_nivel || (idNivelPremio === 3 ? 'Platino' : (idNivelPremio === 2 ? 'Oro' : 'Bronce'));

    const catObj = Array.isArray(premioObj?.categoria_premio) ? premioObj.categoria_premio[0] : premioObj?.categoria_premio;

    let stocks: any[] = premioObj?.stock_sede || [];
    if (stocks && !Array.isArray(stocks)) {
      stocks = [stocks];
    }

    let stockEncontrado = 0;
    if (Array.isArray(stocks) && stocks.length > 0) {
      let registro = stocks.find((s: any) => Number(s.id_sede) === idSedeUsuario);

      if (!registro && premioObj?.id_sede && Number(premioObj.id_sede) === idSedeUsuario) {
        registro = stocks.find((s: any) => Number(s.id_sede) === Number(premioObj.id_sede));
      }

      if (!registro && stocks.length === 1) {
        registro = stocks[0];
      }

      if (registro) {
        stockEncontrado = Number(registro.cantidad);
      }
    }

    return {
      ...item,
      usuario: usr,
      info_nivel_usuario: infoNivelAlumno,
      color_nivel_alumno: colorNivelAlumno,
      premio: {
        ...premioObj,
        id_nivel: idNivelPremio,
        nombre_nivel: nombreNivelPremio,
        nivel: nivelObj || { id_nivel: idNivelPremio, nombre_nivel: nombreNivelPremio, min_actividades: 0 },
        categoria_premio: catObj
      },
      nombre_sede_alumno: nombreSedeUsuario || 'Puente Alto',
      stock_sede_alumno: stockEncontrado
    };
  }

  aplicarFiltros() {
    this.solicitudesFiltradas = this.solicitudes.filter(item => {
      const cumpleEstado = this.filtroEstado === 'todos' || item.id_estado_canje === Number(this.filtroEstado);
      const termino = this.busqueda.toLowerCase().trim();
      
      const nombreAlumno = item.usuario?.nombre_completo ? item.usuario.nombre_completo.toLowerCase() : '';
      const descripcionPremio = item.premio?.descripcion ? item.premio.descripcion.toLowerCase() : '';
      const nombreNivelPremio = item.premio?.nombre_nivel ? item.premio.nombre_nivel.toLowerCase() : '';
      const nombreNivelAlumno = item.info_nivel_usuario?.nombre_nivel ? item.info_nivel_usuario.nombre_nivel.toLowerCase() : '';
      const rut = item.rut_usuario ? item.rut_usuario.toLowerCase() : '';

      return cumpleEstado && (
        termino === '' || 
        rut.includes(termino) || 
        nombreAlumno.includes(termino) || 
        descripcionPremio.includes(termino) ||
        nombreNivelPremio.includes(termino) ||
        nombreNivelAlumno.includes(termino)
      );
    });
  }

  async aprobarCanje(item: SolicitudCanje) {
    const nivelPremio = item.premio?.nombre_nivel || 'Bronce';
    const alert = await this.alertController.create({
      header: 'Aprobar Solicitud',
      message: `¿Confirmas la aprobación para "${item.premio?.descripcion || 'el premio'}" (Nivel ${nivelPremio})? En este momento se re-validará el nivel del alumno, se descontarán ${item.costo_puntaje} pts y 1 unidad del stock de la sede.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Aprobar',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.aprobarCanje(item.id_canje),
              item,
              2
            );
          }
        }
      ]
    });
    await alert.present();
  }

  async marcarComoRetirado(item: SolicitudCanje) {
    const alert = await this.alertController.create({
      header: 'Confirmar Entrega Presencial',
      message: `¿El estudiante ${item.usuario?.nombre_completo || item.rut_usuario} ha retirado su premio "${item.premio?.descripcion || ''}" en DAE presencialmente? Se enviará un correo de confirmación de entrega al estudiante.`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: 'Confirmar Entrega',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.marcarComoRetirado(item.id_canje),
              item,
              3
            );
          }
        }
      ]
    });
    await alert.present();
  }

  async cancelarPorStock(item: SolicitudCanje) {
    const esSolicitudPendiente = item.id_estado_canje === 1;
    
    const mensaje = esSolicitudPendiente
      ? `¿Rechazar esta solicitud? Como aún no se han descontado puntos, la solicitud cambiará a estado Rechazado y se notificará por correo al estudiante.`
      : `¿Cancelar este canje aprobado? Se devolverán ${item.costo_puntaje} pts al estudiante, se reincorporará la unidad al stock de la sede y se enviará la notificación por correo.`;

    const alert = await this.alertController.create({
      header: esSolicitudPendiente ? 'Rechazar Solicitud' : 'Cancelar Canje Aprobado',
      message: mensaje,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: esSolicitudPendiente ? 'Rechazar Solicitud' : 'Cancelar y Reembolsar',
          role: 'destructive',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.cancelarPorStock(item.id_canje),
              item,
              4
            );
          }
        }
      ]
    });
    await alert.present();
  }

  private async ejecutarAccion(peticion$: any, itemAfectado: SolicitudCanje, nuevoEstadoId: number) {
    const loader = await this.loadingController.create({ message: 'Procesando...' });
    await loader.present();

    peticion$.subscribe({
      next: (res: any) => {
        loader.dismiss();
        
        itemAfectado.id_estado_canje = nuevoEstadoId;

        if (nuevoEstadoId === 2 && itemAfectado.stock_sede_alumno !== undefined && itemAfectado.stock_sede_alumno > 0) {
          itemAfectado.stock_sede_alumno -= 1;
        }

        if (nuevoEstadoId === 4 && itemAfectado.stock_sede_alumno !== undefined) {
          itemAfectado.stock_sede_alumno += 1;
        }

        this.aplicarFiltros();
        this.mostrarToast(res.message || 'Operación realizada con éxito', 'success');
        this.cargarSolicitudes(null, true);
      },
      error: (err: any) => {
        loader.dismiss();
        const errorMsg = err.error?.detail || 'Ocurrió un error al procesar la solicitud';
        this.mostrarToast(errorMsg, 'danger');
      }
    });
  }

  private async mostrarToast(mensaje: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}