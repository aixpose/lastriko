import { createWSManager } from './ws';

const manager = createWSManager();
manager.connect();

export { createWSManager };
