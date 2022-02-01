import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SimulatorsComponent } from './simulators.component';

const routes: Routes = [{ path: '', component: SimulatorsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SimulatorsRoutingModule { }
