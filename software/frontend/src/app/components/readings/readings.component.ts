import { Component, OnInit } from '@angular/core';
import { Reading } from '../../interfaces/reading';
import { ReadingService } from '../../services/reading.service';
import { CommonModule } from '@angular/common';
import { TelescopeService } from '../../services/telescope.service';
import { Telescope } from '../../interfaces/telescope';

@Component({
  selector: 'app-readings',
  imports: [
    CommonModule
  ],
  templateUrl: './readings.component.html',
  styleUrl: './readings.component.css'
})
export class ReadingsComponent implements OnInit {
  readings: Reading[] = [];
  telescopes: Telescope[] = [];
  isLoading: boolean = false;

  constructor(private readingService: ReadingService, private telescopeService: TelescopeService) { }

  ngOnInit(): void {
    this.loadReadings();
    this.loadTelescopes();
  }

  loadReadings(): void {
    this.isLoading = true;
    this.readingService.getReadings().subscribe({
      next: (readings: Reading[]) => {
        this.readings = readings;
        console.log('Readings loaded successfully:', readings);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error loading readings:', error);
        this.isLoading = false;
      }
    });
    return;
  }

  loadTelescopes(): void {
    this.isLoading = true;
    this.telescopeService.getTelescopes().subscribe({
      next: (telescopes: Telescope[]) => {
        this.telescopes = telescopes;
        console.log("Tescopes loaded successfully:", telescopes);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.log("Error loading telescope:", error);
        this.isLoading = false;
      }
    });
    return;
  }

  getTelescopeNameById(telescope_id: number): string {
    let telescopeName = "Unknown Telescope";
    let telescope: Telescope | undefined = this.telescopes.find(
      (telescope: Telescope) => {
        return telescope.id == telescope_id;
      }
    );
    if(telescope) {
      telescopeName = telescope.name;
    }
    return telescopeName;
  }
}
