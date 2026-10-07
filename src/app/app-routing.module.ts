import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'admin-alumnos',
    loadChildren: () => import('./pages/admin-alumnos/admin-alumnos.module').then( m => m.AdminAlumnosPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin-actividades',
    loadChildren: () => import('./pages/admin-actividades/admin-actividades.module').then( m => m.AdminActividadesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'recuperar',
    loadChildren: () => import('./pages/recuperar/recuperar.module').then( m => m.RecuperarPageModule)
  },
  {
    path: 'admin-premios',
    loadChildren: () => import('./pages/admin-premios/admin-premios.module').then( m => m.AdminPremiosPageModule),
    canActivate: [authGuard]
  },  {
    path: 'admin-canjes',
    loadChildren: () => import('./pages/admin-canjes/admin-canjes.module').then( m => m.AdminCanjesPageModule)
  },
  {
    path: 'reportes',
    loadChildren: () => import('./pages/reportes/reportes.module').then( m => m.ReportesPageModule)
  }





];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
