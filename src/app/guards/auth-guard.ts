import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AlumnoService } from 'src/app/services/alumno'; 

export const authGuard: CanActivateFn = (route, state) => {
  const alumnoService = inject(AlumnoService);
  const router = inject(Router);

  if (alumnoService.estaLogueado()) {
    return true; // Puede continuar a la ruta solicitada
  } else {
    // No está logueado, lo enviamos al login
    router.navigate(['/login']);
    return false; // Bloquea la navegación original
  }
};