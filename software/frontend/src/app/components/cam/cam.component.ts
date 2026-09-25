import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateCommand } from '../../interfaces/create-command';
import { Command } from '../../interfaces/command';
import { CommandService } from '../../services/command.service';
import { getUser } from '../../signal';
import { ActivatedRoute } from '@angular/router';
import { Reading } from '../../interfaces/reading';
import { ReadingService } from '../../services/reading.service';
import { interval, Subscription, switchMap } from 'rxjs';
import { SourceService } from '../../services/source.service';
import { Source } from '../../interfaces/source';
import { CreateSource } from '../../interfaces/create-source';

@Component({
  selector: 'app-cam',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './cam.component.html',
  styleUrl: './cam.component.css'
})
export class CamComponent {
  reading: Reading | null = null;
  width = 360; // Width of the SVG
  height = 90; // Height of the SVG
  knobPosition: { x: number, y: number } = { x: 0, y: 0 };
  isDragging = false;
  isPointing = true;
  isPointingPageActive = false;
  isLoading = false;
  commandMessage = '';
  azimuth_angle = 180; // Initial azimuth value
  elevation_angle = 45; // Initial elevation value
  latitude = 40.730610; // Sample latitude value
  longitude = -73.935242; // Sample longitude value
  altitude = 10; // Sample altitude value
  gridLines = this.generateGridLines();

  dbSources: Source[] = [];
  selectedSource: Source | null = null;
  telescopeId: number | null = null;

  // dialog state
  showSourceDialog = false;
  isEditMode = false;
  dialogSource: CreateSource = this.emptySource();

  constructor(
    private commandService: CommandService,
    private route: ActivatedRoute,
    private readingService: ReadingService,
    private sourceService: SourceService,
  ) {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.telescopeId = id ? +id : null;
    });
  }

  ngOnInit(): void {
    this.loadReading();
    this.startPollingReadings();
    this.getSources();
  }

  pollSubscription: Subscription | null = null;

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  showCommandMessage(message: string): void {
    this.commandMessage = message;
    setTimeout(() => {
      this.commandMessage = '';
    }, 3000);
  }

  startPollingReadings(): void {
    if (!this.telescopeId) return;

    this.pollSubscription = interval(1000)
      .pipe(
        switchMap(() => this.readingService.getLatestReading(this.telescopeId!))
      )
      .subscribe({
        next: (reading: Reading) => {
          this.reading = reading;
        },
        error: (err) => {
          console.error('Error polling readings:', err);
        }
      });
  }

  loadReading(): void {
    if (!this.telescopeId) {
      console.error('Telescope ID is not set.');
      return;
    }
    this.isLoading = true;
    this.readingService.getLatestReading(this.telescopeId).subscribe({
      next: (reading: Reading) => {
        this.reading = reading;
        console.log('Latest reading loaded successfully:', reading);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error loading latest reading:', error);
        this.isLoading = false;
      }
    });
    return;
  }

  startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.updateKnobPosition(event);
  }

  stopDrag(): void {
    this.isDragging = false;
    this.updateAzimuthElevation();
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.updateKnobPosition(event);
    }
  }

  point(): void {
    this.isPointing = true;
    this.updateAzimuthElevation();
  }

  track(): void {
    this.isPointing = false;
  }

  selectSource(source: Source): void {
    this.selectedSource = source;
    console.log('Selected source:', source);
  }

  clipAzimuthAngle(): void {
    this.azimuth_angle = Math.max(0, Math.min(360, this.azimuth_angle));
    return;
  }

  clipElevationAngle(): void {
    this.elevation_angle = Math.max(0, Math.min(90, this.elevation_angle));
    return;
  }

  startPointing(): void {
    this.clipAzimuthAngle();
    this.clipElevationAngle();
    this.isLoading = true;
    const createCommand: CreateCommand = {
      user_id: getUser()?.id ?? 0,
      telescope_id: this.telescopeId ?? 0,
      command_type: 'point',
      point: {
        target_az_angle: this.azimuth_angle,
        target_el_angle: this.elevation_angle
      },
      track: null
    }

    this.commandService.postCommand(createCommand).subscribe({
      next: (command: Command) => {
        console.log('Command sent successfully:', command);
        this.isLoading = false;
        this.isPointingPageActive = true;
        this.showCommandMessage('Point command sent successfully.');
      },
      error: (error) => {
        console.error('Error sending command:', error);
        this.isLoading = false;
      }
    });
  }

  // dialog helpers

  emptySource(): CreateSource {
    return { name: '', m_1: 0, m_2: 0, c_1: 0, c_2: 0, T_ra: 0, A: 0, phi: 0, D: 0, T_dec: 0 };
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.dialogSource = this.emptySource();
    this.showSourceDialog = true;
  }

  openEditDialog(source: Source): void {
    this.isEditMode = true;
    this.dialogSource = { ...source };
    this.showSourceDialog = true;
  }

  closeDialog(): void {
    this.showSourceDialog = false;
  }

  saveSource(): void {
    if (this.isEditMode && this.selectedSource) {
      const updated: Source = { ...this.selectedSource, ...this.dialogSource };
      this.sourceService.updateSource(this.selectedSource.id, updated).subscribe({
        next: (source: Source) => {
          const index = this.dbSources.findIndex(s => s.id === source.id);
          if (index !== -1) this.dbSources[index] = source;
          this.closeDialog();
        },
        error: (error) => console.error('Error updating source:', error)
      });
    } else {
      this.sourceService.postSource(this.dialogSource).subscribe({
        next: (source: Source) => {
          this.dbSources.push(source);
          this.closeDialog();
        },
        error: (error) => console.error('Error adding source:', error)
      });
    }
  }

  getSources(): void {
    this.sourceService.getSources().subscribe({
      next: (sources: Source[]) => {
        this.dbSources = sources;
      },
      error: (error) => console.error('Error loading sources:', error)
    });
  }

  deleteSource(source: Source): void {
    this.sourceService.deleteSource(source.id).subscribe({
      next: () => {
        this.dbSources = this.dbSources.filter(s => s.id !== source.id);
        if (this.selectedSource?.id === source.id) this.selectedSource = null;
      },
      error: (error) => console.error('Error deleting source:', error)
    });
  }

  startTracking(): void {
    if (!this.selectedSource) return;

    this.isLoading = true;
    const createCommand: CreateCommand = {
      user_id: getUser()?.id ?? 0,
      telescope_id: this.telescopeId ?? 0,
      command_type: 'track',
      point: null,
      track: {
        source: {
          name: this.selectedSource.name,
          m_1: this.selectedSource.m_1,
          m_2: this.selectedSource.m_2,
          c_1: this.selectedSource.c_1,
          c_2: this.selectedSource.c_2,
          T_ra: this.selectedSource.T_ra,
          A: this.selectedSource.A,
          phi: this.selectedSource.phi,
          D: this.selectedSource.D,
          T_dec: this.selectedSource.T_dec
        }
      }
    }

    this.commandService.postCommand(createCommand).subscribe({
      next: (command: Command) => {
        console.log('Command sent successfully:', command);
        this.isLoading = false;
        this.showCommandMessage('Track command sent successfully.');
      },
      error: (error) => {
        console.error('Error sending command:', error);
        this.isLoading = false;
      }
    });
  }

  private updateKnobPosition(event: MouseEvent): void {
    const container = event.target as HTMLElement;
    const rect = container.getBoundingClientRect();
    const offsetX = event.clientX - rect.left; // Center the knob
    const offsetY = event.clientY - rect.top; // Center the knob

    const maxXOffset = rect.width / 2; // Max movement limit
    const maxYOffset = rect.height / 2; // Max movement limit
    const x = Math.max(-maxXOffset, Math.min(maxXOffset, offsetX));
    const y = Math.max(-maxYOffset, Math.min(maxYOffset, offsetY));

    this.knobPosition = { x, y };
    this.updateAzimuthElevation();
  }

  private updateAzimuthElevation(): void {
    this.azimuth_angle = Math.round((this.knobPosition.x / this.width) * 360);
    this.elevation_angle = Math.round((this.knobPosition.y / this.height) * 90);
  }

  private generateGridLines(): { x1: number, y1: number, x2: number, y2: number }[] {
    const gridLines = [];
    for (let i = 0; i <= 360; i += 30) {
      gridLines.push({ x1: i, y1: 0, x2: i, y2: 90 });
    }
    for (let i = 0; i <= 90; i += 15) {
      gridLines.push({ x1: 0, y1: i, x2: 360, y2: i });
    }
    return gridLines;
  }

  public getHealthStatusClass(): string {
    if (this.reading?.health_status?.includes('nominal')) {
      return 'text-success';
    } else if (this.reading?.health_status?.includes('warning')) {
      return 'text-warning';
    } else if (this.reading?.health_status?.includes('error')) {
      return 'text-danger';
    } else {
      return '';
    }
  }

  loadSources(): void {
    this.sourceService.getSources().subscribe({
      next: (sources: Source[]) => {
        this.dbSources = sources;
        console.log('Sources loaded successfully:', sources);
      },
      error: (error) => {
        console.error('Error loading sources:', error);
      }
    });
  }
}
