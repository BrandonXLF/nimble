import { session } from 'electron';
import { fileURLToPath } from 'url';
import markdownToHTML from '../utils/mdConverter';
import fs from 'fs/promises';

export default function interceptFileProtocol(_: Electron.IpcMainEvent, partition: string, file: string, text: string) {
	const ses = session.fromPartition(partition);

	// Second request could have been cancelled
	ses.protocol.uninterceptProtocol('file');

	ses.webRequest.onBeforeRequest((req, callback) => {
		// Intercept already added
		if (ses.protocol.isProtocolIntercepted('file')) return callback({});
		
		// Not a file: url
		if (!req.url.startsWith('file:')) return callback({});
		
		let requestFile: string;
		
		try {
			requestFile = fileURLToPath(req.url);
		} catch (e) {
			// Not a valid file
		}
		
		let intercept: () => string | Promise<string>;
		
		// Intercept for file being edited
		if (req.url === `file://${partition}/` || (requestFile === file && requestFile !== undefined)) {
			intercept = () => text;
		}
		
		// Intercept for markdown files
		if (requestFile?.endsWith('.md') || requestFile?.endsWith('.markdown')) {
			intercept = async () => markdownToHTML(await fs.readFile(requestFile, 'utf8'));
		}
		
		// BUG: Files may have wrong background https://github.com/electron/electron/issues/36122
		if (!intercept) return callback({});
		
		ses.protocol.interceptStringProtocol('file', async (_, interceptCallback) => {
			ses.protocol.uninterceptProtocol('file');
			
			interceptCallback(await intercept());
		});
		
		return callback({ redirectURL: req.url });
	});
}