import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HotTableModule } from '@handsontable/angular';


@NgModule({
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatProgressBarModule,
    HotTableModule
  ]
})
export class PagesModule { }
