import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppsComponent } from './apps/apps.component';

const routes: Routes = [


{ path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },

{ path: 'simulators', loadChildren: () => import('./simulators/simulators.module').then(m => m.SimulatorsModule) },

{ path: 'apps', component: AppsComponent }
]


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
