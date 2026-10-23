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
    az_encoder_max: 209.7,
    az_encoder_offset: 0,
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
      azimuth_angle: 180,
      elevation_angle: 45,
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
    const navigation: HTMLElement = element.querySelector<HTMLElement>('.btn-group')!;
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
      expect(element.querySelector('.btn-group')?.textContent).not.toContain('Stop');
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

  it('rejects out-of-range targets without changing the entered angle', () => {
    component.azimuth_angle = 230;

    component.startPointing();

    expect(commandService.postCommand).not.toHaveBeenCalled();
    expect(component.azimuth_angle).toBe(230);
    expect(component.commandError).toContain('137.8° to 209.7°');
  });

  it('accepts configured range boundaries and interior targets without changing them', () => {
    for (const angle of [137.8, 150, 170, 190, 209.7]) {
      component.azimuth_angle = angle;
      component.startPointing();
      expect(component.commandError).toBe('');
      expect(component.azimuth_angle).toBe(angle);
    }

    expect(commandService.postCommand).toHaveBeenCalledTimes(5);
  });

  it('checks the raw encoder range after applying the configured offset', () => {
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({
      ...metadata,
      az_encoder_offset: 200
    })));
    component.loadTelescope();
    component.azimuth_angle = 10;

    component.startPointing();

    expect(commandService.postCommand).toHaveBeenCalled();
    expect(component.azimuthRange).toContain('through 0°');
  });

  it('accepts wrapped-range targets and both endpoints without changing them', () => {
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({
      ...metadata,
      az_encoder_max: 37.8
    })));
    component.loadTelescope();

    for (const angle of [137.8, 250, 350, 20, 37.8]) {
      component.azimuth_angle = angle;
      component.startPointing();
      expect(component.commandError).toBe('');
      expect(component.azimuth_angle).toBe(angle);
    }

    expect(commandService.postCommand).toHaveBeenCalledTimes(5);
    expect(component.azimuthRange).toBe('137.8° to 37.8° through 0°');
  });

  it('rejects a target in the excluded arc without posting or changing it', () => {
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({
      ...metadata,
      az_encoder_max: 37.8
    })));
    component.loadTelescope();
    component.azimuth_angle = 100;

    component.startPointing();

    expect(commandService.postCommand).not.toHaveBeenCalled();
    expect(component.azimuth_angle).toBe(100);
    expect(component.commandError).toContain('137.8° to 37.8° through 0°');
  });

  it('normalizes 360 degrees to zero when checking the encoder range', () => {
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({
      ...metadata,
      az_encoder_min: 0,
      az_encoder_max: 20
    })));
    component.loadTelescope();
    component.azimuth_angle = 360;

    component.startPointing();

    expect(commandService.postCommand).toHaveBeenCalled();
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

    component.azimuth_angle = 180;
    component.elevation_angle = 100;
    component.startPointing();
    expect(component.commandError).toContain('Elevation must be a number');
    expect(component.elevation_angle).toBe(100);
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
      expect(component.azimuthRange).toBe('230° to 130° through 0°');
      expect(component.commandError).toContain('230° to 130° through 0°');
      expect(component.azimuth_angle).toBe(180);
      expect(commandService.postCommand).not.toHaveBeenCalled();
      expect(readingService.getLatestReading).not.toHaveBeenCalled();
    });

    it('shows the manual reference and magnetometer readings without compass warnings while retaining escaped raw diagnostics', () => {
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
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement as HTMLElement;
      const panel: HTMLElement = element.querySelector<HTMLElement>('.sensor-readings')!;
      const details: HTMLDetailsElement = panel.querySelector<HTMLDetailsElement>('details')!;

      for (const isPointing of [true, false]) {
        component.isPointing = isPointing;
        fixture.detectChanges();
        expect(element.textContent).toContain('Reference: MANUAL_ALIGNMENT. AZ is encoder-derived');
        expect(element.textContent).toContain('base levelling and true-north alignment are manual');
        expect(element.textContent).toContain('Absolute accuracy is unverified.');
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
      component.azimuth_angle = 280;
      component.startPointing();
      expect(commandService.postCommand.calls.mostRecent().args[0].point).toEqual({ target_az_angle: 280, target_el_angle: 45 });
      component.startTracking();
      expect(commandService.postCommand.calls.mostRecent().args[0].command_type).toBe('track');

      const reading: Reading = sensorReading({ azimuth_angle: 280.123456, elevation_angle: 12.75 });
      component.reading = reading;
      component.isDeviceOnline = true;
      readingService.getLatestReading.and.returnValue(of(reading));
      expect(component.canStopMovement()).toBeTrue();
      component.stopMovement();

      expect(commandService.postCommand).toHaveBeenCalledTimes(3);
      expect(commandService.postCommand.calls.mostRecent().args[0].point).toEqual({ target_az_angle: 280.123456, target_el_angle: 12.75 });
      expect(reading.azimuth_angle).toBe(280.123456);
    });

    it('shows the same range and an unverified alignment warning in both modes without blocking readiness', () => {
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
        expect(element.textContent).toContain('Offset: 0°');
        expect(element.textContent).toContain('137.8° to 209.7°');
        expect(element.textContent).toContain('Uncalibrated heading estimate — accuracy unverified.');
      }
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('rejects both north zero and 360 when the shifted mechanical no-go arc contains north', () => {
      telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata({
        ...metadata, az_encoder_max: 37.8, az_encoder_offset: 300
      })));

      for (const angle of [0, 360]) {
        component.azimuth_angle = angle;
        component.startPointing();
        expect(component.commandError).toContain('77.8° to 337.8°');
        expect(component.azimuth_angle).toBe(angle);
      }
      expect(commandService.postCommand).not.toHaveBeenCalled();

      for (const angle of [90, 330]) {
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
      expect(component.azimuthRange).toBe('237.8° to 309.7°');
      expect(component.reading?.azimuth_angle).toBe(180);
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
      expect(component.azimuthRange).toBe('137.8° to 209.7°');
      response.next(telescopeWithMetadata({ ...metadata, az_encoder_offset: 100 }));
      response.complete();
      expect(component.azimuthRange).toBe('237.8° to 309.7°');
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
      expect(component.azimuthRange).toBe('237.8° to 309.7°');
      expect(commandService.postCommand).not.toHaveBeenCalled();
    });

    it('checks freshly loaded metadata before posting immutable Point input values', () => {
      const response: Subject<Telescope> = new Subject<Telescope>();
      telescopeService.getTelescope.calls.reset();
      telescopeService.getTelescope.and.returnValue(response);
      component.azimuth_angle = 280;
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
      expect(component.reading?.azimuth_angle).toBe(180);
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
        sensorReading({ azimuth_angle: 230 }),
        sensorReading({ elevation_angle: Number.NaN }),
        sensorReading({ elevation_angle: -1 }),
        sensorReading({ elevation_angle: 91 }),
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
      const latest: Reading = sensorReading({ azimuth_angle: 280.123456, elevation_angle: 12.75 });
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
          point: { target_az_angle: 280.123456, target_el_angle: 12.75 },
          track: null
        });
        expect(component.azimuth_angle).toBe(280.123456);
        expect(component.elevation_angle).toBe(12.75);
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
        sensorReading({ azimuth_angle: 230 }),
        sensorReading({ elevation_angle: 91 }),
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

      latest.next(sensorReading({ azimuth_angle: 185, elevation_angle: 35 }));
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
      expect(component.azimuth_angle).toBe(185);
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
