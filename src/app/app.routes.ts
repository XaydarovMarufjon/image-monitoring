import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ScanDetailComponent } from './pages/scan-detail/scan-detail.component';
import { ScanHistoryComponent } from './pages/scan-history/scan-history.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'history', component: ScanHistoryComponent },
  { path: 'scan/:id', component: ScanDetailComponent },
  { path: '**', redirectTo: '' }
];
