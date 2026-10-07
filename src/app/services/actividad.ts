import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


// ==========================================
// INTERFACES Y MODELOS (INSCRITOS / ASISTENTES)
// ==========================================

/** Estudiante individual para el registro o consulta de asistencia */
export interface EstudianteAsistencia {
  rut_usuario: string;
  presente: boolean;
}

/** Interfaz para un estudiante inscrito en una actividad (Resumen simple) */
export interface EstudianteInscrito {
  rut: string;
  nombre: string;
  asistio: boolean;
}

/** Respuesta del endpoint con el conteo y la lista de estudiantes inscritos */
export interface ResumenListaInscritos {
  id_actividad: number;
  nombre_actividad: string;
  total_inscritos: number;
  total_asistentes: number;
  estudiantes: EstudianteInscrito[];
}

/** Payload genérico para la confirmación masiva de asistencia */
export interface AsistenciaPayload {
  estudiantes?: EstudianteAsistencia[];
  asistencia?: EstudianteAsistencia[];
}

// ==========================================
// INTERFACES Y MODELOS (ACTIVIDADES)
// ==========================================

/** Respuesta del endpoint para el conteo de actividades de un usuario */
export interface ConteoActividades {
  rut_usuario: string;
  total_actividades: number;
}

/** Payload necesario para Crear o Actualizar una Actividad */
export interface ActividadPayload {
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  rut_usuario: string;
  id_tipo_actividad: number;
  id_estado_actividad?: number; // FastAPI asigna 1 por defecto al crear
  id_sede: number;
  fecha: string;        // Formato YYYY-MM-DD
  hora_inicio: string;  // Formato HH:mm:ss
  hora_termino: string; // Formato HH:mm:ss
  puntos: number;
  cupos: number;
  lugar: string;
  requisito?: string;
  img_actv?: string;
}

/** Respuesta completa de Actividad enviada por la API (con relaciones) */
export interface ActividadCompleta {
  id_actividad: number;
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  fecha: string;
  hora_inicio: string;
  hora_termino: string;
  id_tipo_actividad: number;
  id_estado_actividad: number;
  id_sede: number;
  rut_usuario: string;
  img_actv?: string;
  tipo_actividad?: { descripcion: string };
  estado_actividad?: { descripcion: string };
  sede?: { descripcion: string };
  usuario?: { nombre_completo: string; correo: string };
  puntaje_act?: Array<{ id_puntaje: number; cantidad: number; fecha_vencimiento: string }>;
  cupo_actividad?: Array<{ id_cupo: number; cantidad: number }>;
  lugar_actividad?: Array<{ id_lugar_actividad: number; descripcion: string }>;
  requisito_participacion?: Array<{ id_requisito: number; descripcion: string }>;
  calendario?: Array<{ id_calendario: number; fecha: string; hora: string; lugar: string }>;
}

// ==========================================
// INTERFACES Y MODELOS (PREMIOS)
// ==========================================

/** Payload necesario para Crear o Actualizar un Premio */
export interface PremioPayload {
  descripcion: string;
  valor?: number;
  puntos_requeridos: number;
  id_categoria: number;
  rut_usuario: string;
  id_sede: number;
  estado_visibilidad?: boolean;
  imagen?: string;
  stock?: number;
}

/** Respuesta completa de Premio enviada por la API (con relaciones) */
export interface PremioCompleto {
  id_premio: number;
  descripcion: string;
  valor: number;
  puntos_requeridos: number;
  id_categoria: number;
  rut_usuario: string;
  id_sede: number;
  estado_visibilidad: boolean;
  imagen?: string;
  categoria_premio?: { id_categoria?: number; descripcion: string };
  sede?: { id_sede?: number; descripcion: string };
  usuario?: { nombre_completo: string; correo: string };
  stock_sede?: Array<{ id_stock: number; cantidad: number; id_sede: number }>;
}

// ==========================================
// INTERFACES DE CATÁLOGOS Y USUARIOS
// ==========================================

export interface CatalogoItem {
  id_tipo_actividad?: number;
  id_estado_actividad?: number;
  id_sede?: number;
  descripcion: string;
}

export interface CategoriaPremio {
  id_categoria: number;
  descripcion: string;
}

export interface Docente {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario?: number;
}

export interface Consejero {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario?: number;
}
export interface SolicitudCanje {
  id_canje: number;
  rut_usuario: string;
  costo_puntaje: number;
  fecha_solicitud: string;
  id_estado_canje: number;

  // Propiedades calculadas en el frontend
  nombre_sede_alumno?: string;
  stock_sede_alumno?: number;

  // Objeto Usuario
  usuario?: {
    rut_usuario: string;
    nombre_completo: string;
    id_sede: number;
    sede?: {
      id_sede: number;
      descripcion: string;
    } | Array<{ id_sede: number; descripcion: string }>;
  };

  // Objeto Premio (se agrega imagen opcional)
  premio?: {
    id_premio: number;
    descripcion: string;
    puntos_requeridos: number;
    imagen?: string; // <--- Se agrega esta propiedad
    stock_sede?: Array<{
      id_stock: number;
      cantidad: number;
      id_sede: number;
    }>;
  };

  // Objeto Estado Canje
  estado_canje?: {
    id_estado_canje: number;
    descripcion: string;
  };

  // Objeto Retiro Premio (se agrega esta propiedad)
  retiro_premio?: { // <--- Se agrega este objeto opcional
    id_retiro?: number;
    fecha_limite?: string;
    retirado?: boolean;
    id_canje?: number;
  };
}
@Injectable({
  providedIn: 'root',
})
export class ActividadService {

  private apiUrl: string = 'http://localhost:8000';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ==========================================
  // ARCHIVOS / ALMACENAMIENTO DE IMÁGENES
  // ==========================================

  /** Sube una imagen al backend (FastAPI) especificando el bucket */
  subirImagen(
    file: File, 
    bucket: 'actividad' | 'premio' | 'premios' | string = 'actividad'
  ): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    return this.http.post<{ url: string; filename: string }>(
      `${this.apiUrl}/upload-imagen`,
      formData
    );
  }

  // ==========================================
  // CATÁLOGOS COMPARTIDOS
  // ==========================================

  getDocentes(): Observable<Docente[]> {
    return this.http.get<Docente[]>(`${this.apiUrl}/docentes`);
  }

  getConsejeros(): Observable<Consejero[]> {
    return this.http.get<Consejero[]>(`${this.apiUrl}/consejeros`);
  }

  getTiposActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/tipos-actividad`);
  }

  getEstadosActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/estados-actividad`);
  }

  getCategoriasPremio(): Observable<CategoriaPremio[]> {
    return this.http.get<CategoriaPremio[]>(`${this.apiUrl}/categorias-premio`);
  }

  getSedes(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/sedes`);
  }

  // ==========================================
  // CRUD DE ACTIVIDADES Y ASISTENCIAS
  // ==========================================

  getActividades(): Observable<ActividadCompleta[]> {
    return this.http.get<ActividadCompleta[]>(`${this.apiUrl}/actividades`);
  }

  getConteoActividadesPorUsuario(rutUsuario: string): Observable<ConteoActividades> {
    return this.http.get<ConteoActividades>(`${this.apiUrl}/actividades/conteo/usuario/${rutUsuario}`);
  }

  getActividadesPorUsuario(rutUsuario: string): Observable<ActividadCompleta[]> {
    return this.http.get<ActividadCompleta[]>(`${this.apiUrl}/actividades/usuario/${rutUsuario}`);
  }

  getActividadPorId(id: number): Observable<ActividadCompleta> {
    return this.http.get<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`);
  }

  crearActividad(actividad: ActividadPayload): Observable<ActividadCompleta> {
    return this.http.post<ActividadCompleta>(`${this.apiUrl}/actividades`, actividad, this.httpOptions);
  }

  actualizarActividad(id: number, actividad: Partial<ActividadPayload>): Observable<ActividadCompleta> {
    return this.http.put<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`, actividad, this.httpOptions);
  }

  eliminarActividad(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/actividades/${id}`);
  }

  /** Obtiene la lista completa de inscritos y conteo de asistentes */
  getEstudiantesInscritos(idActividad: number): Observable<ResumenListaInscritos> {
    return this.http.get<ResumenListaInscritos>(`${this.apiUrl}/actividades/${idActividad}/lista-inscritos`);
  }

  getInscritosActividad(idActividad: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/actividades/${idActividad}/inscritos`);
  }

  /**
   * Guarda o actualiza la lista de asistencia en lote.
   * El backend procesará `presente: true` y disparará la consolidación de puntos 
   * en `puntaje_total` solo para actividades que ya hayan cumplido fecha/hora_termino.
   */
  registrarAsistenciaMasiva(
    idActividad: number, 
    estudiantes: EstudianteAsistencia[]
  ): Observable<{ mensaje: string; actualizados: number }> {
    return this.http.post<{ mensaje: string; actualizados: number }>(
      `${this.apiUrl}/actividades/${idActividad}/asistencia`, 
      { estudiantes },
      this.httpOptions
    );
  }

  // ==========================================
  // CRUD DE PREMIOS Y CANJES
  // ==========================================

  getPremios(): Observable<PremioCompleto[]> {
    return this.http.get<PremioCompleto[]>(`${this.apiUrl}/premios`);
  }

  getSolicitudesCanje(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitudes-canje`);
  }

  getPremioPorId(id: number): Observable<PremioCompleto> {
    return this.http.get<PremioCompleto>(`${this.apiUrl}/premios/${id}`);
  }

  crearPremio(premio: PremioPayload): Observable<PremioCompleto> {
    return this.http.post<PremioCompleto>(`${this.apiUrl}/premios`, premio, this.httpOptions);
  }

  actualizarPremio(id: number, premio: Partial<PremioPayload>): Observable<PremioCompleto> {
    return this.http.put<PremioCompleto>(`${this.apiUrl}/premios/${id}`, premio, this.httpOptions);
  }

  eliminarPremio(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/premios/${id}`);
  }
  // ==========================================
// MÉTODOS PARA EL PANEL ADMINISTRATIVO
// ==========================================

/**
 * Obtiene el listado completo de solicitudes de canje
 */
// En actividad.service.ts
obtenerCanjes(): Observable<SolicitudCanje[]> {
  return this.http.get<SolicitudCanje[]>(`${this.apiUrl}/premios/solicitudes`);
}
/**
 * Aprueba una solicitud de canje (Aplica el descuento real de puntos y stock)
 */
aprobarCanje(idCanje: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/premios/aprobar/${idCanje}`, {}, this.httpOptions);
}

/**
 * Confirma la entrega presencial en DAE
 */
marcarComoRetirado(idCanje: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/premios/marcar-retirado/${idCanje}`, {}, this.httpOptions);
}

/**
 * Rechaza una solicitud de canje sin modificar saldo de puntos
 */
cancelarPorStock(idCanje: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/premios/cancelar/${idCanje}`, {}, this.httpOptions);
}
cancelarSolicitudCanje(payload: { rut_alumno: string; id_premio: number }): Observable<any> {
  // Ajusta la URL según la ruta de tu backend FastAPI (ej: POST /solicitud-canje/cancelar o PUT /solicitud-canje/cancelar)
  return this.http.post<any>(`${this.apiUrl}/solicitud-canje/cancelar`, payload);
}

// Iniciar actividad (Poner en curso)
iniciarActividad(idActividad: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/actividades/${idActividad}/iniciar`, {});
}

// Terminar actividad (Finalizar y otorgar puntos)
terminarActividad(idActividad: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/actividades/${idActividad}/terminar`, {});
}

// Reprogramar actividad
reprogramarActividad(idActividad: number, datos: { fecha: string; hora_inicio: string; hora_termino: string }): Observable<any> {
  return this.http.put(`${this.apiUrl}/actividades/${idActividad}/reprogramar`, datos);
}
}