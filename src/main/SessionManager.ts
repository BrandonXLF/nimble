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

    private defaultResponse(req: Request, ses: Session) {
        return ses.fetch(req, { bypassCustomProtocolHandlers: true });
    }

    private configureIntercept(partition: string, ses: Session) {
        ses.protocol.handle('file', async (req) => {
            const { file, mode, text } = this.sessions[partition];

            if (new URL(req.url).hostname === partition)
                return this.textResponse(mode, text);
            
            let requestedFile: string;

            try {
                requestedFile = fileURLToPath(req.url);
            } catch (_) {
                return this.defaultResponse(req, ses);
            }
            
            if (requestedFile === file)
                return this.textResponse(mode, text);
            
            const requestedFileMode = getFileType(requestedFile);

            if (!requestedFileMode)
                return this.defaultResponse(req, ses);

            return this.textResponse(
                requestedFileMode,
                await fs.readFile(requestedFile, 'utf8')
            );
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