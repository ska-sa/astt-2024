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
import { catchError, EMPTY, exhaustMap, finalize, interval, map, Observable, of, shareReplay, Subscription, switchMap } from 'rxjs';
import { SourceService } from '../../services/source.service';
import { Source } from '../../interfaces/source';
import { CreateSource } from '../../interfaces/create-source';
import { CanvasJSAngularChartsModule } from '@canvasjs/angular-charts';
import { HttpErrorResponse } from '@angular/common/http';
import { Telescope, TelescopeMetadata } from '../../interfaces/telescope';
import { TelescopeService } from '../../services/telescope.service';
import { signedAngle } from '../../utils/angles';

interface ChartDataPoint {
  x: Date;
  y: number | null;
}

interface ChartSeries {
  type: string;
  name: string;
  showInLegend: boolean;
  connectNullData?: boolean;
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

  private pointInputsInitialized = false;
  readingsView: 'simple' | 'raw' = 'simple';
  reading: Reading | null = null;
  lastActiveAt: Date | null = null;
  isDeviceOnline = false;
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
  azimuth_angle: number = 0;
  elevation_angle: number = 0;

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

  readonly signedAngle: typeof signedAngle = signedAngle;

  get azimuthReading(): number | null {
    return signedAngle(this.reading?.azimuth_angle);
  }

  get elevationReading(): number | null {
    const angle = this.reading?.elevation_angle;
    const encoder = this.reading?.el_encoder_angle;
    return encoder != null && Number.isFinite(encoder) ? signedAngle(angle) : null;
  }

  get azimuthLabelPosition(): { x: number; y: number } {
    if (this.azimuthReading === null) return { x: 70, y: 104 };
    const angle = this.azimuthReading * Math.PI / 180;
    const horizontal = Math.sin(angle);
    return {
      x: 120 + 104 * horizontal - (horizontal > 0.25 ? 0 : horizontal < -0.25 ? 100 : 50),
      y: 120 - 104 * Math.cos(angle) - 16
    };
  }

  get elevationLabelPosition(): { x: number; y: number } {
    if (this.elevationReading === null) return { x: 70, y: 104 };
    const angle = this.elevationReading * Math.PI / 180;
    const horizontal = Math.cos(angle);
    return {
      x: 120 + 104 * horizontal - (horizontal > 0.25 ? 0 : horizontal < -0.25 ? 100 : 50),
      y: 120 - 104 * Math.sin(angle) - 16
    };
  }

  get azimuthAllowedArc(): string | null {
    if (!this.telescopeMetadata) return null;
    const { az_encoder_min, az_encoder_max, az_encoder_offset } = this.telescopeMetadata;
    const span = this.normalizeAngle(az_encoder_max - az_encoder_min);
    if (span === 0) return null;
    const start = this.normalizeAngle(az_encoder_min + az_encoder_offset) * Math.PI / 180;
    const end = start + span * Math.PI / 180;
    // SVG angles start at the top and increase clockwise, matching the AZ display.
    return `M ${120 + 82 * Math.sin(start)} ${120 - 82 * Math.cos(start)}`
      + ` A 82 82 0 ${span > 180 ? 1 : 0} 1 ${120 + 82 * Math.sin(end)} ${120 - 82 * Math.cos(end)}`;
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
        const minimum: number = signedAngle(this.normalizeAngle(metadata.az_encoder_min + metadata.az_encoder_offset))!;
        const maximum: number = signedAngle(this.normalizeAngle(metadata.az_encoder_max + metadata.az_encoder_offset))!;
        this.azimuthRange = `${+minimum.toFixed(2)}° to ${+maximum.toFixed(2)}°${minimum > maximum ? ' through ±180°' : ''}`;
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
        exhaustMap(() => this.readingService.getLatestReading(this.telescopeId!).pipe(
          catchError(() => {
            this.isDeviceOnline = false;
            return EMPTY;
          })
        ))
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
        this.initializePointInputs();
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
    const encoderPoints: ChartDataPoint[] = [];

    for (const reading of readings) {
      const readingTime: number | null = this.getReadingTime(reading);
      if (readingTime === null) {
        continue;
      }

      const timestamp: Date = new Date(readingTime);
      azimuthPoints.push({ x: timestamp, y: signedAngle(reading.azimuth_angle) });
      encoderPoints.push({ x: timestamp, y: reading.el_encoder_angle != null ? signedAngle(reading.elevation_angle) : null });
    }

    this.chartOptions = this.createChartOptions(azimuthPoints, encoderPoints);
  }

  private createChartOptions(
    azimuthPoints: ChartDataPoint[],
    encoderPoints: ChartDataPoint[]
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
          name: 'Azimuth Angle',
          showInLegend: true,
          connectNullData: false,
          dataPoints: azimuthPoints
        },
        {
          type: 'line',
          name: 'Elevation Angle',
          showInLegend: true,
          connectNullData: false,
          dataPoints: encoderPoints
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

  markPointInputsEdited(): void {
    this.pointInputsInitialized = true;
  }

  roundPointInput(axis: 'azimuth_angle' | 'elevation_angle'): void {
    if (Number.isFinite(this[axis])) this[axis] = Number(this[axis].toFixed(2));
  }

  private initializePointInputs(): void {
    if (this.pointInputsInitialized || this.reading?.telescope_id !== this.telescopeId) return;
    this.pointInputsInitialized = true;
    const azimuth = this.azimuthReading;
    const elevation = this.elevationReading;
    if (azimuth !== null && azimuth >= -130 && azimuth <= 130) this.azimuth_angle = Number(azimuth.toFixed(2));
    if (elevation !== null && elevation >= -15 && elevation <= 92) this.elevation_angle = Number(elevation.toFixed(2));
  }

  point(): void {
    this.isPointing = true;
    this.commandError = '';
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
    if (!Number.isFinite(this.azimuth_angle) || this.azimuth_angle < -130 || this.azimuth_angle > 130) {
      this.commandError = 'Azimuth must be a number between -130° and +130°.';
      return;
    }
    if (!Number.isFinite(this.elevation_angle) || this.elevation_angle < -15 || this.elevation_angle > 92) {
      this.commandError = 'Elevation must be a number between -15° and 92°.';
      return;
    }
    this.roundPointInput('azimuth_angle');
    this.roundPointInput('elevation_angle');
    const targetAzimuth: number = this.normalizeAngle(this.azimuth_angle);
    const targetElevation: number = this.normalizeAngle(this.elevation_angle);
    this.prepareCommand(() => {
      const metadata: TelescopeMetadata = this.telescopeMetadata!;
      const rawAzimuth: number = this.normalizeAngle(targetAzimuth - metadata.az_encoder_offset);
      const allowedSpan: number = this.normalizeAngle(metadata.az_encoder_max - metadata.az_encoder_min);
      const targetPosition: number = this.normalizeAngle(rawAzimuth - metadata.az_encoder_min);
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
        || reading.el_encoder_angle == null || !Number.isFinite(reading.el_encoder_angle)
        || reading.el_encoder_angle < 0 || reading.el_encoder_angle >= 360
        || !Number.isFinite(reading.elevation_angle) || reading.elevation_angle < 0 || reading.elevation_angle >= 360) return false;
    if (reading.health_status === 'FAULT'
        || ['ESTOP', 'WAITING FOR NORTH', 'AZ ENCODER UNAVAILABLE'].includes(reading.movement_status)) return false;

    const rawAzimuth: number = this.normalizeAngle(reading.azimuth_angle - this.telescopeMetadata.az_encoder_offset);
    const allowedSpan: number = this.normalizeAngle(this.telescopeMetadata.az_encoder_max - this.telescopeMetadata.az_encoder_min);
    return this.normalizeAngle(rawAzimuth - this.telescopeMetadata.az_encoder_min) <= allowedSpan;
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
              this.azimuth_angle = Number(signedAngle(reading.azimuth_angle)!.toFixed(2));
              this.elevation_angle = Number(signedAngle(reading.elevation_angle)!.toFixed(2));
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

  private normalizeAngle(angle: number): number {
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
