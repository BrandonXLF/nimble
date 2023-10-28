import { session, Session } from 'electron';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import convertText from './convertText';
import { getFileType } from '../utils/fileTypes';

export default class SessionManager {
    sessions: Record<string, { file: string, mode: string, text: string, ses: Session }> = {};

    private textResponse(mode: string, text: string) {
        return new Response(convertText(mode, text), {
            headers: { 'content-type': 'text/html' }
        });
    }

    private configureIntercept(partition: string, ses: Session) {
        ses.protocol.handle('file', async (req) => {
            const { file, mode, text } = this.sessions[partition];

            let requestFile: string | undefined;
            
            try {
                requestFile = fileURLToPath(req.url);
            } catch (_) {
                // Not a valid file
            }
            
            // Intercept the file being edited
            if (req.url === `file://${partition}/` || (requestFile !== undefined && requestFile === file))
                return this.textResponse(mode, text);
            
            // Convert supported file types
            if (requestFile !== undefined && getFileType(requestFile)) {
                return this.textResponse(mode,  await fs.readFile(requestFile, 'utf8'));
            }
    
            // @ts-ignore bypassCustomProtocolHandlers is allowed
            return ses.fetch(req, { bypassCustomProtocolHandlers: true })
        });
    }

    private start(partition: string, file: string, mode: string, text: string) {
        const ses = session.fromPartition(partition);

        this.sessions[partition] = { file, mode, text, ses };
        this.configureIntercept(partition, ses);
    }

    private update(partition: string, file: string, mode: string, text: string) {
        this.sessions[partition].file = file;
        this.sessions[partition].mode = mode;
        this.sessions[partition].text = text;
    }

    set(partition: string, file: string, mode: string, text: string) {
        if (!(partition in this.sessions)) {
            this.start(partition, file, mode, text);
            return;
        }

        this.update(partition, file, mode, text);
    }

    delete(partition: string) {
        this.sessions[partition]?.ses.clearStorageData();

        delete this.sessions[partition];
    }
}