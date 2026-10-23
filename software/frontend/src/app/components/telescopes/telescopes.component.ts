import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Telescope } from '../../interfaces/telescope';
import { FormsModule } from '@angular/forms';
import { TelescopeService } from '../../services/telescope.service';
import { CreateTelescope } from '../../interfaces/create-telescope';
import { Reading } from '../../interfaces/reading';
import { ReadingService } from '../../services/reading.service';
import { finalize, interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-telescopes',
  imports: [
    RouterOutlet,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './telescopes.component.html',
  styleUrl: './telescopes.component.css'
})
export class TelescopesComponent implements OnInit, OnDestroy {
  private readonly requests: Subscription = new Subscription();
  private readonly pendingReadingIds: Set<number> = new Set();
  private readonly readingErrors: Set<number> = new Set();
  isLoading: boolean = true;
  telescopes: Telescope[] = [];
  latestReadings: { [id: number]: Reading | undefined } = {};

  newTelescopeName: string = "";

  constructor(private router: Router, private telescopeService: TelescopeService, private readingService: ReadingService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.loadTelescopes();
    this.requests.add(interval(1000).subscribe(() => this.loadLatestReadings()));
    return;
  }

  ngOnDestroy(): void {
    this.requests.unsubscribe();
  }

  loadTelescopes(): void {
    this.telescopeService.getTelescopes().subscribe({
      next: (telescopes: Telescope[]) => {
        this.telescopes = telescopes;
        this.loadLatestReadings();
        console.log(`Telescopes: ${telescopes}`);
        this.isLoading = false;
      },
      error: (err: Error) => {
        console.error(err);
        this.isLoading = false;
      }
    });
   return;
  }

  loadLatestReadings(): void {
    if (this.requests.closed) return;
    for (const telescope of this.telescopes) {
      const telescopeId: number = telescope.id;
      if (this.pendingReadingIds.has(telescopeId)) continue;
      this.pendingReadingIds.add(telescopeId);
      this.requests.add(this.readingService.getLatestReading(telescopeId).pipe(
        finalize(() => this.pendingReadingIds.delete(telescopeId))
      ).subscribe({
        next: (reading: Reading) => {
          if (!this.telescopes.some((device: Telescope) => device.id === telescopeId)) return;
          if (reading.telescope_id !== telescopeId) {
            this.readingErrors.add(telescopeId);
            return;
          }
          this.latestReadings[telescopeId] = reading;
          this.readingErrors.delete(telescopeId);
        },
        error: () => this.readingErrors.add(telescopeId)
      }));
    }
  }

  getLastActiveAt(telescopeId: number): Date | null {
    const createdAt: string | null | undefined = this.latestReadings[telescopeId]?.created_at;
    if (!createdAt) return null;
    const timestamp: string = createdAt.replace(' ', 'T');
    // SQLite timestamps without a timezone are UTC, as on the CAM page.
    const hasTimezone: boolean = /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp);
    const date: Date = new Date(hasTimezone ? timestamp : `${timestamp}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  isDeviceOnline(telescopeId: number): boolean {
    const lastActive: Date | null = this.getLastActiveAt(telescopeId);
    if (!lastActive || this.readingErrors.has(telescopeId)) return false;
    const age: number = Date.now() - lastActive.getTime();
    return age >= 0 && age <= 10000;
  }

  getHealthStatusClass(telescopeId: number): string {
    const status: string = (this.latestReadings[telescopeId]?.health_status || '').toUpperCase();
    if (status === 'FAULT' || status === 'ERROR') return 'text-danger';
    if (status === 'DEGRADED' || status === 'WARNING') return 'text-warning';
    if (status === 'OK' || status === 'NOMINAL') return 'text-success';
    return 'text-secondary';
  }

  addTelescope(): void {
    this.isLoading = true;
    if (this.newTelescopeName.trim() === "") {
      console.error("Telescope name cannot be empty");
      this.isLoading = false;
      return;
    }
    if (this.telescopes.some(telescope => telescope.name === this.newTelescopeName)) {
      console.error(`Telescope with name ${this.newTelescopeName} already exists`);
      this.isLoading = false;
      return;
    }
    const newTelescope: CreateTelescope = {
      name: this.newTelescopeName,
      health_status: "OK",
    };
    this.telescopeService.postTelescope(newTelescope).subscribe({
      next: (telescope: Telescope) => {
        console.log(`Telescope added: ${telescope}`); 
        this.telescopes.push(telescope);
        this.loadLatestReadings();
        this.isLoading = false;
      },
      error: (err: Error) => {
        console.error(`Error adding telescope: ${err}`);
        this.isLoading = false;
      }
    });
    return;
  }

  controlTelescope(telescopeId: number): void {
    this.router.navigate(["/telescopes", telescopeId, "cam"]);
    return;
  }

  editTelescope(name: string): void {
    let telescopeToEdit = this.telescopes.find(telescope => telescope.name === name);
    if (telescopeToEdit) {
      const newName = prompt("Enter new name for the telescope:", telescopeToEdit.name);
      if (!newName || newName.trim() === "") {
        console.error("Telescope name cannot be empty");
        return;
      }
      if (this.telescopes.some(telescope => telescope.name === newName && telescope.id !== telescopeToEdit.id)) {
        console.error(`Telescope with name ${newName} already exists`);
        return;
      }
      telescopeToEdit.name = newName;
      this.isLoading = true;
      this.telescopeService.putTelescope(telescopeToEdit).subscribe({
        next: (updatedTelescope: Telescope) => {
          console.log(`Telescope updated: ${updatedTelescope}`);
          const index = this.telescopes.findIndex(telescope => telescope.id === updatedTelescope.id);
          if (index !== -1) {
            this.telescopes[index] = updatedTelescope;
          }
        },
        error: (err: Error) => {
          console.error(`Error updating telescope: ${err}`);
        }
      });
    }
    this.isLoading = false;
    return;
  }

  deleteTelescope(telescopeName: string): void {
    const telescopeToDelete = this.telescopes.find(telescope => telescope.name === telescopeName);
    if (telescopeToDelete) {
      this.isLoading = true;
      this.telescopeService.deleteTelescope(telescopeToDelete.id).subscribe({
        next: () => {
          console.log(`Telescope deleted: ${telescopeName}`);
          this.telescopes = this.telescopes.filter(telescope => telescope.id !== telescopeToDelete.id);
          delete this.latestReadings[telescopeToDelete.id];
          this.readingErrors.delete(telescopeToDelete.id);
          this.isLoading = false;
        },
        error: (err: Error) => {
          console.error(`Error deleting telescope: ${err}`);
          this.isLoading = false;
        }
      });
    }
  return;
  }
}

