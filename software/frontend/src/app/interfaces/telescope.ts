export interface TelescopeMetadata {
    az_encoder_min: number;
    az_encoder_max: number;
    az_encoder_offset: number;
    az_range_temporary?: boolean;
}

export interface Telescope {
    id: number;
    name: string;
    health_status: string;
    created_at: Date;
    metadata?: TelescopeMetadata | null;
}
