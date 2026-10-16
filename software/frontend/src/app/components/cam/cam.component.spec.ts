import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CamComponent } from './cam.component';
import { CommandService } from '../../services/command.service';
import { TelescopeService } from '../../services/telescope.service';
import { Telescope, TelescopeMetadata } from '../../interfaces/telescope';
import { Command } from '../../interfaces/command';

describe('CamComponent', () => {
  let component: CamComponent;
  let fixture: ComponentFixture<CamComponent>;
  let commandService: jasmine.SpyObj<CommandService>;
  let telescopeService: jasmine.SpyObj<TelescopeService>;
  const metadata: TelescopeMetadata = {
    az_encoder_min: 137.8,
    az_encoder_max: 209.7,
    az_encoder_offset: 0,
    az_range_temporary: true
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

  beforeEach(async () => {
    commandService = jasmine.createSpyObj<CommandService>('CommandService', ['postCommand']);
    telescopeService = jasmine.createSpyObj<TelescopeService>('TelescopeService', ['getTelescope']);
    commandService.postCommand.and.returnValue(of({} as Command));
    telescopeService.getTelescope.and.returnValue(of(telescopeWithMetadata(metadata)));

    await TestBed.configureTestingModule({
      imports: [CamComponent],
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '7' })) } },
        { provide: CommandService, useValue: commandService },
        { provide: TelescopeService, useValue: telescopeService }
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
    expect(component.commandError).toContain('Encoder calibration unavailable');
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
      expect(component.commandError).toContain('Encoder calibration unavailable');
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
});
