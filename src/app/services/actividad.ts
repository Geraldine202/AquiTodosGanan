import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ==========================================
// INTERFACES Y MODELOS (ACTIVIDADES)
// ==========================================

/** Payload necesario para Crear o Actualizar una Actividad */
export interface ActividadPayload {
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  rut_usuario: string;
  id_tipo_actividad: number;
  id_estado_actividad?: number; // Opcional (FastAPI asigna 1 por defecto al crear)
  id_sede: number;
  fecha_inicio: string;  // Formato ISO string (ej: "2026-05-10T14:30:00")
  fecha_termino: string; // Formato ISO string
  puntos: number;
  cupos: number;
  lugar: string;
  requisito?: string;
  img_actv?: string;     // URL pública devuelta por el backend
}

/** Respuesta completa de Actividad enviada por la API (con relaciones) */
export interface ActividadCompleta {
  id_actividad: number;
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  fecha_inicio: string;
  fecha_termino: string;
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

/** Interfaz para ítems de catálogos simples (Sedes, Tipos, Estados) */
export interface CatalogoItem {
  id_tipo_actividad?: number;
  id_estado_actividad?: number;
  id_sede?: number;
  descripcion: string;
}

/** Interfaz para categorías de premio */
export interface CategoriaPremio {
  id_categoria: number;
  descripcion: string;
}

/** Interfaz para el catálogo de Docentes/Usuarios */
export interface Docente {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario?: number;
}


@Injectable({
  providedIn: 'root',
})
export class ActividadService {

  // URL base de tu backend FastAPI (se recomienda mover a environment.ts)
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

  /**
   * Sube una imagen al backend (FastAPI) especifando el bucket ('actividad' o 'premio').
   * Retorna la URL pública generada.
   */
// En src/app/services/actividad.service.ts (o la ruta donde tengas tu servicio)

subirImagen(
  file: File, 
  bucket: 'actividad' | 'premio' | 'premios' | string = 'actividad'
): Observable<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket); // <-- Adjuntar al cuerpo de la petición

  return this.http.post<{ url: string; filename: string }>(
    `${this.apiUrl}/upload-imagen`, // <-- Sin query param en la URL
    formData
  );
}

  // ==========================================
  // CATÁLOGOS COMPARTIDOS
  // ==========================================

  /** Obtiene docentes responsables (id_tipo_usuario = 3) */
  getDocentes(): Observable<Docente[]> {
    return this.http.get<Docente[]>(`${this.apiUrl}/docentes`);
  }

  /** Obtiene tipos de actividad (ej: Deportiva, Académica, etc.) */
  getTiposActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/tipos-actividad`);
  }

  /** Obtiene estados de la actividad (ej: Programada, Finalizada) */
  getEstadosActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/estados-actividad`);
  }

  /** Obtiene las categorías de premios */
  getCategoriasPremio(): Observable<CategoriaPremio[]> {
    return this.http.get<CategoriaPremio[]>(`${this.apiUrl}/categorias-premio`);
  }

  /** Obtiene las sedes disponibles */
  getSedes(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/sedes`);
  }

  // ==========================================
  // CRUD DE ACTIVIDADES
  // ==========================================

  /** Obtiene el listado completo de actividades con sus datos anidados */
  getActividades(): Observable<ActividadCompleta[]> {
    return this.http.get<ActividadCompleta[]>(`${this.apiUrl}/actividades`);
  }

  /** Obtiene una actividad específica según su ID */
  getActividadPorId(id: number): Observable<ActividadCompleta> {
    return this.http.get<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`);
  }

  /** Registra una nueva actividad */
  crearActividad(actividad: ActividadPayload): Observable<ActividadCompleta> {
    return this.http.post<ActividadCompleta>(`${this.apiUrl}/actividades`, actividad, this.httpOptions);
  }

  /** Actualiza una actividad existente */
  actualizarActividad(id: number, actividad: Partial<ActividadPayload>): Observable<ActividadCompleta> {
    return this.http.put<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`, actividad, this.httpOptions);
  }

  /** Elimina una actividad y limpia sus dependencias */
  eliminarActividad(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/actividades/${id}`);
  }

  // ==========================================
  // CRUD DE PREMIOS
  // ==========================================

  /** Obtiene el listado completo de premios con sus datos anidados */
  getPremios(): Observable<PremioCompleto[]> {
    return this.http.get<PremioCompleto[]>(`${this.apiUrl}/premios`);
  }
  getSolicitudesCanje(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitudes-canje`);
  }
  /** Obtiene un premio específico según su ID */
  getPremioPorId(id: number): Observable<PremioCompleto> {
    return this.http.get<PremioCompleto>(`${this.apiUrl}/premios/${id}`);
  }

  /** Registra un nuevo premio y su stock inicial en la sede correspondiente */
  crearPremio(premio: PremioPayload): Observable<PremioCompleto> {
    return this.http.post<PremioCompleto>(`${this.apiUrl}/premios`, premio, this.httpOptions);
  }

  /** Actualiza un premio existente y/o su stock */
  actualizarPremio(id: number, premio: Partial<PremioPayload>): Observable<PremioCompleto> {
    return this.http.put<PremioCompleto>(`${this.apiUrl}/premios/${id}`, premio, this.httpOptions);
  }

  /** Elimina un premio, su registro de stock e imagen asociada */
  eliminarPremio(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/premios/${id}`);
  }
}