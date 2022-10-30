import { session } from 'electron';
import { fileURLToPath } from 'url';
import markdownToHTML from '../utils/mdConverter';
import fs from 'fs/promises';

export default function interceptFileProtocol(e: Electron.IpcMainEvent, partition: string, file: string, text: string) {
	const partitionSession = session.fromPartition(partition),
		stringIntercept = async (req: Electron.ProtocolRequest, callback: (response: string | Electron.ProtocolResponse) => void) => {
			partitionSession.protocol.uninterceptProtocol('file');
			
			const requestFile = fileURLToPath(req.url);
			
			if (requestFile === file) {
				callback(text);

				return;
			}
			
			if (requestFile.endsWith('.md') || requestFile.endsWith('.markdown')) {
				const text = await fs.readFile(requestFile, 'utf8');
				
				callback(markdownToHTML(text));
			}
		};

	partitionSession.protocol.uninterceptProtocol('file');

	partitionSession.webRequest.onBeforeRequest((req, callback) => {
		let requestFile;
		
		try {
			requestFile = fileURLToPath(req.url);
		} catch (e) {
			// Not a file
		}
		
		if (!requestFile || partitionSession.protocol.isProtocolIntercepted('file')) {
			callback({});
			
			return;
		}
		
		if (requestFile === file || requestFile.endsWith('.md') || requestFile.endsWith('.markdown')) {
			partitionSession.protocol.interceptStringProtocol('file', stringIntercept);

			callback({
				redirectURL: req.url
			});
			
			return;
		}
		
		// BUG: Files may have wrong background https://github.com/electron/electron/issues/36122
		callback({});
	});
}