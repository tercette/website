import { MaterialModule } from './../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SimulatorsRoutingModule } from './simulators-routing.module';
import { SimulatorsComponent } from './simulators.component';
import { HashLocationStrategy, LocationStrategy } from '@angular/common'; //fixed the reload crashes on the webbrowser online


@NgModule({
  declarations: [
    SimulatorsComponent
  ],
  imports: [
    CommonModule,
    SimulatorsRoutingModule,
    MaterialModule
  ],
  providers: [{provide: LocationStrategy, useClass: HashLocationStrategy}] //fixed the reload crashes on the webbrowser online
})
export class SimulatorsModule { }
