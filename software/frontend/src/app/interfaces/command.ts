import { CreateCommand } from "./create-command";

export interface Command extends CreateCommand {
    id: number;
    created_at: Date;
}
