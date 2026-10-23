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
import { catchError, finalize, interval, map, Observable, of, shareReplay, Subscription, switchMap } from 'rxjs';
import { SourceService } from '../../services/source.service';
import { Source } from '../../interfaces/source';
import { CreateSource } from '../../interfaces/create-source';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { HttpErrorResponse } from '@angular/common/http';
import { Telescope, TelescopeMetadata } from '../../interfaces/telescope';
import { TelescopeService } from '../../services/telescope.service';

interface ChartDataPoint {
  x: Date;
  y: number;
}

interface ChartSeries {
  type: string;
  name: string;
  showInLegend: boolean;
  dataPoints: ChartDataPoint[];
}

interface ChartOptions {
  animationEnabled: boolean;
  axisX: {
    title: string;
    valueFormatString: string;
  };
  axisY: {
    title: string;
    suffix: string;
  };
  toolTip: {
    shared: boolean;
  };
  data: ChartSeries[];
}

@Component({
  selector: 'app-cam',
  imports: [
    CommonModule,
    FormsModule,
    CanvasJSAngularChartsModule,
  ],
  templateUrl: './cam.component.html',
  styleUrl: './cam.component.css'
})
export class CamComponent {
  private readonly readingTimeoutMilliseconds = 10000;
  private readonly requests: Subscription = new Subscription();
  private metadataRequest: Observable<boolean> | null = null;
  private metadataTelescopeId: number | null = null;
  private loadedTelescopeId: number | null = null;

  reading: Reading | null = null;
  lastActiveAt: Date | null = null;
  isDeviceOnline = false;
  width = 360; // Width of the SVG
  height = 90; // Height of the SVG
  knobPosition: { x: number, y: number } = { x: 0, y: 0 };
  isDragging = false;
  isPointing = true;
  isPointingPageActive = false;
  isLoading = false;
  isStopping: boolean = false;
  commandMessage = '';
  commandError: string = '';
  telescopeMetadata: TelescopeMetadata | null = null;
  azimuthRange: string = '';
  calibrationMessage: string = 'Loading azimuth limits...';
  graphStartDate = '';
  graphEndDate = '';
  sampleIntervalMinutes = 5;
  graphMessage = '';
  isGraphLoading = false;
  historicalReadings: Reading[] = [];
  chartOptions: ChartOptions = this.createChartOptions([], []);
  sampleOptions: { label: string, minutes: number }[] = [
    { label: 'Every reading', minutes: 0 },
    { label: 'Every minute', minutes: 1 },
    { label: 'Every 5 minutes', minutes: 5 },
    { label: 'Every 15 minutes', minutes: 15 },
    { label: 'Every hour', minutes: 60 }
  ];
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
    private telescopeService: TelescopeService,
  ) {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.telescopeId = id ? +id : null;
    });
  }

  ngOnInit(): void {
    const today: string = this.getLocalDate(new Date());
    this.graphStartDate = today;
    this.graphEndDate = today;
    this.loadReading();
    this.loadTelescope();
    this.startPollingReadings();
    this.getSources();
    this.loadGraph();
  }

  pollSubscription: Subscription | null = null;

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
    this.requests.unsubscribe();
  }

  loadTelescope(): void {
    this.requests.add(this.refreshMetadata().subscribe());
  }

  private refreshMetadata(): Observable<boolean> {
    const telescopeId: number | null = this.telescopeId;
    if (!telescopeId || this.requests.closed) return of(false);
    if (this.metadataRequest && this.metadataTelescopeId === telescopeId) return this.metadataRequest;

    const request: Observable<boolean> = this.telescopeService.getTelescope(telescopeId).pipe(
      map((telescope: Telescope) => {
        if (this.telescopeId !== telescopeId || this.metadataRequest !== request) return false;
        const metadata: TelescopeMetadata | null | undefined = telescope.id === telescopeId ? telescope.metadata : null;
        if (!metadata
            || !Number.isFinite(metadata.az_encoder_min)
            || !Number.isFinite(metadata.az_encoder_max)
            || !Number.isFinite(metadata.az_encoder_offset)
            || metadata.az_encoder_min < 0
            || metadata.az_encoder_min >= 360
            || metadata.az_encoder_max < 0
            || metadata.az_encoder_max >= 360
            || metadata.az_encoder_offset < 0
            || metadata.az_encoder_offset >= 360) {
          this.calibrationMessage = 'Azimuth limits unavailable. Check the telescope settings.';
          this.telescopeMetadata = null;
          this.azimuthRange = '';
          return false;
        }

        this.telescopeMetadata = metadata;
        this.loadedTelescopeId = telescopeId;
        this.calibrationMessage = '';
        const minimum: number = this.normalizeAzimuth(metadata.az_encoder_min + metadata.az_encoder_offset);
        const maximum: number = this.normalizeAzimuth(metadata.az_encoder_max + metadata.az_encoder_offset);
        this.azimuthRange = `${+minimum.toFixed(2)}° to ${+maximum.toFixed(2)}°${minimum > maximum ? ' through 0°' : ''}`;
        return this.isAzimuthReady();
      }),
      catchError(() => {
        if (this.telescopeId === telescopeId && this.metadataRequest === request) {
          this.telescopeMetadata = null;
          this.azimuthRange = '';
          this.calibrationMessage = 'Azimuth limits unavailable. Check the backend connection and reload.';
        }
        return of(false);
      }),
      finalize(() => { if (this.metadataRequest === request) this.metadataRequest = null; }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.metadataRequest = request;
    this.metadataTelescopeId = telescopeId;
    return request;
  }

  isAzimuthReady(): boolean {
    return this.loadedTelescopeId === this.telescopeId
      && this.telescopeMetadata !== null;
  }

  private prepareCommand(send: () => void): void {
    const telescopeId: number | null = this.telescopeId;
    const userId: number | undefined = getUser()?.id;
    this.isLoading = true;
    this.requests.add(this.refreshMetadata().subscribe((ready: boolean) => {
      const sameContext: boolean = this.telescopeId === telescopeId && getUser()?.id === userId;
      if (!ready || !sameContext) {
        this.isLoading = false;
        this.isStopping = false;
        this.commandError = sameContext ? this.calibrationMessage : 'The selected telescope or user changed. Try again.';
        return;
      }
      send();
    }));
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
          this.updateLatestReading(reading);
        },
        error: (error: Error) => {
          console.error('Error polling readings:', error);
          this.isDeviceOnline = false;
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
        this.updateLatestReading(reading);
        console.log('Latest reading loaded successfully:', reading);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error loading latest reading:', error);
        this.isDeviceOnline = false;
        this.isLoading = false;
      }
    });
    return;
  }

  loadGraph(): void {
    if (!this.telescopeId) {
      this.graphMessage = 'Telescope ID is not set.';
      return;
    }

    if (!this.graphStartDate || !this.graphEndDate) {
      this.graphMessage = 'Select a start and end date.';
      return;
    }

    if (this.graphStartDate > this.graphEndDate) {
      this.graphMessage = 'The start date must be before the end date.';
      return;
    }

    const start: string = `${this.graphStartDate} 00:00:00`;
    const end: string = `${this.graphEndDate} 23:59:59`;

    this.isGraphLoading = true;
    this.graphMessage = '';
    this.readingService.getReadingsInRange(this.telescopeId, start, end).subscribe({
      next: (readings: Reading[]) => {
        this.historicalReadings = this.sampleReadings(readings);
        this.updateChart(this.historicalReadings);
        this.graphMessage = this.historicalReadings.length === 0
          ? 'No readings found for the selected dates.'
          : '';
        this.isGraphLoading = false;
      },
      error: (error: Error) => {
        console.error('Error loading graph readings:', error);
        this.historicalReadings = [];
        this.updateChart([]);
        this.graphMessage = 'Could not load readings.';
        this.isGraphLoading = false;
      }
    });
  }

  private sampleReadings(readings: Reading[]): Reading[] {
    if (this.sampleIntervalMinutes === 0) {
      return readings.filter((reading: Reading) => reading.created_at !== null);
    }

    const intervalMilliseconds: number = this.sampleIntervalMinutes * 60 * 1000;
    const sampledReadings: Reading[] = [];
    let lastSampleTime: number | null = null;

    for (const reading of readings) {
      const readingTime: number | null = this.getReadingTime(reading);
      if (readingTime === null) {
        continue;
      }

      if (lastSampleTime === null || readingTime - lastSampleTime >= intervalMilliseconds) {
        sampledReadings.push(reading);
        lastSampleTime = readingTime;
      }
    }

    const lastReading: Reading | undefined = readings.at(-1);
    const lastSample: Reading | undefined = sampledReadings.at(-1);
    if (lastReading?.created_at && lastReading.id !== lastSample?.id) {
      sampledReadings.push(lastReading);
    }

    return sampledReadings;
  }

  private updateChart(readings: Reading[]): void {
    const azimuthPoints: ChartDataPoint[] = [];
    const elevationPoints: ChartDataPoint[] = [];

    for (const reading of readings) {
      const readingTime: number | null = this.getReadingTime(reading);
      if (readingTime === null) {
        continue;
      }

      const timestamp: Date = new Date(readingTime);
      azimuthPoints.push({ x: timestamp, y: reading.azimuth_angle });
      elevationPoints.push({ x: timestamp, y: reading.elevation_angle });
    }

    this.chartOptions = this.createChartOptions(azimuthPoints, elevationPoints);
  }

  private createChartOptions(
    azimuthPoints: ChartDataPoint[],
    elevationPoints: ChartDataPoint[]
  ): ChartOptions {
    return {
      animationEnabled: true,
      axisX: {
        title: 'Time',
        valueFormatString: 'DD MMM HH:mm'
      },
      axisY: {
        title: 'Angle',
        suffix: '°'
      },
      toolTip: {
        shared: true
      },
      data: [
        {
          type: 'line',
          name: 'Azimuth',
          showInLegend: true,
          dataPoints: azimuthPoints
        },
        {
          type: 'line',
          name: 'Elevation',
          showInLegend: true,
          dataPoints: elevationPoints
        }
      ]
    };
  }

  private getReadingTime(reading: Reading): number | null {
    if (!reading.created_at) {
      return null;
    }

    const createdAt: string = reading.created_at.replace(' ', 'T');
    // SQLite timestamps are UTC, but the API may return them without a timezone.
    const hasTimezone: boolean = /(?:Z|[+-]\d{2}:\d{2})$/i.test(createdAt);
    const timestamp: number = new Date(hasTimezone ? createdAt : `${createdAt}Z`).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private updateLatestReading(reading: Reading): void {
    const readingTime: number | null = this.getReadingTime(reading);
    const isNewReading: boolean = this.reading?.id !== reading.id;

    this.reading = reading;
    this.lastActiveAt = readingTime === null ? null : new Date(readingTime);
    this.isDeviceOnline = readingTime !== null
      && Date.now() - readingTime <= this.readingTimeoutMilliseconds;
    if (isNewReading && !this.isLoading && !this.isStopping) this.loadTelescope();
  }

  private getLocalDate(date: Date): string {
    const year: number = date.getFullYear();
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
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
    this.commandError = '';
    this.updateAzimuthElevation();
  }

  track(): void {
    this.isPointing = false;
    this.commandError = '';
  }

  selectSource(source: Source): void {
    this.selectedSource = source;
    console.log('Selected source:', source);
  }

  startPointing(): void {
    if (this.isLoading || this.isStopping) return;

    this.commandError = '';
    if (!Number.isFinite(this.azimuth_angle) || this.azimuth_angle < 0 || this.azimuth_angle > 360) {
      this.commandError = 'Azimuth must be a number between 0° and 360°.';
      return;
    }
    if (!Number.isFinite(this.elevation_angle) || this.elevation_angle < 0 || this.elevation_angle > 90) {
      this.commandError = 'Elevation must be a number between 0° and 90°.';
      return;
    }
    const targetAzimuth: number = this.azimuth_angle;
    const targetElevation: number = this.elevation_angle;
    this.prepareCommand(() => {
      const metadata: TelescopeMetadata = this.telescopeMetadata!;
      const rawAzimuth: number = this.normalizeAzimuth(targetAzimuth - metadata.az_encoder_offset);
      const allowedSpan: number = this.normalizeAzimuth(metadata.az_encoder_max - metadata.az_encoder_min);
      const targetPosition: number = this.normalizeAzimuth(rawAzimuth - metadata.az_encoder_min);
      if (targetPosition > allowedSpan) {
        this.commandError = `Azimuth must be within the allowed range: ${this.azimuthRange}.`;
        this.isLoading = false;
        return;
      }

      this.isLoading = true;
      const createCommand: CreateCommand = {
        user_id: getUser()?.id ?? 0,
        telescope_id: this.telescopeId ?? 0,
        command_type: 'point',
        point: {
          target_az_angle: targetAzimuth,
          target_el_angle: targetElevation
        },
        track: null
      }

      this.requests.add(this.commandService.postCommand(createCommand).subscribe({
        next: (command: Command) => {
          this.isLoading = false;
          if (this.telescopeId !== createCommand.telescope_id || (getUser()?.id ?? 0) !== createCommand.user_id) return;
          console.log('Command sent successfully:', command);
          this.isPointingPageActive = true;
          this.showCommandMessage('Point command sent successfully.');
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          if (this.telescopeId !== createCommand.telescope_id || (getUser()?.id ?? 0) !== createCommand.user_id) return;
          console.error('Error sending command:', error);
          this.commandError = this.getCommandError(error);
        }
      }));
    });
  }

  canStopMovement(): boolean {
    return !this.isLoading && !this.isStopping && this.isDeviceOnline
      && !!getUser()?.id && this.hasValidStopReading(this.reading);
  }

  private hasValidStopReading(reading: Reading | null): boolean {
    if (!reading || !this.telescopeId || reading.telescope_id !== this.telescopeId
        || !this.telescopeMetadata || !this.isAzimuthReady()) return false;

    const readingTime: number | null = this.getReadingTime(reading);
    if (readingTime === null || readingTime > Date.now()
        || Date.now() - readingTime > this.readingTimeoutMilliseconds) return false;
    if (!Number.isFinite(reading.azimuth_angle) || reading.azimuth_angle < 0 || reading.azimuth_angle > 360
        || !Number.isFinite(reading.elevation_angle) || reading.elevation_angle < 0 || reading.elevation_angle > 90) return false;
    if (reading.health_status === 'FAULT'
        || ['ESTOP', 'WAITING FOR NORTH', 'AZ ENCODER UNAVAILABLE'].includes(reading.movement_status)) return false;

    const rawAzimuth: number = this.normalizeAzimuth(reading.azimuth_angle - this.telescopeMetadata.az_encoder_offset);
    const allowedSpan: number = this.normalizeAzimuth(this.telescopeMetadata.az_encoder_max - this.telescopeMetadata.az_encoder_min);
    return this.normalizeAzimuth(rawAzimuth - this.telescopeMetadata.az_encoder_min) <= allowedSpan;
  }

  // This is a Point command to a reported position, not an emergency power cut.
  stopMovement(): void {
    if (this.isLoading || this.isStopping) return;

    this.commandError = '';
    this.commandMessage = '';
    if (!this.canStopMovement()) {
      this.commandError = 'Software hold needs fresh, valid readings within the allowed range and a signed-in user.';
      return;
    }

    const telescopeId: number = this.telescopeId!;
    const userId: number = getUser()!.id;
    this.isStopping = true;
    this.prepareCommand(() => {
      this.requests.add(this.readingService.getLatestReading(telescopeId).subscribe({
        next: (reading: Reading) => {
          if (this.telescopeId !== telescopeId || getUser()?.id !== userId || !this.hasValidStopReading(reading)) {
            this.isStopping = false;
            this.isLoading = false;
            this.commandError = 'Could not hold position: the latest reading is unavailable, unsafe, or out of date.';
            return;
          }

          this.updateLatestReading(reading);
          const createCommand: CreateCommand = {
            user_id: userId,
            telescope_id: telescopeId,
            command_type: 'point',
            point: {
              target_az_angle: reading.azimuth_angle,
              target_el_angle: reading.elevation_angle
            },
            track: null
          };

          this.requests.add(this.commandService.postCommand(createCommand).subscribe({
            next: () => {
              this.isStopping = false;
              this.isLoading = false;
              if (this.telescopeId !== telescopeId || getUser()?.id !== userId) return;

              this.isPointing = true;
              this.isPointingPageActive = true;
              this.azimuth_angle = reading.azimuth_angle;
              this.elevation_angle = reading.elevation_angle;
              this.showCommandMessage('Hold-position command sent.');
            },
            error: (error: HttpErrorResponse) => {
              this.isStopping = false;
              this.isLoading = false;
              this.commandError = this.getCommandError(error);
            }
          }));
        },
        error: () => {
          this.isStopping = false;
          this.isLoading = false;
          this.commandError = 'Could not load the latest position. No hold command was sent.';
        }
      }));
    });
  }

  private normalizeAzimuth(angle: number): number {
    const normalized: number = angle % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  private getCommandError(error: HttpErrorResponse): string {
    return typeof error.error?.detail === 'string'
      ? error.error.detail
      : 'Could not send the command. Please try again.';
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
    if (this.isLoading || this.isStopping || !this.selectedSource) return;

    this.commandError = '';
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

    this.prepareCommand(() => {
      this.requests.add(this.commandService.postCommand(createCommand).subscribe({
        next: (command: Command) => {
          this.isLoading = false;
          if (this.telescopeId !== createCommand.telescope_id || (getUser()?.id ?? 0) !== createCommand.user_id) return;
          console.log('Command sent successfully:', command);
          this.showCommandMessage('Track command sent successfully.');
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          if (this.telescopeId !== createCommand.telescope_id || (getUser()?.id ?? 0) !== createCommand.user_id) return;
          console.error('Error sending command:', error);
          this.commandError = this.getCommandError(error);
        }
      }));
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

  public getHealthStatusClass(healthStatus: string | undefined = this.reading?.health_status): string {
    const status: string = (healthStatus || '').toUpperCase();
    if (status === 'FAULT' || status === 'ERROR') return 'text-danger';
    if (status === 'DEGRADED' || status === 'WARNING') return 'text-warning';
    if (status === 'OK' || status === 'NOMINAL') return 'text-success';
    return 'text-secondary';
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
