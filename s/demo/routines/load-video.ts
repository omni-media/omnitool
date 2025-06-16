
export async function loadVideo(url: string): Promise<ArrayBuffer> {
	return fetch(url)
		.then(response => response.bytes())
		.then(bytes => bytes.buffer)
}

