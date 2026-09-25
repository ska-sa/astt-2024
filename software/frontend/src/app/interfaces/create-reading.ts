export interface CreateReading {
    telescope_id: number;
    azimuth_angle: number;
    elevation_angle: number;
    latitude: number;
    longitude: number;
    altitude: number;
    gyroscope_x: number;
    gyroscope_y: number;
    gyroscope_z: number;
    acceleration_x: number;
    acceleration_y: number;
    acceleration_z: number;
    magnetic_field_x: number;
    magnetic_field_y: number;
    magnetic_field_z: number;
    health_status: string;
    movement_status: string;
}
