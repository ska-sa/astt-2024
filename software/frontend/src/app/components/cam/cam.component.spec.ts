import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CamComponent } from './cam.component';
import { CommandService } from '../../services/command.service';
import { TelescopeService } from '../../services/telescope.service';
import { Telescope, TelescopeMetadata } from '../../interfaces/telescope';
import { Command } from '../../interfaces/command';
import { Reading } from '../../interfaces/reading';
import { ReadingService } from '../../services/reading.service';
import { setUser } from '../../signal';

describe('CamComponent', () => {
  let component: CamComponent;
  let fixture: ComponentFixture<CamComponent>;
  let commandService: jasmine.SpyObj<CommandService>;
  let telescopeService: jasmine.SpyObj<TelescopeService>;
  let readingService: jasmine.SpyObj<ReadingService>;
  const metadata: TelescopeMetadata = {
    az_encoder_min: 137.8,
    az_encoder_max: 37.8,
    az_encoder_offset: 92.2,
    az_range_temporary: true,
    az_alignment_verified: false
  };

  function telescopeWithMetadata(limits?: TelescopeMetadata): Telescope {
    return {
      id: 7,
      name: 'Test antenna',
      health_status: 'OK',
      created_at: new Date(),
      metadata: limits
    };
  }

  function sensorReading(overrides: Partial<Reading> = {}): Reading {
    return {
      id: 101,
      telescope_id: 7,
      created_at: new Date(Date.now() - 1000).toISOString(),
      azimuth_angle: 0,
      elevation_angle: 45,
      el_encoder_angle: overrides.elevation_angle ?? 45,
      latitude: 0,
      longitude: 0,
      altitude: 0,
      gyroscope_x: 0,
      gyroscope_y: 0,
      gyroscope_z: 0,
      acceleration_x: 0,
      acceleration_y: 0,
      acceleration_z: 0,
      magnetic_field_x: 0,
      magnetic_field_y: 0,
      magnetic_field_z: 0,
      health_status: 'OK',
      movement_status: 'TRACKING',
      ...overrides
    };
  }

  beforeEach(async () => {
    commandService = jasmine.createSpyObj<CommandService>('CommandService', ['postCommand']);
    telescopeService = jasmine.createSpyObj<TelescopeService>('TelescopeService', ['getTelescope']);
    readingService = jasmine.createSpyObj<ReadingService>('ReadingService', ['getLatestReading']);
    commandService.postCommand.and.returnValue(of({} as Command));
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(metadata)));

    await TestBed.configureTestingModule({
      imports: [CamComponent],
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '7' })) } },
        { provide: CommandService, useValue: commandService },
        { provide: TelescopeService, useValue: telescopeService },
        { provide: ReadingService, useValue: readingService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CamComponent);
    component = fixture.componentInstance;
    component.loadTelescope();
    spyOn(component, 'showCommandMessage');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('simple sensor readings', () => {
    beforeEach(() => {
      spyOn(component, 'loadReading');
      spyOn(component, 'startPollingReadings');
      spyOn(component, 'getSources');
      spyOn(component, 'loadGraph');
    });

    it('defaults to two gauges and GPS, with all details available through Raw without submitting a command', () => {
      const reading = sensorReading({ azimuth_angle: 30, elevation_angle: 42.5, serial_log: 'latest diagnostic' });
      component.reading = reading;
      fixture.detectChanges();
      const panel: HTMLElement = fixture.nativeElement.querySelector('.sensor-readings');
      const buttons = panel.querySelectorAll<HTMLButtonElement>('.readings-view button');
      const targetAz = component.azimuth_angle;
      const targetEl = component.elevation_angle;
      expect(panel.querySelectorAll('svg').length).toBe(2);
      expect(panel.textContent).toContain('30.00°');
      expect(panel.textContent).toContain('42.50°');
      expect(panel.querySelector('.gps-location')?.textContent).toContain('Latitude: 0.00000°');
      expect(panel.querySelector('.gps-location')?.textContent).toContain('Altitude: 0 m');
      expect(panel.textContent).not.toContain('Acceleration X');
      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

      buttons[1].click(); fixture.detectChanges();
      expect(panel.querySelectorAll('svg').length).toBe(0);
      for (const label of ['Health', 'GPS', 'Accelerometer', 'Magnetometer', 'Position', 'Gyroscope']) {
        expect(panel.textContent).toContain(label);
      }
      expect(panel.querySelector('pre')?.textContent).toBe('latest diagnostic');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
      buttons[0].click(); fixture.detectChanges();
      expect(panel.querySelectorAll('svg').length).toBe(2);
      expect(component.reading).toBe(reading);
      expect(component.azimuth_angle).toBe(targetAz);
      expect(component.elevation_angle).toBe(targetEl);
      expect(component.isPointing).toBeTrue();
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('orients AZ clockwise from north and updates the measured value without applying another offset', () => {
      fixture.detectChanges();
      component.telescopeMetadata = { ...metadata, az_encoder_offset: 92.2 };
      for (const angle of [0, 90, 130, 230, 270, 359, 360]) {
        component.reading = sensorReading({ azimuth_angle: angle });
        fixture.detectChanges();
        const displayed = angle > 180 ? angle - 360 : angle;
        const gauge: SVGElement = fixture.nativeElement.querySelector('.azimuth-gauge');
        expect(gauge.querySelector('.azimuth-needle')?.getAttribute('transform')).toBe(`rotate(${displayed} 120 120)`);
        expect(fixture.nativeElement.querySelector('.azimuth-reading')?.textContent).toBe(`${displayed.toFixed(2)}°`);
        expect(gauge.getAttribute('aria-label')).toBe(`Azimuth Angle: ${displayed} degrees`);
      }
    });

    it('draws the allowed AZ arc through zero and keeps it fixed when only the reading moves', () => {
      component.telescopeMetadata = { ...metadata, az_encoder_max: 37.8, az_encoder_offset: 92.2 };
      const arc = component.azimuthAllowedArc!;
      const numbers = arc.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      expect(numbers[0]).toBeCloseTo(120 + 82 * Math.sin(230 * Math.PI / 180), 5);
      expect(numbers[1]).toBeCloseTo(120 - 82 * Math.cos(230 * Math.PI / 180), 5);
      expect(numbers.slice(2, 7)).toEqual([82, 82, 0, 1, 1]);
      expect(numbers[7]).toBeCloseTo(120 + 82 * Math.sin(130 * Math.PI / 180), 5);
      expect(numbers[8]).toBeCloseTo(120 - 82 * Math.cos(130 * Math.PI / 180), 5);
      component.reading = sensorReading({ azimuth_angle: 10 });
      expect(component.azimuthAllowedArc).toBe(arc);
      component.reading = sensorReading({ azimuth_angle: 300 });
      expect(component.azimuthAllowedArc).toBe(arc);
      component.telescopeMetadata = { ...metadata, az_encoder_min: 0, az_encoder_max: 90 };
      expect(component.azimuthAllowedArc).toContain(' A 82 82 0 0 1 ');
      component.telescopeMetadata = null;
      expect(component.azimuthAllowedArc).toBeNull();
    });

    it('shows signed EL around the right-facing zero without clamping readings or sending commands', () => {
      fixture.detectChanges();
      for (const [apiAngle, angle] of [[0, 0], [45, 45], [90, 90], [130, 130], [230, -130], [270, -90], [359.5, -0.5], [360, 0], [150, 150]]) {
        component.reading = sensorReading({ elevation_angle: apiAngle });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.elevation-needle').getAttribute('transform'))
          .toBe(`rotate(${-angle} 120 120)`);
        expect(fixture.nativeElement.querySelector('.el-encoder-reading').textContent).toBe(`${angle.toFixed(2)}°`);
        expect(component.reading.elevation_angle).toBe(apiAngle);
      }
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('draws triangular pointers and the EL range from -15 to 92', () => {
      component.reading = sensorReading({ elevation_angle: 345 });
      fixture.detectChanges();
      const needles = fixture.nativeElement.querySelectorAll('.gauge-needle');
      for (const needle of needles) {
        expect(needle.querySelector('line')).toBeNull();
        expect(needle.querySelector('path').getAttribute('d')).toContain('Z');
      }
      const gauge: SVGElement = fixture.nativeElement.querySelector('.elevation-gauge');
      expect(gauge.textContent).toContain('92°');
      expect(gauge.textContent).toContain('−15°');
      const arc = gauge.querySelector('.gauge-track')!.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      expect(arc[0]).toBeCloseTo(120 + 82 * Math.cos(-15 * Math.PI / 180), 1);
      expect(arc[1]).toBeCloseTo(120 - 82 * Math.sin(-15 * Math.PI / 180), 1);
      expect(arc.slice(2, 7)).toEqual([82, 82, 0, 0, 0]);
      expect(arc[7]).toBeCloseTo(120 + 82 * Math.cos(92 * Math.PI / 180), 1);
      expect(arc[8]).toBeCloseTo(120 - 82 * Math.sin(92 * Math.PI / 180), 1);
    });

    it('does not invent a position for absent or invalid feedback and preserves offline styling', () => {
      fixture.detectChanges();
      const panel: HTMLElement = fixture.nativeElement.querySelector('.sensor-readings');
      expect(panel.querySelectorAll('.gauge-needle').length).toBe(0);
      expect(panel.textContent).toContain('Not available');
      expect(panel.classList).toContain('sensor-offline');
      component.reading = sensorReading({ azimuth_angle: NaN, elevation_angle: 0, el_encoder_angle: null });
      fixture.detectChanges();
      expect(panel.querySelectorAll('.gauge-needle').length).toBe(0);
      expect(panel.querySelector('svg')?.getAttribute('aria-label')).toContain('Not available');
      component.reading = sensorReading({ el_encoder_angle: Infinity });
      fixture.detectChanges();
      expect(panel.querySelector('.elevation-needle')).toBeNull();
      expect(panel.querySelector('.el-encoder-reading')?.textContent).toBe('Not available');
    });
  });

  it('displays referenced elevation, recovers polling and shows missing input', fakeAsync(() => {
    spyOn(component, 'loadReading');
    spyOn(component, 'getSources');
    spyOn(component, 'loadGraph');
    readingService.getLatestReading.and.returnValues(
      of(sensorReading({ el_encoder_angle: 16.92, elevation_angle: 36.92 })),
      throwError(() => new Error('temporary outage')),
      of(sensorReading({ id: 102, el_encoder_angle: 0, elevation_angle: 0 })),
      of(sensorReading({ id: 103, el_encoder_angle: null, elevation_angle: 0 }))
    );
    fixture.detectChanges();
    const value: HTMLElement = fixture.nativeElement.querySelector('.el-encoder-reading');
    tick(1000); fixture.detectChanges();
    expect(value.textContent).toContain('36.92°');
    tick(1000);
    expect(component.isDeviceOnline).toBeFalse();
    tick(1000); fixture.detectChanges();
    expect(value.textContent).toContain('0.00°');
    tick(1000); fixture.detectChanges();
    expect(value.textContent).toContain('Not available');
    expect(commandService.postCommand).not.toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  describe('initial Point values', () => {
    beforeEach(() => {
      spyOn(component, 'getSources');
      spyOn(component, 'loadGraph');
    });

    it('starts at zero, seeds from the initial reading once and preserves edits during polling and mode switches', fakeAsync(() => {
      const first = new Subject<Reading>();
      readingService.getLatestReading.and.returnValues(first, of(sensorReading({ id: 102, azimuth_angle: 30, elevation_angle: 60 })));
      expect(component.azimuth_angle).toBe(0);
      expect(component.elevation_angle).toBe(0);
      fixture.detectChanges();
      first.next(sensorReading({ azimuth_angle: 275, elevation_angle: 25 }));
      first.complete();
      expect(component.azimuth_angle).toBe(-85);
      expect(component.elevation_angle).toBe(25);
      fixture.detectChanges();
      const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="number"]');
      expect(inputs[0].min).toBe('-130'); expect(inputs[0].max).toBe('130');
      expect(inputs[1].min).toBe('-15'); expect(inputs[1].max).toBe('92');
      inputs[0].value = '-20'; inputs[0].dispatchEvent(new Event('input'));
      tick(1000);
      component.track(); component.point();
      expect(component.azimuth_angle).toBe(-20);
      expect(component.elevation_angle).toBe(25);
      expect(component.azimuthReading).toBe(30);
      expect(commandService.postCommand).not.toHaveBeenCalled();
      component.ngOnDestroy();
    }));

    it('preserves an edit made before the first reading arrives', () => {
      spyOn(component, 'startPollingReadings');
      const first = new Subject<Reading>();
      readingService.getLatestReading.and.returnValue(first);
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="number"]');
      input.value = '-40'; input.dispatchEvent(new Event('input'));
      first.next(sensorReading({ azimuth_angle: 275, elevation_angle: 25 }));
      first.complete();
      expect(component.azimuth_angle).toBe(-40);
      expect(component.elevation_angle).toBe(0);
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('keeps zero defaults after an initial failure even if later polling recovers', fakeAsync(() => {
      readingService.getLatestReading.and.returnValues(throwError(() => new Error('offline')), of(sensorReading({ azimuth_angle: 275, elevation_angle: 25 })));
      fixture.detectChanges(); tick(1000);
      expect(component.azimuth_angle).toBe(0); expect(component.elevation_angle).toBe(0);
      expect(component.azimuthReading).toBe(-85);
      component.ngOnDestroy();
    }));

    it('leaves defaults for missing or out-of-input-range initial positions without clamping actual readings', () => {
      spyOn(component, 'startPollingReadings');
      readingService.getLatestReading.and.returnValue(of(sensorReading({ azimuth_angle: 180, elevation_angle: 180 })));
      fixture.detectChanges();
      expect(component.azimuth_angle).toBe(0); expect(component.elevation_angle).toBe(0);
      expect(component.azimuthReading).toBe(180); expect(component.elevationReading).toBe(180);
    });
  });

  it('uses signed AZ in the live raw view and history without mutating API readings', () => {
    spyOn(component, 'loadReading'); spyOn(component, 'startPollingReadings');
    spyOn(component, 'getSources'); spyOn(component, 'loadGraph');
    const readings = [359, 0, 1, 230, 275, 130, 360].map(azimuth_angle => sensorReading({ azimuth_angle }));
    component.reading = readings[4]; component.readingsView = 'raw';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sensor-readings').textContent).toContain('Azimuth Angle: -85.00°');
    component['updateChart'](readings);
    expect(component.chartOptions.data[0].dataPoints.map(point => point.y)).toEqual([-1, 0, 1, -130, -85, 130, 0]);
    expect(readings.map(reading => reading.azimuth_angle)).toEqual([359, 0, 1, 230, 275, 130, 360]);
  });

  it('graphs referenced AZ and EL with gaps for missing encoder readings', () => {
    component['updateChart']([
      sensorReading({ el_encoder_angle: 339.5, elevation_angle: 359.5 }),
      sensorReading({ id: 102, el_encoder_angle: 0, elevation_angle: 0 }),
      sensorReading({ id: 103, el_encoder_angle: null }),
      sensorReading({ id: 104, el_encoder_angle: undefined })
    ]);
    const series = component.chartOptions.data.find(item => item.name === 'Elevation Angle')!;
    expect(series.dataPoints.map(point => point.y)).toEqual([-0.5, 0, null, null]);
    expect(series.connectNullData).toBeFalse();
    expect(component.chartOptions.data.map(item => item.name)).toEqual(['Azimuth Angle', 'Elevation Angle']);
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('updates escaped latest diagnostics and actual health while retaining offline freshness styling', fakeAsync(() => {
    spyOn(component, 'loadReading');
    spyOn(component, 'getSources');
    spyOn(component, 'loadGraph');
    const diagnostic: string = '<img src=x onerror="alert(1)"> encoder unavailable';
    readingService.getLatestReading.and.returnValues(
      of(sensorReading({ health_status: 'DEGRADED', serial_log: diagnostic })),
      of(sensorReading({ id: 102, health_status: 'FAULT', movement_status: 'ESTOP', serial_log: 'E-stop active' })),
      of(sensorReading({ id: 103, health_status: 'OK', created_at: new Date(Date.now() - 20000).toISOString(), serial_log: null }))
    );
    component.readingsView = 'raw';
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const panel: HTMLElement = element.querySelector<HTMLElement>('.sensor-readings')!;
    const details: HTMLDetailsElement = panel.querySelector<HTMLDetailsElement>('details')!;

    tick(1000);
    fixture.detectChanges();
    expect(details.open).toBeFalse();
    expect(details.querySelector('pre')?.textContent).toBe(diagnostic);
    expect(details.querySelector('img')).toBeNull();
    expect(panel.querySelector('.text-warning')?.textContent).toBe('DEGRADED');
    expect(panel.classList).not.toContain('sensor-offline');

    tick(1000);
    fixture.detectChanges();
    expect(details.querySelector('pre')?.textContent).toBe('E-stop active');
    expect(panel.querySelector('.text-danger')?.textContent).toBe('FAULT');
    expect(panel.textContent).toContain('Movement: ESTOP');

    tick(1000);
    fixture.detectChanges();
    expect(panel.classList).toContain('sensor-offline');
    expect(panel.querySelector('.badge')?.textContent?.trim()).toBe('Offline');
    expect(details.textContent).toContain('No diagnostics recorded for this reading.');
    expect(panel.textContent).toContain('Last active:');
    expect(commandService.postCommand).not.toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  it('keeps each historical reading diagnostic separate and supplies a legacy fallback', () => {
    spyOn(component, 'loadReading');
    spyOn(component, 'startPollingReadings');
    spyOn(component, 'getSources');
    spyOn(component, 'loadGraph');
    component.historicalReadings = [
      sensorReading({ serial_log: '<b>encoder 180</b>', health_status: 'DEGRADED' }),
      sensorReading({ id: 102, serial_log: '', health_status: 'FAULT' })
    ];
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const details: HTMLDetailsElement = element.querySelector<HTMLDetailsElement>('.history-diagnostics')!;
    const rows: NodeListOf<HTMLElement> = details.querySelectorAll<HTMLElement>('.border-bottom');

    expect(details.open).toBeFalse();
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Reading #101');
    expect(rows[0].querySelector('pre')?.textContent).toBe('<b>encoder 180</b>');
    expect(rows[0].querySelector('b')).toBeNull();
    expect(rows[0].querySelector('.text-warning')?.textContent).toBe('DEGRADED');
    expect(rows[1].textContent).toContain('Reading #102');
    expect(rows[1].textContent).not.toContain('encoder 180');
    expect(rows[1].textContent).toContain('No diagnostics recorded for this reading.');
    expect(rows[1].querySelector('.text-danger')?.textContent).toBe('FAULT');
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('displays rounded magnetometer values in microteslas without changing recorded teslas', () => {
    spyOn(component, 'loadReading');
    spyOn(component, 'startPollingReadings');
    spyOn(component, 'getSources');
    spyOn(component, 'loadGraph');
    const reading: Reading = sensorReading({
      magnetic_field_x: -0.000001155625,
      magnetic_field_y: 0.00000261625,
      magnetic_field_z: 0.00000205875
    });
    const originalReading: Reading = { ...reading };
    component.reading = reading;
    component.readingsView = 'raw';
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Magnetic Field X: -1.16 µT');
    expect(element.textContent).toContain('Magnetic Field Y: 2.62 µT');
    expect(element.textContent).toContain('Magnetic Field Z: 2.06 µT');
    expect(reading).toEqual(originalReading);
    expect(component.reading).toBe(reading);

    component.reading = sensorReading();
    fixture.detectChanges();
    for (const axis of ['X', 'Y', 'Z']) {
      expect(element.textContent).toContain(`Magnetic Field ${axis}: 0.00 µT`);
    }

    component.reading = null;
    fixture.detectChanges();
    for (const axis of ['X', 'Y', 'Z']) {
      expect(element.textContent).toContain(`Magnetic Field ${axis}: — µT`);
    }
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('keeps one hold button opposite the submit action in both modes, separate from navigation', () => {
    spyOn(component, 'loadReading');
    spyOn(component, 'startPollingReadings');
    spyOn(component, 'getSources');
    spyOn(component, 'loadGraph');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const navigation: HTMLElement = element.querySelector<HTMLElement>('[aria-labelledby="command-type-label"]')!;
    expect(element.querySelector('#command-type-label')?.textContent).toContain('Command type');
    expect(navigation.getAttribute('aria-labelledby')).toBe('command-type-label');
    expect(navigation.querySelectorAll('button.btn-outline-primary').length).toBe(2);
    expect(navigation.querySelector('i')).toBeNull();
    expect(element.querySelector('button .fa-chart-line')).not.toBeNull();

    for (const isPointing of [true, false]) {
      component.isPointing = isPointing;
      component.selectedSource = { ...component.emptySource(), id: 1, name: 'Test source', created_at: '' };
      fixture.detectChanges();
      const hold: HTMLButtonElement = element.querySelector<HTMLButtonElement>('button.btn-danger')!;
      const actionRow: HTMLElement = hold.parentElement!;
      const submit: HTMLButtonElement = actionRow.querySelector<HTMLButtonElement>('button.btn-primary')!;

      expect(element.querySelectorAll('button.btn-danger').length).toBe(1);
      expect(actionRow.classList).toContain('justify-content-between');
      expect(submit.textContent?.trim()).toBe(isPointing ? 'Send Point' : 'Send Track');
      expect(submit.querySelector(isPointing ? '.fa-crosshairs' : '.fa-satellite-dish')).not.toBeNull();
      expect(hold.querySelector('.fa-stop')).not.toBeNull();
      expect(navigation.textContent).not.toContain('Stop');
      const modeButtons: NodeListOf<HTMLButtonElement> = navigation.querySelectorAll<HTMLButtonElement>('button');
      expect(modeButtons[0].getAttribute('aria-pressed')).toBe(String(isPointing));
      expect(modeButtons[1].getAttribute('aria-pressed')).toBe(String(!isPointing));
    }

    navigation.querySelectorAll<HTMLButtonElement>('button').forEach((button: HTMLButtonElement) => button.click());
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('scrolls back to the top without posting a command or changing routes', () => {
    spyOn(component, 'loadReading');
    spyOn(component, 'startPollingReadings');
    spyOn(component, 'getSources');
    spyOn(component, 'loadGraph');
    const scroll: jasmine.Spy = spyOn(window, 'scrollTo');
    const originalHash: string = window.location.hash;
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const backToTop: HTMLButtonElement = Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((button: HTMLButtonElement) => button.textContent?.includes('Back to top'))!;
    expect(backToTop.type).toBe('button');
    expect(backToTop.classList).toContain('btn-outline-secondary');
    expect(backToTop.querySelector('.fa-arrow-up')).not.toBeNull();

    backToTop.click();

    expect(scroll).toHaveBeenCalledOnceWith({ top: 0, behavior: 'auto' });
    expect(window.location.hash).toBe(originalHash);
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('rejects AZ inputs outside -130 to 130 without changing the entered value', () => {
    for (const angle of [-131, 131, 230, 360, NaN, Infinity]) {
      component.azimuth_angle = angle;
      component.startPointing();
      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.azimuth_angle).toEqual(angle);
      expect(component.commandError).toContain('-130° and +130°');
    }
  });

  it('converts signed endpoints and interior targets to API degrees while preserving the form', () => {
    component.elevation_angle = 45;
    for (const [angle, apiAngle] of [[-130, 230], [-90, 270], [-0.5, 359.5], [0, 0], [90, 90], [130, 130]]) {
      component.azimuth_angle = angle;
      component.startPointing();
      expect(component.commandError).toBe('');
      expect(component.azimuth_angle).toBe(angle);
      expect(commandService.postCommand.calls.mostRecent().args[0].point)
        .toEqual({ target_az_angle: apiAngle, target_el_angle: 45 });
    }
    expect(commandService.postCommand).toHaveBeenCalledTimes(6);
  });

  it('rounds initial Point fields to two decimals without changing telemetry or later edits', () => {
    component.reading = sensorReading({ azimuth_angle: 280.123456, elevation_angle: 350.123456 });
    component['initializePointInputs']();
    expect(component.azimuth_angle).toBe(-79.88);
    expect(component.elevation_angle).toBe(-9.88);
    expect(component.reading.azimuth_angle).toBe(280.123456);
    expect(component.reading.elevation_angle).toBe(350.123456);
    component.azimuth_angle = 12.34;
    component.reading = sensorReading({ azimuth_angle: 10, elevation_angle: 20 });
    component['initializePointInputs']();
    expect(component.azimuth_angle).toBe(12.34);
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('rounds edited targets on blur and before sending, preserving signed conversion', () => {
    spyOn(component, 'loadReading'); spyOn(component, 'startPollingReadings');
    spyOn(component, 'getSources'); spyOn(component, 'loadGraph');
    component.azimuth_angle = -79.876544;
    component.elevation_angle = 12.3456;
    fixture.detectChanges();
    const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBe(2);
    inputs.forEach(input => {
      expect(input.step).toBe('0.01');
      input.dispatchEvent(new Event('blur'));
    });
    expect(component.azimuth_angle).toBe(-79.88);
    expect(component.elevation_angle).toBe(12.35);
    expect(commandService.postCommand).not.toHaveBeenCalled();
    component.azimuth_angle = -79.876544;
    component.elevation_angle = 12.3456;
    component.startPointing();
    expect(component.azimuth_angle).toBe(-79.88);
    expect(component.elevation_angle).toBe(12.35);
    const target = commandService.postCommand.calls.mostRecent().args[0].point!;
    expect(target.target_az_angle).toBeCloseTo(280.12, 8);
    expect(target.target_el_angle).toBe(12.35);
  });

  it('still checks the raw encoder range after converting a signed UI target', () => {
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({
      ...metadata, az_encoder_min: 137.8, az_encoder_max: 209.7, az_encoder_offset: 100
    })));
    component.azimuth_angle = -90;
    component.startPointing();
    expect(commandService.postCommand.calls.mostRecent().args[0].point?.target_az_angle).toBe(270);
    component.azimuth_angle = 10;
    component.startPointing();
    expect(commandService.postCommand).toHaveBeenCalledTimes(1);
    expect(component.commandError).toContain('-122.2° to -50.3°');
    expect(component.azimuth_angle).toBe(10);
  });

  it('accepts signed EL endpoints, wraps API targets, and rejects out-of-range inputs', () => {
    for (const [angle, apiAngle] of [[-15, 345], [-10, 350], [-0.5, 359.5], [0, 0], [90, 90], [92, 92]]) {
      component.elevation_angle = angle;
      component.startPointing();
      expect(component.commandError).toBe('');
      expect(commandService.postCommand.calls.mostRecent().args[0].point?.target_el_angle).toBe(apiAngle);
      expect(component.elevation_angle).toBe(angle);
    }
    for (const angle of [-15.01, 92.01, 360, NaN, Infinity]) {
      component.elevation_angle = angle;
      component.startPointing();
      expect(component.commandError).toContain('-15° and 92°');
      expect(component.elevation_angle).toEqual(angle);
    }
    expect(commandService.postCommand).toHaveBeenCalledTimes(6);
  });

  it('initializes negative EL once from wrapped readings and leaves later edits alone', () => {
    component.reading = sensorReading({ elevation_angle: 350 });
    component['initializePointInputs']();
    expect(component.elevation_angle).toBe(-10);
    component.elevation_angle = -12;
    component.reading = sensorReading({ elevation_angle: 340 });
    component['initializePointInputs']();
    expect(component.elevation_angle).toBe(-12);
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('uses signed EL in Raw, history and the graph without changing encoder diagnostics', () => {
    spyOn(component, 'loadReading'); spyOn(component, 'startPollingReadings');
    spyOn(component, 'getSources'); spyOn(component, 'loadGraph');
    const readings = [230, 330, 0, 130, 360].map(elevation_angle => sensorReading({ elevation_angle, serial_log: 'elEnc=330' }));
    component.reading = readings[1]; component.readingsView = 'raw';
    component.historicalReadings = readings;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sensor-readings').textContent).toContain('Elevation Angle: -30.00°');
    expect(fixture.nativeElement.querySelector('.sensor-readings pre').textContent).toBe('elEnc=330');
    expect(fixture.nativeElement.querySelector('.history-diagnostics').textContent).toContain('Elevation Angle: -30.00°');
    component['updateChart'](readings);
    expect(component.chartOptions.data[1].dataPoints.map(point => point.y)).toEqual([-130, -30, 0, 130, 0]);
    expect(readings.map(reading => reading.elevation_angle)).toEqual([230, 330, 0, 130, 360]);
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('rejects missing calibration metadata before posting', () => {
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata()));
    component.loadTelescope();

    component.startPointing();

    expect(commandService.postCommand).not.toHaveBeenCalled();
    expect(component.commandError).toContain('Azimuth limits unavailable');
  });

  it('rejects invalid calibration metadata using the backend limits', () => {
    const invalidLimits: TelescopeMetadata[] = [
      { ...metadata, az_encoder_min: -1 },
      { ...metadata, az_encoder_min: 360 },
      { ...metadata, az_encoder_max: -1 },
      { ...metadata, az_encoder_max: 360 },
      { ...metadata, az_encoder_offset: -1 },
      { ...metadata, az_encoder_offset: 360 },
      { ...metadata, az_encoder_offset: Number.NaN }
    ];

    for (const limits of invalidLimits) {
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(limits)));
      component.loadTelescope();
      component.startPointing();
      expect(component.commandError).toContain('Azimuth limits unavailable');
    }

    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('rejects non-finite angles and elevation outside its range', () => {
    component.azimuth_angle = Number.NaN;
    component.startPointing();
    expect(component.commandError).toContain('Azimuth must be a number');

    component.azimuth_angle = 0;
    component.elevation_angle = 361;
    component.startPointing();
    expect(component.commandError).toContain('Elevation must be a number');
    expect(component.elevation_angle).toBe(361);
    expect(commandService.postCommand).not.toHaveBeenCalled();
  });

  it('displays backend command errors inline', () => {
    commandService.postCommand.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { detail: 'Azimuth is outside the configured range.' }
    })));

    component.startPointing();

    expect(component.commandError).toBe('Azimuth is outside the configured range.');
    expect(component.isLoading).toBeFalse();
  });

  describe('azimuth limits', () => {
    const manualMetadata: TelescopeMetadata = {
      ...metadata,
      az_encoder_max: 37.8,
      az_encoder_offset: 92.2,
      az_range_temporary: false,
      az_reference: 'MANUAL_ALIGNMENT',
      mag_declination_supported: false
    };

    beforeEach(() => {
      setUser({ id: 12, email_address: 'observer@example.test', password: '', create_at: new Date() });
      component.selectedSource = { ...component.emptySource(), id: 1, name: 'Test source', created_at: '' };
    });

    afterEach(() => {
      setUser(null);
    });

    it('allows manual-alignment Point commands without compass readings or supported declination', () => {
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(manualMetadata)));
      const unavailableCompass: Reading = sensorReading({
        azimuth_angle: 0,
        magnetic_field_x: Number.NaN,
        magnetic_field_y: Number.NaN,
        magnetic_field_z: Number.NaN,
        health_status: 'DEGRADED',
        movement_status: 'IDLE',
        serial_log: 'ref=MANUAL_ALIGNMENT MAG=ERR heading=STALE decl=nan'
      });

      for (const reading of [null, unavailableCompass]) {
        component.reading = reading;
        component.azimuth_angle = 0;
        component.elevation_angle = 45;
        component.startPointing();

        expect(component.isAzimuthReady()).toBeTrue();
        expect(component.commandError).toBe('');
        expect(commandService.postCommand.calls.mostRecent().args[0].point).toEqual({
          target_az_angle: 0,
          target_el_angle: 45
        });
      }

      expect(commandService.postCommand).toHaveBeenCalledTimes(2);
      expect(readingService.getLatestReading).not.toHaveBeenCalled();
    });

    it('retains the numeric blocked-arc rejection for manual alignment without changing the target', () => {
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(manualMetadata)));
      component.azimuth_angle = 180;
      component.elevation_angle = 45;

      component.startPointing();

      expect(component.isAzimuthReady()).toBeTrue();
      expect(component.azimuthRange).toBe('-130° to 130°');
      expect(component.commandError).toContain('-130° and +130°');
      expect(component.azimuth_angle).toBe(180);
      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(readingService.getLatestReading).not.toHaveBeenCalled();
    });

    it('omits reference filler and keeps magnetometer readings and escaped raw diagnostics', () => {
      spyOn(component, 'loadReading');
      spyOn(component, 'startPollingReadings');
      spyOn(component, 'getSources');
      spyOn(component, 'loadGraph');
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(manualMetadata)));
      const diagnostic: string = 'ref=MANUAL_ALIGNMENT MAG=OK magnetic=12.5 decl=nan mag_uT=1.25/2.50/3.75 <b>raw compass</b>';
      const reading: Reading = sensorReading({
        azimuth_angle: 0,
        magnetic_field_x: 0.00000125,
        magnetic_field_y: 0.0000025,
        magnetic_field_z: 0.00000375,
        serial_log: diagnostic
      });
      component.reading = reading;
      component.readingsView = 'raw';
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement as HTMLElement;
      const panel: HTMLElement = element.querySelector<HTMLElement>('.sensor-readings')!;
      const details: HTMLDetailsElement = panel.querySelector<HTMLDetailsElement>('details')!;

      for (const isPointing of [true, false]) {
        component.isPointing = isPointing;
        fixture.detectChanges();
        expect(element.textContent).not.toContain('Reference: MANUAL_ALIGNMENT. AZ is encoder-derived');
        expect(element.textContent).not.toContain('base levelling and true-north alignment are manual');
        expect(element.textContent).not.toContain('Absolute accuracy is unverified.');
        expect(element.textContent).not.toContain('Uncalibrated heading estimate');
        expect(element.textContent).not.toContain('Declination is unavailable');
        expect(panel.textContent).toContain('Magnetic Field X: 1.25 µT');
        expect(panel.textContent).toContain('Magnetic Field Y: 2.50 µT');
        expect(panel.textContent).toContain('Magnetic Field Z: 3.75 µT');
        expect(Array.from(panel.querySelectorAll('strong')).some((label: HTMLElement) => label.textContent === 'Magnetometer')).toBeTrue();
      }

      expect(details.open).toBeFalse();
      expect(details.querySelector('summary')?.textContent?.trim()).toBe('Show more');
      expect(details.querySelector('pre')?.textContent).toBe(diagnostic);
      expect(details.querySelector('b')).toBeNull();
      expect(component.reading).toBe(reading);
      expect(component.reading?.magnetic_field_x).toBe(0.00000125);
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('ignores obsolete readiness flags and treats declination support as a warning only', () => {
      const legacyMetadata = {
        ...metadata,
        az_calibration_valid: false,
        az_encoder_mapping_verified: false,
        az_compass_test_mode: false,
        az_reference: 'encoder',
        mag_declination_supported: false
      };
      component.reading = sensorReading();
      component.isDeviceOnline = true;
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(legacyMetadata)));

      component.startPointing();
      component.startTracking();

      expect(component.isAzimuthReady()).toBeTrue();
      expect(component.commandError).toBe('');
      expect(component.canStopMovement()).toBeTrue();
      expect(commandService.postCommand).toHaveBeenCalledTimes(2);
      expect(readingService.getLatestReading).not.toHaveBeenCalled();
    });

    it('allows Point, Track, and hold with numeric limits only and does not change reported angles', () => {
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({ ...metadata, az_encoder_offset: 100 })));
      component.loadTelescope();
      component.azimuth_angle = -80;
      component.elevation_angle = 45;
      component.startPointing();
      expect(commandService.postCommand.calls.mostRecent().args[0].point).toEqual({ target_az_angle: 280, target_el_angle: 45 });
      component.startTracking();
      expect(commandService.postCommand.calls.mostRecent().args[0].command_type).toBe('track');

      const reading: Reading = sensorReading({ azimuth_angle: 280.123456, elevation_angle: 312.75, el_encoder_angle: 12.75 });
      component.reading = reading;
      component.isDeviceOnline = true;
      readingService.getLatestReading.and.returnValue(of(reading));
      expect(component.canStopMovement()).toBeTrue();
      component.stopMovement();

      expect(commandService.postCommand).toHaveBeenCalledTimes(3);
      expect(commandService.postCommand.calls.mostRecent().args[0].point).toEqual({ target_az_angle: 280.123456, target_el_angle: 312.75 });
      expect(reading.azimuth_angle).toBe(280.123456);
    });

    it('removes requested hold/reference notes in both modes without blocking readiness', () => {
      spyOn(component, 'loadReading');
      spyOn(component, 'startPollingReadings');
      spyOn(component, 'getSources');
      spyOn(component, 'loadGraph');
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement as HTMLElement;

      for (const isPointing of [true, false]) {
        component.isPointing = isPointing;
        fixture.detectChanges();
        expect(component.isAzimuthReady()).toBeTrue();
        expect(element.textContent).not.toContain('Offset:');
        expect(element.textContent).not.toContain('Allowed azimuth:');
        expect(element.textContent).not.toContain('Uncalibrated heading estimate');
        expect(element.textContent).not.toContain('Software hold only:');
      }
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('rejects zero when the shifted mechanical no-go arc contains it', () => {
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({
        ...metadata, az_encoder_max: 37.8, az_encoder_offset: 300
      })));

      for (const angle of [0]) {
        component.azimuth_angle = angle;
        component.startPointing();
        expect(component.commandError).toContain('77.8° to -22.2° through ±180°');
        expect(component.azimuth_angle).toBe(angle);
      }
      expect(commandService.postCommand).not.toHaveBeenCalled();

      for (const angle of [90, -30]) {
        component.azimuth_angle = angle;
        component.startPointing();
        expect(component.commandError).toBe('');
      }
      expect(commandService.postCommand).toHaveBeenCalledTimes(2);
    });

    it('refreshes the allowed arc on a new reading without issuing motion or changing its measured angle', fakeAsync(() => {
      const reading: Reading = sensorReading();
      component.reading = reading;
      telescopeService.getTelescope.calls.reset();
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({ ...metadata, az_encoder_offset: 100 })));
      readingService.getLatestReading.and.returnValues(of(reading), of({ ...reading, id: 102 }), of({ ...reading, id: 102 }));
      component.startPollingReadings();

      tick(1000);
      expect(telescopeService.getTelescope).not.toHaveBeenCalled();
      tick(2000);

      expect(telescopeService.getTelescope).toHaveBeenCalledTimes(1);
      expect(component.azimuthRange).toBe('-122.2° to 137.8°');
      expect(component.reading?.azimuth_angle).toBe(0);
      expect(commandService.postCommand).not.toHaveBeenCalled();
      component.ngOnDestroy();
    }));

    it('shares an in-flight metadata refresh and preserves the displayed range while waiting', () => {
      const response: Subject<Telescope> = new Subject<Telescope>();
      telescopeService.getTelescope.calls.reset();
      telescopeService.getTelescope.and.returnValue(response);

      component.loadTelescope();
      component.loadTelescope();

      expect(telescopeService.getTelescope).toHaveBeenCalledTimes(1);
      expect(component.azimuthRange).toBe('-130° to 130°');
      response.next(telescopeWithMetadata({ ...metadata, az_encoder_offset: 100 }));
      response.complete();
      expect(component.azimuthRange).toBe('-122.2° to 137.8°');
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('ignores a previous telescope response after the scope changes', () => {
      const older: Subject<Telescope> = new Subject<Telescope>();
      const newer: Subject<Telescope> = new Subject<Telescope>();
      telescopeService.getTelescope.and.returnValues(older, newer);
      component.loadTelescope();
      component.telescopeId = 8;
      expect(component.isAzimuthReady()).toBeFalse();
      component.loadTelescope();

      newer.next({ ...telescopeWithMetadata({ ...metadata, az_encoder_offset: 100 }), id: 8 });
      older.next(telescopeWithMetadata(metadata));

      expect(component.telescopeMetadata?.az_encoder_offset).toBe(100);
      expect(component.azimuthRange).toBe('-122.2° to 137.8°');
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('checks freshly loaded metadata before posting immutable Point input values', () => {
      const response: Subject<Telescope> = new Subject<Telescope>();
      telescopeService.getTelescope.calls.reset();
      telescopeService.getTelescope.and.returnValue(response);
      component.azimuth_angle = -80;
      component.elevation_angle = 45;
      component.startPointing();
      component.azimuth_angle = 200;
      component.elevation_angle = 10;
      expect(commandService.postCommand).not.toHaveBeenCalled();

      response.next(telescopeWithMetadata({ ...metadata, az_encoder_offset: 100 }));
      response.complete();

      expect(telescopeService.getTelescope).toHaveBeenCalledTimes(1);
      expect(commandService.postCommand.calls.mostRecent().args[0].point).toEqual({ target_az_angle: 280, target_el_angle: 45 });
      expect(component.azimuth_angle).toBe(200);
      expect(component.elevation_angle).toBe(10);
    });

    it('marks metadata unavailable and blocks commands when refresh fails', () => {
      telescopeService.getTelescope.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
      const reading: Reading = sensorReading({ magnetic_field_x: -0.000001155625 });
      component.reading = reading;

      component.startPointing();
      component.startTracking();

      expect(component.isAzimuthReady()).toBeFalse();
      expect(component.telescopeMetadata).toBeNull();
      expect(component.commandError).toContain('backend connection');
      expect(component.isLoading).toBeFalse();
      expect(component.reading).toBe(reading);
      expect(component.reading?.azimuth_angle).toBe(0);
      expect(component.reading?.magnetic_field_x).toBe(-0.000001155625);
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('cancels pre-command work if the selected telescope or user changes during metadata loading', () => {
      for (const change of ['telescope', 'user']) {
        const response: Subject<Telescope> = new Subject<Telescope>();
        telescopeService.getTelescope.and.returnValue(response);
        component.startPointing();
        if (change === 'telescope') component.telescopeId = 8;
        else setUser(null);

        response.next(telescopeWithMetadata(metadata));
        response.complete();

        expect(component.isLoading).toBeFalse();
        expect(component.isStopping).toBeFalse();
        expect(component.commandError).toContain('selected telescope or user changed');
        component.telescopeId = 7;
        setUser({ id: 12, email_address: 'observer@example.test', password: '', create_at: new Date() });
      }
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('ignores late Point and Track responses after switching telescope or user', () => {
      for (const commandType of ['point', 'track']) {
        for (const fail of [false, true]) {
          const response: Subject<Command> = new Subject<Command>();
          commandService.postCommand.and.returnValue(response);
          if (commandType === 'point') component.startPointing();
          else component.startTracking();
          if (fail) {
            setUser(null);
            response.error(new HttpErrorResponse({ status: 400, error: { detail: 'Old command error.' } }));
          } else {
            component.telescopeId = 8;
            response.next({} as Command);
            response.complete();
          }

          expect(component.isLoading).toBeFalse();
          expect(component.commandError).toBe('');
          component.telescopeId = 7;
          setUser({ id: 12, email_address: 'observer@example.test', password: '', create_at: new Date() });
        }
      }
      expect(component.showCommandMessage).not.toHaveBeenCalled();
    });

    it('cancels pre-command metadata work when leaving the page', () => {
      const response: Subject<Telescope> = new Subject<Telescope>();
      telescopeService.getTelescope.and.returnValue(response);
      component.startPointing();

      component.ngOnDestroy();
      response.next(telescopeWithMetadata(metadata));

      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
    });
  });

  describe('hold position', () => {
    beforeEach(() => {
      setUser({ id: 12, email_address: 'observer@example.test', password: '', create_at: new Date() });
      component.reading = sensorReading();
      component.isDeviceOnline = true;
      readingService.getLatestReading.and.returnValue(of(sensorReading()));
    });

    afterEach(() => {
      setUser(null);
    });

    it('enables hold only with a fresh reading for the selected online telescope', () => {
      expect(component.canStopMovement()).toBeTrue();
      component.isDeviceOnline = false;
      expect(component.canStopMovement()).toBeFalse();
      component.isDeviceOnline = true;
      component.isLoading = true;
      expect(component.canStopMovement()).toBeFalse();
      component.isLoading = false;
      component.isStopping = true;
      expect(component.canStopMovement()).toBeFalse();
      component.isStopping = false;
      component.telescopeId = null;
      expect(component.canStopMovement()).toBeFalse();
    });

    it('disables hold when numeric limits or the logged-in user is unavailable', () => {
      component.telescopeMetadata = null;
      expect(component.canStopMovement()).toBeFalse();
      component.stopMovement();
      component.telescopeMetadata = metadata;
      setUser(null);
      expect(component.canStopMovement()).toBeFalse();
      component.stopMovement();

      expect(readingService.getLatestReading).not.toHaveBeenCalled();
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('disables hold for missing, stale, future, invalid, unrelated, or unsafe cached readings', () => {
      const unavailableReadings: (Reading | null)[] = [
        null,
        sensorReading({ created_at: null }),
        sensorReading({ created_at: 'not-a-time' }),
        sensorReading({ created_at: new Date(Date.now() - 20000).toISOString() }),
        sensorReading({ created_at: new Date(Date.now() + 60000).toISOString() }),
        sensorReading({ telescope_id: 8 }),
        sensorReading({ azimuth_angle: Number.NaN }),
        sensorReading({ azimuth_angle: Number.POSITIVE_INFINITY }),
        sensorReading({ azimuth_angle: -1 }),
        sensorReading({ azimuth_angle: 361 }),
        sensorReading({ azimuth_angle: 180 }),
        sensorReading({ elevation_angle: Number.NaN }),
        sensorReading({ elevation_angle: -1 }),
        sensorReading({ el_encoder_angle: 360 }),
        sensorReading({ el_encoder_angle: null }),
        sensorReading({ health_status: 'FAULT' }),
        sensorReading({ movement_status: 'ESTOP' }),
        sensorReading({ movement_status: 'WAITING FOR NORTH' }),
        sensorReading({ movement_status: 'AZ ENCODER UNAVAILABLE' })
      ];

      for (const reading of unavailableReadings) {
        component.reading = reading;
        component.isDeviceOnline = true;
        expect(component.canStopMovement()).toBeFalse();
      }
    });

    it('does not request or post hold when a recent cached reading is missing', () => {
      component.reading = null;

      component.stopMovement();

      expect(readingService.getLatestReading).not.toHaveBeenCalled();
      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
    });

    it('posts exact latest reported angles and the logged-in user without adding an offset', () => {
      const latest: Reading = sensorReading({ azimuth_angle: 280.123456, elevation_angle: 312.75, el_encoder_angle: 12.75 });
      component.reading = sensorReading({ azimuth_angle: 270, elevation_angle: 44 });
      component.telescopeMetadata = { ...metadata, az_encoder_offset: 100 };
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(component.telescopeMetadata)));
      component.azimuth_angle = 190;
      component.elevation_angle = 40;
      component.isPointing = false;
      readingService.getLatestReading.and.returnValue(of(latest));
      setUser({ id: 12, email_address: 'observer@example.test', password: '', create_at: new Date() });

      try {
        component.stopMovement();

        expect(readingService.getLatestReading).toHaveBeenCalledOnceWith(7);
        expect(commandService.postCommand).toHaveBeenCalledOnceWith({
          user_id: 12,
          telescope_id: 7,
          command_type: 'point',
          point: { target_az_angle: 280.123456, target_el_angle: 312.75 },
          track: null
        });
        expect(component.azimuth_angle).toBe(-79.88);
        expect(component.elevation_angle).toBe(-47.25);
        expect(component.isPointing).toBeTrue();
        expect(component.isStopping).toBeFalse();
        expect(component.showCommandMessage).toHaveBeenCalledOnceWith('Hold-position command sent.');
      } finally {
        setUser(null);
      }
    });

    it('revalidates the latest response instead of posting invalid angles after a cached valid reading', () => {
      const invalidResponses: Reading[] = [
        sensorReading({ created_at: new Date(Date.now() - 20000).toISOString() }),
        sensorReading({ created_at: new Date(Date.now() + 60000).toISOString() }),
        sensorReading({ telescope_id: 8 }),
        sensorReading({ azimuth_angle: Number.NaN }),
        sensorReading({ azimuth_angle: 180 }),
        sensorReading({ el_encoder_angle: 360 }),
        sensorReading({ el_encoder_angle: null }),
        sensorReading({ health_status: 'FAULT' }),
        sensorReading({ movement_status: 'ESTOP' }),
        sensorReading({ movement_status: 'WAITING FOR NORTH' }),
        sensorReading({ movement_status: 'AZ ENCODER UNAVAILABLE' })
      ];
      component.azimuth_angle = 190;
      component.elevation_angle = 40;
      component.isPointing = false;

      for (const latest of invalidResponses) {
        component.reading = sensorReading();
        component.isDeviceOnline = true;
        readingService.getLatestReading.and.returnValue(of(latest));
        component.stopMovement();
        expect(component.commandError).not.toBe('');
        expect(component.isStopping).toBeFalse();
      }

      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
      expect(component.azimuth_angle).toBe(190);
      expect(component.elevation_angle).toBe(40);
      expect(component.isPointing).toBeFalse();
    });

    it('rejects a fetched reading if the selected telescope changed while it was loading', () => {
      const latest: Subject<Reading> = new Subject<Reading>();
      readingService.getLatestReading.and.returnValue(latest);
      component.stopMovement();
      component.telescopeId = 8;

      latest.next(sensorReading());

      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
      expect(component.isStopping).toBeFalse();
      expect(component.commandError).not.toBe('');
    });

    it('does not post a pending hold after the component is destroyed', () => {
      const latest: Subject<Reading> = new Subject<Reading>();
      readingService.getLatestReading.and.returnValue(latest);
      component.stopMovement();

      component.ngOnDestroy();
      latest.next(sensorReading());

      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
    });

    it('rejects a fetched reading if the logged-in user changed during the request', () => {
      const latest: Subject<Reading> = new Subject<Reading>();
      readingService.getLatestReading.and.returnValue(latest);
      component.stopMovement();
      setUser(null);

      latest.next(sensorReading());

      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
      expect(component.isStopping).toBeFalse();
      expect(component.commandError).not.toBe('');
    });

    it('does not change the current screen when the telescope changes before POST succeeds', () => {
      const posted: Subject<Command> = new Subject<Command>();
      commandService.postCommand.and.returnValue(posted);
      component.azimuth_angle = 190;
      component.elevation_angle = 40;
      component.isPointing = false;
      component.stopMovement();
      component.telescopeId = 8;

      posted.next({} as Command);

      expect(commandService.postCommand).toHaveBeenCalledTimes(1);
      expect(component.showCommandMessage).not.toHaveBeenCalled();
      expect(component.azimuth_angle).toBe(190);
      expect(component.elevation_angle).toBe(40);
      expect(component.isPointing).toBeFalse();
      expect(component.isStopping).toBeFalse();
    });

    it('blocks duplicate hold and normal commands until both GET and POST complete', () => {
      const latest: Subject<Reading> = new Subject<Reading>();
      const posted: Subject<Command> = new Subject<Command>();
      readingService.getLatestReading.and.returnValue(latest);
      commandService.postCommand.and.returnValue(posted);
      component.selectedSource = { ...component.emptySource(), id: 1, name: 'Test source', created_at: '' };
      component.azimuth_angle = 190;
      component.elevation_angle = 40;
      component.isPointing = false;
      component.stopMovement();
      expect(component.isStopping).toBeTrue();
      expect(component.canStopMovement()).toBeFalse();

      component.stopMovement();
      component.startPointing();
      component.startTracking();
      expect(readingService.getLatestReading).toHaveBeenCalledTimes(1);
      expect(commandService.postCommand).not.toHaveBeenCalled();

      latest.next(sensorReading({ azimuth_angle: 275, elevation_angle: 35 }));
      expect(component.isStopping).toBeTrue();
      expect(component.azimuth_angle).toBe(190);
      expect(component.elevation_angle).toBe(40);
      expect(component.isPointing).toBeFalse();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
      component.stopMovement();
      component.startPointing();
      component.startTracking();
      expect(commandService.postCommand).toHaveBeenCalledTimes(1);
      expect(readingService.getLatestReading).toHaveBeenCalledTimes(1);

      posted.next({} as Command);

      expect(component.isStopping).toBeFalse();
      expect(component.azimuth_angle).toBe(-85);
      expect(component.elevation_angle).toBe(35);
      expect(component.isPointing).toBeTrue();
      expect(component.showCommandMessage).toHaveBeenCalledOnceWith('Hold-position command sent.');
    });

    it('reports a latest-reading API failure without posting or changing inputs', () => {
      readingService.getLatestReading.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
      component.azimuth_angle = 190;
      component.elevation_angle = 40;
      component.isPointing = false;

      component.stopMovement();

      expect(component.commandError).not.toBe('');
      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(component.showCommandMessage).not.toHaveBeenCalled();
      expect(component.isStopping).toBeFalse();
      expect(component.azimuth_angle).toBe(190);
      expect(component.elevation_angle).toBe(40);
      expect(component.isPointing).toBeFalse();
    });

    it('reports a rejected hold command without claiming success or changing inputs', () => {
      commandService.postCommand.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400,
        error: { detail: 'Hold command rejected.' }
      })));
      component.azimuth_angle = 190;
      component.elevation_angle = 40;
      component.isPointing = false;

      component.stopMovement();

      expect(component.commandError).toContain('Hold command rejected.');
      expect(component.showCommandMessage).not.toHaveBeenCalled();
      expect(component.isStopping).toBeFalse();
      expect(component.azimuth_angle).toBe(190);
      expect(component.elevation_angle).toBe(40);
      expect(component.isPointing).toBeFalse();
    });
  });
});
