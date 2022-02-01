import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [


{ path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },

{ path: 'simulators', loadChildren: () => import('./simulators/simulators.module').then(m => m.SimulatorsModule) }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
