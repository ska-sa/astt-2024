import { CreateSource } from './create-source';

export interface CreateCommand {
    user_id: number;
    telescope_id: number;
    command_type: 'point' | 'track';
    point: { target_az_angle: number; target_el_angle: number; } | null;
    track: { source: CreateSource; } | null;
}
