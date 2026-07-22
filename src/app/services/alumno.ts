import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlumnoService {
  private apiUrl = 'http://localhost:3000/alumnos';
  private authUrl = 'http://localhost:3000/auth'; 

  // 💡 ESTADO REACTIVO DE SESIÓN
  private usuarioSubject = new BehaviorSubject<any>(this.obtenerUsuarioSesion());
  public usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient) { }

  getAlumnos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  addAlumno(alumno: any): Observable<any> {
    return this.http.post(this.apiUrl, alumno);
  }

  editAlumno(rut: string, alumno: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${rut}`, alumno);
  }

  deleteAlumno(rut: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${rut}`);
  }

  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN Y SESIÓN
  // ==========================================

  login(credenciales: any): Observable<any> {
    return this.http.post(`${this.authUrl}/login`, credenciales);
  }

guardarSesion(respuestaLogin: any) {
  if (!respuestaLogin) {
    console.error('La respuesta de login está vacía');
    return;
  }

  // Detectamos si el usuario viene envuelto en .usuario o viene directamente
  const usuario = respuestaLogin.usuario || (respuestaLogin.rut_usuario ? respuestaLogin : null);
  const token = respuestaLogin.token_acceso;

  if (usuario) {
    localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
    
    if (token) {
      localStorage.setItem('tokenAcceso', token);
    }

    this.usuarioSubject.next(usuario);
    console.log('✅ Sesión guardada exitosamente:', usuario);
  } else {
    console.error('Intento de guardar una sesión con datos inválidos:', respuestaLogin);
  }
}

  obtenerUsuarioSesion() {
    const user = localStorage.getItem('usuarioLogueado');

    // 🛑 Blindaje contra "undefined", null o valores vacíos
    if (!user || user === 'undefined' || user === 'null') {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch (error) {
      console.error('Error al parsear el usuario de la sesión:', error);
      this.cerrarSesion(); // Si el JSON está corrupto, limpiamos
      return null;
    }
  }

  estaLogueado(): boolean {
    return this.obtenerUsuarioSesion() !== null;
  }

  cerrarSesion() {
    // Limpiamos todo el almacenamiento local de autenticación
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('tokenAcceso');
    
    // 📢 Notificamos a los suscriptores que ya no hay usuario en sesión
    this.usuarioSubject.next(null);
  }
}